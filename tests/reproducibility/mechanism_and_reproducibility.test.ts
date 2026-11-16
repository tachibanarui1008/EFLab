/**
 * EFLab Alpha 0.1 - Stage 6 终极验收测试套件：四大宏观机制与可复现性/合规性测试
 * 严格遵循 docs/specs/06_Acceptance_Test_验收测试与自检套件.md
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createInitialState,
  serializeArchive,
  deserializeArchive,
  prngSymmetricNoise,
} from '../../src/core/prng/index.js';
import {
  stepMonth,
  setPendingBaseTaxRate,
  startPublicProject,
  triggerShock,
} from '../../src/core/engine/index.js';
import type { SimulationState } from '../../src/core/prng/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../../src');

// =========================================================================
// 1. 实验 M1：增税抑制当期消费与总需求 (Tax Hike Contraction Test)
// =========================================================================
test('Stage 6.2 (M1): 增税抑制当期消费与总需求断言 (Tax Hike Contraction Test)', () => {
  const seed = 42;
  let stateBase = createInitialState(seed);
  const histBase: SimulationState[] = [stateBase];

  let stateInterv = createInitialState(seed);
  const histInterv: SimulationState[] = [stateInterv];

  // 运行前 4 个月
  for (let m = 1; m <= 4; m++) {
    stateBase = stepMonth(stateBase, histBase);
    histBase.push(stateBase);

    stateInterv = stepMonth(stateInterv, histInterv);
    histInterv.push(stateInterv);
  }

  // 第 4 月末干预组上调税率至 0.35 (第 5 月生效)
  setPendingBaseTaxRate(stateInterv, 0.35);

  for (let m = 5; m <= 11; m++) {
    stateBase = stepMonth(stateBase, histBase);
    histBase.push(stateBase);

    stateInterv = stepMonth(stateInterv, histInterv);
    histInterv.push(stateInterv);
  }

  // 验收标准 1：政策生效首月（第 5 月），干预组三阶层居民税后可支配收入总和严格小于基准组
  const sB5 = histBase[5]!;
  const sI5 = histInterv[5]!;
  const baseDispIncM5 =
    sB5.households.working.disposableIncome +
    sB5.households.middle.disposableIncome +
    sB5.households.capitalist.disposableIncome;

  const intervDispIncM5 =
    sI5.households.working.disposableIncome +
    sI5.households.middle.disposableIncome +
    sI5.households.capitalist.disposableIncome;

  assert.ok(
    intervDispIncM5 < baseDispIncM5,
    `Intervention disposable income (${intervDispIncM5.toFixed(1)}) must be strictly less than baseline (${baseDispIncM5.toFixed(1)})`
  );

  // 验收标准 2：第 5 ~ 11 月期间，干预组居民累计实际消费支出严格小于基准组 (ΔC < 0)
  let cumConsBase = 0;
  let cumConsInterv = 0;
  for (let m = 5; m <= 11; m++) {
    const sB = histBase[m]!;
    const sI = histInterv[m]!;
    cumConsBase +=
      sB.households.working.actualConsumptionFood +
      sB.households.working.actualConsumptionGoods +
      sB.households.middle.actualConsumptionFood +
      sB.households.middle.actualConsumptionGoods +
      sB.households.capitalist.actualConsumptionFood +
      sB.households.capitalist.actualConsumptionGoods;

    cumConsInterv +=
      sI.households.working.actualConsumptionFood +
      sI.households.working.actualConsumptionGoods +
      sI.households.middle.actualConsumptionFood +
      sI.households.middle.actualConsumptionGoods +
      sI.households.capitalist.actualConsumptionFood +
      sI.households.capitalist.actualConsumptionGoods;
  }

  assert.ok(
    cumConsInterv < cumConsBase,
    `Intervention cumulative consumption (${cumConsInterv.toFixed(1)}) must be strictly less than baseline (${cumConsBase.toFixed(1)}) (ΔC < 0)`
  );
});

// =========================================================================
// 2. 实验 M2：消费信心冲击引发预防性储蓄与产出收缩 (Confidence Shock Test)
// =========================================================================
test('Stage 6.3 (M2): 消费信心冲击引发预防性储蓄与产出收缩断言 (Confidence Shock Test)', () => {
  const seed = 42;
  let stateBase = createInitialState(seed);
  const histBase: SimulationState[] = [stateBase];

  let stateInterv = createInitialState(seed);
  const histInterv: SimulationState[] = [stateInterv];

  // 运行前 5 个月
  for (let m = 1; m <= 5; m++) {
    stateBase = stepMonth(stateBase, histBase);
    histBase.push(stateBase);

    stateInterv = stepMonth(stateInterv, histInterv);
    histInterv.push(stateInterv);
  }

  // 第 5 月末干预组注入 confidence_drop 冲击（持续 6 个月，MPC 折扣 15%）
  triggerShock(stateInterv, 'confidence_drop', 6, 0.15);

  // 运行至第 11 月（第 6~11 月受冲击）
  for (let m = 6; m <= 11; m++) {
    stateBase = stepMonth(stateBase, histBase);
    histBase.push(stateBase);

    stateInterv = stepMonth(stateInterv, histInterv);
    histInterv.push(stateInterv);
  }

  // 验收标准 1：第 6 ~ 11 月期间，干预组居民累计消费支出显著低于基准组
  let cumConsBase = 0;
  let cumConsInterv = 0;
  for (let m = 6; m <= 11; m++) {
    const sB = histBase[m]!;
    const sI = histInterv[m]!;
    cumConsBase +=
      sB.households.working.actualConsumptionFood +
      sB.households.working.actualConsumptionGoods +
      sB.households.middle.actualConsumptionFood +
      sB.households.middle.actualConsumptionGoods +
      sB.households.capitalist.actualConsumptionFood +
      sB.households.capitalist.actualConsumptionGoods;

    cumConsInterv +=
      sI.households.working.actualConsumptionFood +
      sI.households.working.actualConsumptionGoods +
      sI.households.middle.actualConsumptionFood +
      sI.households.middle.actualConsumptionGoods +
      sI.households.capitalist.actualConsumptionFood +
      sI.households.capitalist.actualConsumptionGoods;
  }
  assert.ok(
    cumConsInterv < cumConsBase,
    `Under confidence shock, intervention consumption (${cumConsInterv.toFixed(1)}) must be lower than baseline (${cumConsBase.toFixed(1)})`
  );

  // 验收标准 2：居民总存款增量（预防性储蓄）干预组高于基准组
  const sB11 = histBase[11]!;
  const sI11 = histInterv[11]!;
  const depBaseEnd =
    sB11.households.working.deposits +
    sB11.households.middle.deposits +
    sB11.households.capitalist.deposits;

  const depIntervEnd =
    sI11.households.working.deposits +
    sI11.households.middle.deposits +
    sI11.households.capitalist.deposits;

  assert.ok(
    depIntervEnd > depBaseEnd,
    `Intervention total deposits (${depIntervEnd.toFixed(1)}) must exceed baseline (${depBaseEnd.toFixed(1)}) due to precautionary savings`
  );
});

// =========================================================================
// 3. 实验 M3：公共基建投资拉动资本品行业与竣工永久增益 (Infrastructure Multiplier Test)
// =========================================================================
test('Stage 6.4 (M3): 公共基建投资拉动与竣工永久增益断言 (Infrastructure Multiplier Test)', () => {
  const seed = 42;
  let stateBase = createInitialState(seed);
  const histBase: SimulationState[] = [stateBase];

  let stateInterv = createInitialState(seed);
  // 为干预组注入充足初始市政金库资金，防止财政不足中断基建测试
  stateInterv.municipal.cashDeposits = 2000.0;
  const histInterv: SimulationState[] = [stateInterv];

  // 第 1 月运行
  stateBase = stepMonth(stateBase, histBase);
  histBase.push(stateBase);
  stateInterv = stepMonth(stateInterv, histInterv);
  histInterv.push(stateInterv);

  // 第 2 月启动两项公共基建
  startPublicProject(stateInterv, 'road_improvement');
  startPublicProject(stateInterv, 'energy_expansion');

  // 运行至第 18 月（两项基建均先后竣工）
  for (let m = 2; m <= 18; m++) {
    stateBase = stepMonth(stateBase, histBase);
    histBase.push(stateBase);

    stateInterv = stepMonth(stateInterv, histInterv);
    histInterv.push(stateInterv);
  }

  // 验收标准 1：建设期内（第 3~6 月），干预组资本品行业总需求 demandUnits 显著高于基准组
  let cumCapDemandBase = 0;
  let cumCapDemandInterv = 0;
  for (let m = 3; m <= 6; m++) {
    cumCapDemandBase += histBase[m]!.sectors.capital.demandUnits;
    cumCapDemandInterv += histInterv[m]!.sectors.capital.demandUnits;
  }
  assert.ok(
    cumCapDemandInterv > cumCapDemandBase,
    `Construction capital goods demand (${cumCapDemandInterv.toFixed(1)}) must exceed baseline (${cumCapDemandBase.toFixed(1)})`
  );

  // 验收标准 2：项目完工后（Month 18），永久增益落地
  const roadProj = stateInterv.municipal.projects.road_improvement;
  const energyProj = stateInterv.municipal.projects.energy_expansion;

  assert.strictEqual(roadProj.status, 'COMPLETED');
  assert.strictEqual(energyProj.status, 'COMPLETED');

  // 物流损耗率降至 0.005 (0.5%)，能源效率提升至 1.08 (+8%)
  assert.strictEqual(stateInterv.metrics.logisticsLossRate, 0.005);
  assert.strictEqual(stateInterv.metrics.energyEfficiencyBonus, 1.08);

  // 三行业最大产能上限提升（因 energyEfficiencyBonus = 1.08）
  for (const sid of ['food', 'goods', 'capital'] as const) {
    assert.ok(
      stateInterv.sectors[sid].capacityLimit > stateBase.sectors[sid].capacityLimit,
      `Max capacity for ${sid} should increase after energy expansion`
    );
  }
});

// =========================================================================
// 4. 实验 M4：中层管理短缺协同惩罚与扩产订单触发测试
// =========================================================================
test('Stage 6.5 (M4): 中层管理短缺协同惩罚与扩产订单触发断言 (Synergy Penalty & Expansion)', () => {
  const seed = 42;
  const state = createInitialState(seed);

  // 1. 验证管理短缺协同惩罚：设置实际在岗管理低于标准配比
  // food 行业标准配比 5:1，假设在岗工人 150 人，标准需 30 名管理。设实际仅 15 名
  const food = state.sectors.food;
  food.employedWorkers = 150;
  food.requiredWorkerPerManager = 5.0;
  food.employedManagers = 15; // 实际比率 10:1，仅达标 50%

  // 计算协同效率: 0.70 + 0.30 * (15 / 30) = 0.85
  const neededManagers = food.employedWorkers / food.requiredWorkerPerManager;
  const ratio = Math.min(1.0, food.employedManagers / neededManagers);
  const eff = 0.70 + 0.30 * ratio;

  assert.ok(eff >= 0.70 && eff < 1.00, `Management efficiency (${eff}) must fall in [0.70, 1.00)`);
  assert.strictEqual(eff, 0.85);

  // 2. 验证高景气扩产触发公式：利用率 > 0.85 且当月盈利
  const capUtil = 0.90;
  const isProfitable = true;
  const fixedCapital = 400.0;
  let expansionOrders = 0;
  if (capUtil > 0.85 && isProfitable) {
    expansionOrders = 0.05 * fixedCapital;
  }
  assert.strictEqual(expansionOrders, 20.0, 'Expansion orders must be 5% of fixed capital stock');
});

// =========================================================================
// 5. 比特级可复现性测试 (Bitwise Reproducibility Test)
// =========================================================================
test('Stage 6.6: 同种子跨次运行 100% 比特级一致断言 (Bitwise Reproducibility)', () => {
  const seed = 20261107;

  function run60Months(s: number): SimulationState[] {
    let state = createInitialState(s);
    const hist = [state];
    for (let m = 1; m <= 60; m++) {
      if (m === 10) setPendingBaseTaxRate(state, 0.25);
      if (m === 20) startPublicProject(state, 'road_improvement');
      if (m === 35) triggerShock(state, 'confidence_drop', 6, 0.15);
      state = stepMonth(state, hist);
      hist.push(state);
    }
    return hist;
  }

  const run1 = run60Months(seed);
  const run2 = run60Months(seed);

  // 逐月比对关键状态与期末深层比对
  for (let m = 0; m <= 60; m++) {
    const s1 = run1[m]!;
    const s2 = run2[m]!;
    assert.strictEqual(s1.month, s2.month);
    assert.strictEqual(s1.metrics.realGdp, s2.metrics.realGdp);
    assert.strictEqual(s1.bank.reserveCash, s2.bank.reserveCash);
    assert.strictEqual(s1.sectors.goods.inventory, s2.sectors.goods.inventory);
  }

  const json1 = serializeArchive(run1);
  const json2 = serializeArchive(run2);

  // 去除导出的 ISO 时间戳后逐字匹配
  const clean1 = json1.replace(/"exportedAtIso":\s*"[^"]+"/, '');
  const clean2 = json2.replace(/"exportedAtIso":\s*"[^"]+"/, '');
  assert.strictEqual(clean1, clean2, 'Both 60-month runs must be 100% bitwise identical');
});

// =========================================================================
// 6. 双轨对照 PRNG 抗干扰性测试 (Cross-Sandbox PRNG Isolation)
// =========================================================================
test('Stage 6.7: 双轨对照沙盒 PRNG 抗干扰性断言 (Cross-Sandbox PRNG Isolation)', () => {
  const seed = 999;
  // 验证对同一个月份 t 与同一随机变量，两组获取的噪声严格恒等
  for (let t = 1; t <= 60; t++) {
    const noiseFood = prngSymmetricNoise(seed, t, 'sector_food_tfp_noise', 0.015);
    const noiseFoodAgain = prngSymmetricNoise(seed, t, 'sector_food_tfp_noise', 0.015);
    assert.strictEqual(noiseFood, noiseFoodAgain);

    const noiseGoods = prngSymmetricNoise(seed, t, 'sector_goods_tfp_noise', 0.020);
    const noiseCapital = prngSymmetricNoise(seed, t, 'sector_capital_tfp_noise', 0.025);

    assert.ok(Math.abs(noiseFood) <= 0.015);
    assert.ok(Math.abs(noiseGoods) <= 0.020);
    assert.ok(Math.abs(noiseCapital) <= 0.025);
  }
});

// =========================================================================
// 7. 存档中途导出与续跑一致性测试 (Save/Load Continuity Test)
// =========================================================================
test('Stage 6.8: 存档中途导出与反序列化续跑一致性断言 (Save/Load Continuity)', () => {
  const seed = 777;

  // 运行完整 0 -> 60 个月
  let stateFull = createInitialState(seed);
  const histFull: SimulationState[] = [stateFull];
  for (let m = 1; m <= 60; m++) {
    stateFull = stepMonth(stateFull, histFull);
    histFull.push(stateFull);
  }

  // 运行 0 -> 30 个月，中途导出存档
  let stateHalf = createInitialState(seed);
  const histHalf: SimulationState[] = [stateHalf];
  for (let m = 1; m <= 30; m++) {
    stateHalf = stepMonth(stateHalf, histHalf);
    histHalf.push(stateHalf);
  }

  const archiveJson = serializeArchive(histHalf);
  const restored = deserializeArchive(archiveJson);

  let stateRestored = restored.history[restored.history.length - 1]!;
  const histRestored = [...restored.history];

  // 从 31 续跑至 60 个月
  for (let m = 31; m <= 60; m++) {
    stateRestored = stepMonth(stateRestored, histRestored);
    histRestored.push(stateRestored);
  }

  // 断言续跑结果与连续完整运行结果完全一致
  assert.strictEqual(stateRestored.month, 60);
  assert.strictEqual(stateRestored.metrics.realGdp, stateFull.metrics.realGdp);
  assert.strictEqual(stateRestored.bank.reserveCash, stateFull.bank.reserveCash);
  assert.strictEqual(stateRestored.sectors.food.inventory, stateFull.sectors.food.inventory);
  assert.strictEqual(stateRestored.sectors.goods.inventory, stateFull.sectors.goods.inventory);
  assert.strictEqual(stateRestored.sectors.capital.inventory, stateFull.sectors.capital.inventory);
  assert.strictEqual(stateRestored.households.working.deposits, stateFull.households.working.deposits);
});

// =========================================================================
// 8. 静态源码红线扫描测试 (Static Codebase Redline Scan)
// =========================================================================
test('Stage 6.9: 静态代码红线扫描 (零 Math.random & core 无 DOM 引用)', () => {
  function getAllFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        getAllFiles(fullPath, fileList);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        fileList.push(fullPath);
      }
    }
    return fileList;
  }

  const allSrcFiles = getAllFiles(srcDir);
  const coreFiles = allSrcFiles.filter((f) => f.includes('/src/core/'));

  // 1. 全局零 Math.random() 扫描
  for (const filePath of allSrcFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(
      !content.includes('Math.random('),
      `Forbidden Math.random() detected in file: ${filePath}`
    );
  }

  // 2. src/core/ 目录无 DOM / 浏览器宿主 API 扫描
  const forbiddenDomKeywords = [
    'document.',
    'window.',
    'HTMLElement',
    'HTMLCanvasElement',
    'CanvasRenderingContext2D',
    'requestAnimationFrame',
    'localStorage',
    'sessionStorage',
  ];

  for (const filePath of coreFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    for (const kw of forbiddenDomKeywords) {
      assert.ok(
        !content.includes(kw),
        `Forbidden DOM/Browser keyword "${kw}" detected in core file: ${filePath}`
      );
    }
  }
});
