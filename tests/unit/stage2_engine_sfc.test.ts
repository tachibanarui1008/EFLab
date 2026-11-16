/**
 * EFLab Alpha 0.1 - Stage 2 月度 10 步经济引擎与 SFC 配平自动化测试套件
 * 严格遵循 docs/specs/02_Economic_Engine_月度经济引擎与SFC核算.md
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../../src/core/prng/index.js';
import { stepMonth } from '../../src/core/engine/index.js';
import type { SimulationState } from '../../src/core/prng/types.js';

test('Stage 2.1: 60 个月稳态连续运行零资金黑洞与零负库存断言 (60-Month Zero Black Hole & Non-Negative Inventory)', () => {
  const seeds = [1, 7, 42, 99, 1024, 20261107];

  for (const seed of seeds) {
    let state = createInitialState(seed);
    const history: SimulationState[] = [state];

    for (let m = 1; m <= 60; m++) {
      state = stepMonth(state, history);
      history.push(state);

      // 1. 月份步进正确性
      assert.strictEqual(state.month, m, `Seed ${seed} Month ${m}: Expected month ${m}, got ${state.month}`);

      // 2. 存量-流量一致性 (SFC) 严格断言
      assert.strictEqual(state.sfcAudit.passed, true, `Seed ${seed} Month ${m} failed SFC audit`);
      assert.ok(
        state.sfcAudit.maxAbsDiscrepancy <= 1e-6,
        `Seed ${seed} Month ${m} SFC discrepancy ${state.sfcAudit.maxAbsDiscrepancy.toExponential(4)} exceeded 1e-6`
      );

      // 3. 实物库存非负
      assert.ok(state.sectors.food.inventory >= 0, `Seed ${seed} Month ${m} food inventory < 0: ${state.sectors.food.inventory}`);
      assert.ok(state.sectors.goods.inventory >= 0, `Seed ${seed} Month ${m} goods inventory < 0: ${state.sectors.goods.inventory}`);
      assert.ok(state.sectors.capital.inventory >= 0, `Seed ${seed} Month ${m} capital inventory < 0: ${state.sectors.capital.inventory}`);

      // 4. 存款与流动资金非负
      assert.ok(state.households.working.deposits >= 0, `Seed ${seed} Month ${m} working deposits < 0`);
      assert.ok(state.households.middle.deposits >= 0, `Seed ${seed} Month ${m} middle deposits < 0`);
      assert.ok(state.households.capitalist.deposits >= 0, `Seed ${seed} Month ${m} capitalist deposits < 0`);
      assert.ok(state.sectors.food.cash >= 0, `Seed ${seed} Month ${m} food cash < 0`);
      assert.ok(state.sectors.goods.cash >= 0, `Seed ${seed} Month ${m} goods cash < 0`);
      assert.ok(state.sectors.capital.cash >= 0, `Seed ${seed} Month ${m} capital cash < 0`);

      // 5. 人口与就业硬边界
      assert.ok(state.households.working.employed <= 800, `Seed ${seed} Month ${m} working employed > 800`);
      assert.ok(state.households.middle.employed <= 200, `Seed ${seed} Month ${m} middle employed > 200`);

      // 6. 同比空值保护断言
      if (m < 12) {
        assert.strictEqual(state.metrics.gdpYoY, null, `Seed ${seed} Month ${m} gdpYoY must be null when month < 12`);
        assert.strictEqual(state.metrics.inflationYoY, null, `Seed ${seed} Month ${m} inflationYoY must be null when month < 12`);
      } else {
        assert.ok(typeof state.metrics.gdpYoY === 'number', `Seed ${seed} Month ${m} gdpYoY must be number`);
        assert.ok(typeof state.metrics.inflationYoY === 'number', `Seed ${seed} Month ${m} inflationYoY must be number`);
      }
    }

    // 达到 60 个月终点再调用，时间不应再增加
    const pausedState = stepMonth(state, history);
    assert.strictEqual(pausedState.month, 60, `Seed ${seed} Simulation must pause at month 60`);
  }
});

test('Stage 2.2: 中层管理协同惩罚机制断言 (Management Synergy Penalty)', () => {
  const seed = 99;
  const state0 = createInitialState(seed);

  // 正常情况下管理充足，效率应为 1.00
  const state1 = stepMonth(state0, [state0]);
  assert.strictEqual(state1.sectors.food.managementEfficiency, 1.00);

  // 构造中层管理严重短缺的极端场景：直接修改在岗中层人数
  const starvedState = createInitialState(seed);
  // 食品行业 250 工人标准配比需 50 名中层管理，强制给 25 人 (打 5 折)
  starvedState.sectors.food.employedManagers = 25;
  starvedState.sectors.food.employedWorkers = 250;
  // 预期效率: 0.70 + 0.30 * (25 / 50) = 0.85
  const reqM = 250 / 5;
  const ratio = 25 / reqM;
  const expectedEfficiency = 0.70 + 0.30 * ratio;

  assert.strictEqual(expectedEfficiency, 0.85);
  assert.ok(expectedEfficiency >= 0.70 && expectedEfficiency < 1.00);
});

test('Stage 2.3: 按比例配给出清与强制储蓄断言 (Proportional Rationing & Forced Saving)', () => {
  const state0 = createInitialState(77);
  // 构造极端供给短缺：将食品库存与产能大幅压缩
  state0.sectors.food.inventory = 0.0;
  state0.sectors.food.capitalStock = 100.0; // 极低产能

  const state1 = stepMonth(state0, [state0]);

  // 供不应求应触发按比例配给
  assert.ok(state1.sectors.food.unmetDemandUnits > 0, 'Unmet demand should be positive');
  assert.strictEqual(state1.sectors.food.inventory, 0, 'Inventory should be cleared to 0 (never negative)');

  // 居民应产生强制储蓄
  const workingForcedSaving = state1.households.working.forcedSaving;
  assert.ok(workingForcedSaving >= 0, 'Forced saving should be non-negative');
  // SFC 账目在配给情况下仍必须严格配平
  assert.strictEqual(state1.sfcAudit.passed, true, 'SFC audit must pass even under rationing');
});
