/**
 * EFLab Alpha 0.1 - Stage 5 UI 面板与双轨对照实验室自动化测试套件
 * 严格遵循 docs/specs/05_UI_Panels_Lab_三大面板与对照实验室.md
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../../src/core/prng/index.js';
import { ComparisonLab } from '../../src/ui/lab/comparison_lab.js';
import { formatTopHud } from '../../src/ui/panels/top_hud.js';
import { EFLabApp } from '../../src/ui/app.js';
import { setPendingBaseTaxRate } from '../../src/core/engine/index.js';

test('Stage 5.1: 双轨对照实验室沙盒内存隔离与零干预零分叉断言 (Dual-Track Sandbox Isolation & Zero Divergence)', () => {
  const s0 = createInitialState(42);
  const lab = new ComparisonLab(s0);

  // 1. 验证内存物理隔离 (修改干预组不影响基准组)
  const interv = lab.getInterventionCurrent();
  interv.households.working.deposits = 9999.0;
  assert.strictEqual(lab.getBaselineCurrent().households.working.deposits, 600.0, 'Baseline must not be affected by intervention modifications');

  // 重新重置
  lab.reset(s0);

  // 2. 无干预情况下同步推进 10 个月，两组轨迹严格重合 (Δ = 0)
  for (let m = 1; m <= 10; m++) {
    lab.stepSynchronized();
    const delta = lab.calculateCurrentDelta();
    assert.strictEqual(delta.deltaRealGdp, 0, `Month ${m}: Real GDP delta must be 0 when no interventions`);
    assert.strictEqual(delta.deltaUnemploymentPercentagePoints, 0, `Month ${m}: Unemployment delta must be 0`);
    assert.strictEqual(delta.deltaCpi, 0, `Month ${m}: CPI delta must be 0`);
    assert.strictEqual(delta.prngNoiseError, 0, `Month ${m}: PRNG noise error must strictly equal 0.000000`);
  }

  // 3. 施加政策干预测试：仅在干预组提高税率
  setPendingBaseTaxRate(lab.getInterventionCurrent(), 0.35);
  lab.stepSynchronized(); // 步进至第 11 月

  const delta11 = lab.calculateCurrentDelta();
  // 增税后两组曲线产生真实经济分叉
  assert.notStrictEqual(delta11.deltaRealGdp, 0, 'Real GDP should diverge after tax rate change');
  // 但底层的 PRNG 随机噪声依然分毫不差 100% 同步！
  assert.strictEqual(delta11.prngNoiseError, 0, 'PRNG noise must remain bitwise identical despite intervention divergence');
});

test('Stage 5.2: 顶部 HUD 看板与未满 12 个月同比保护断言 (Top HUD & YoY Null Guard)', () => {
  const s0 = createInitialState(100);
  const hud0 = formatTopHud(s0);

  // 第 0 月同比必须显示 "数据不足"
  assert.ok(hud0.realGdpYoYText.includes('数据不足'), 'GDP YoY must display "数据不足" for month 0');
  assert.ok(hud0.cpiYoYText.includes('数据不足'), 'CPI YoY must display "数据不足" for month 0');
  assert.strictEqual(hud0.sfcStatusBadge, 'SFC 闭环守恒 ✓');

  // 推进至第 15 月
  const app = new EFLabApp(100);
  for (let m = 1; m <= 15; m++) {
    app.step();
  }
  const hud15 = formatTopHud(app.getCurrentState());
  assert.ok(!hud15.realGdpYoYText.includes('数据不足'), 'GDP YoY must display valid percentage when month >= 12');
  assert.ok(hud15.realGdpYoYText.includes('%'), 'GDP YoY must contain % symbol');
});

test('Stage 5.3: 全局 App 控制器步进、满 60 月自动暂停与存档往返 (EFLabApp Controller & 60M Auto-Pause)', () => {
  const app = new EFLabApp(777);
  assert.strictEqual(app.getCurrentState().month, 0);

  // 单步推进 3 个月
  app.step();
  app.step();
  app.step();
  assert.strictEqual(app.getCurrentState().month, 3);

  // 导出存档并重新导入
  const jsonArchive = app.exportJson();
  const freshApp = new EFLabApp(999);
  freshApp.importJson(jsonArchive);
  assert.strictEqual(freshApp.seed, 777);
  assert.strictEqual(freshApp.getCurrentState().month, 3);
  assert.strictEqual(freshApp.history.length, 4);

  // 快进推进至 60 个月，验证自动暂停机制
  while (freshApp.getCurrentState().month < 60) {
    freshApp.step();
  }
  assert.strictEqual(freshApp.getCurrentState().month, 60);
  // 再步进也不会超出 60
  freshApp.step();
  assert.strictEqual(freshApp.getCurrentState().month, 60, 'Simulation must clamp at 60 months');
});
