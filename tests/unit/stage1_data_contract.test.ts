/**
 * EFLab Alpha 0.1 - Stage 1 自动化自检套件 (Stage 1 Unit Test Suite)
 * 验证：PRNG 确定性、分布合理性、第 0 月 SFC 初始稳态配平、深拷贝与存档序列化
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,
  prngUniform01,
  prngRange,
  prngSymmetricNoise,
  cloneSimulationState,
  serializeArchive,
  deserializeArchive,
} from '../../src/core/prng/index.js';

test('Stage 1.1: PRNG 确定性与调用顺序无关性 (Determinism & Order Independence)', () => {
  const seed = 12345;
  const month = 3;

  // 1. 同一键连续调用 1000 次，结果严格一致
  const firstVal = prngUniform01(seed, month, 'sector_food_tfp_noise');
  for (let i = 0; i < 1000; i++) {
    const val = prngUniform01(seed, month, 'sector_food_tfp_noise');
    assert.strictEqual(val, firstVal, 'PRNG must return bitwise identical value for same inputs');
  }

  // 2. 打乱调用顺序：插入其他键的调用，后续再读取原键，结果不受任何影响
  prngUniform01(seed, month, 'dummy_key_1');
  prngUniform01(seed, month, 'dummy_key_2');
  prngUniform01(999, 10, 'other_seed');
  const afterVal = prngUniform01(seed, month, 'sector_food_tfp_noise');
  assert.strictEqual(afterVal, firstVal, 'PRNG must be order-independent (stateless)');

  // 3. 范围与对称噪声测试
  const rangeVal = prngRange(seed, month, 'test_range', 10, 20);
  assert.ok(rangeVal >= 10 && rangeVal <= 20, 'prngRange must be within [min, max]');

  const noiseVal = prngSymmetricNoise(seed, month, 'test_noise', 0.05);
  assert.ok(noiseVal >= -0.05 && noiseVal <= 0.05, 'prngSymmetricNoise must be within [-amplitude, amplitude]');
});

test('Stage 1.2: PRNG 分布合理性与无越界测试 (Distribution Sanity)', () => {
  const seed = 98765;
  const month = 1;
  const sampleCount = 10000;
  let sum = 0;

  for (let i = 0; i < sampleCount; i++) {
    const val = prngUniform01(seed, month, `var_${i}`);
    assert.ok(val >= 0 && val < 1, `Value ${val} out of bounds [0, 1)`);
    sum += val;
  }

  const mean = sum / sampleCount;
  // 均匀分布在 [0, 1) 的期望值为 0.50，10,000 个样本应落在 [0.49, 0.51] 内
  assert.ok(
    mean >= 0.49 && mean <= 0.51,
    `PRNG distribution mean ${mean} deviated from expected 0.50`
  );
});

test('Stage 1.3: 第 0 月 SFC 资产负债与资金池严格配平断言 (Month 0 Balance Assertion)', () => {
  const state = createInitialState(42);

  // 1. 版本与时间戳
  assert.strictEqual(state.version, 'EFLab-Alpha-0.1');
  assert.strictEqual(state.month, 0);
  assert.strictEqual(state.seed, 42);

  // 2. 银行资产端 vs 负债权益端闭环核验
  // 资产端 = 发放贷款 + 金库现金准备
  const bankAssets = state.bank.totalLoans + state.bank.reserveCash;
  // 负债权益端 = 吸收存款 + 银行资本缓冲池
  const bankLiabilitiesAndEquity = state.bank.totalDeposits + state.bank.equityBuffer;
  const sfcDiscrepancy = Math.abs(bankAssets - bankLiabilitiesAndEquity);

  assert.strictEqual(state.bank.totalLoans, 2000.0, 'Total bank loans must equal 2000.0k');
  assert.strictEqual(state.bank.reserveCash, 4000.0, 'Bank reserve cash must equal 4000.0k');
  assert.strictEqual(state.bank.totalDeposits, 5700.0, 'Total deposits must equal 5700.0k');
  assert.strictEqual(state.bank.equityBuffer, 300.0, 'Bank equity buffer must equal 300.0k');
  assert.strictEqual(sfcDiscrepancy, 0.0, 'Month 0 Bank Assets must exactly equal Liabilities + Equity (error === 0)');

  // 3. 存款分项合计核验
  const householdDeposits =
    state.households.working.deposits +
    state.households.middle.deposits +
    state.households.capitalist.deposits;
  assert.strictEqual(householdDeposits, 4000.0, 'Household deposits sum must be 4000.0k');
  assert.strictEqual(state.bank.totalHouseholdDeposits, 4000.0);

  const corporateDeposits =
    state.sectors.food.cash +
    state.sectors.goods.cash +
    state.sectors.capital.cash;
  assert.strictEqual(corporateDeposits, 1200.0, 'Corporate cash deposits sum must be 1200.0k');
  assert.strictEqual(state.bank.totalCorporateDeposits, 1200.0);

  assert.strictEqual(state.municipal.cashDeposits, 500.0, 'Municipal cash deposits must be 500.0k');
  assert.strictEqual(state.bank.municipalDeposits, 500.0);

  assert.strictEqual(
    householdDeposits + corporateDeposits + state.municipal.cashDeposits,
    state.bank.totalDeposits,
    'Sum of all sector deposits must equal bank.totalDeposits'
  );

  // 4. 贷款分项合计核验
  const corporateLoans =
    state.sectors.food.loans +
    state.sectors.goods.loans +
    state.sectors.capital.loans;
  assert.strictEqual(corporateLoans, 1500.0, 'Corporate loans sum must be 1500.0k');
  assert.strictEqual(state.bank.totalCorporateLoans, 1500.0);

  assert.strictEqual(state.municipal.debtLoans, 500.0, 'Municipal debt loans must be 500.0k');
  assert.strictEqual(state.bank.municipalLoans, 500.0);

  assert.strictEqual(
    corporateLoans + state.municipal.debtLoans,
    state.bank.totalLoans,
    'Sum of all sector loans must equal bank.totalLoans'
  );

  // 5. 人口、就业与管理配比稳态核验
  const totalEmployedWorkers =
    state.sectors.food.employedWorkers +
    state.sectors.goods.employedWorkers +
    state.sectors.capital.employedWorkers;
  assert.strictEqual(totalEmployedWorkers, 720, 'Employed workers sum must equal 720');
  assert.strictEqual(state.households.working.employed, 720);
  assert.strictEqual(state.households.working.unemploymentRate, 0.10);

  const totalEmployedManagers =
    state.sectors.food.employedManagers +
    state.sectors.goods.employedManagers +
    state.sectors.capital.employedManagers;
  assert.strictEqual(totalEmployedManagers, 180, 'Employed managers sum must equal 180');
  assert.strictEqual(state.households.middle.employed, 180);
  assert.strictEqual(state.households.middle.unemploymentRate, 0.10);

  // 三行业管理协同系数在第 0 月必须达到 1.00
  assert.strictEqual(state.sectors.food.managementEfficiency, 1.00);
  assert.strictEqual(state.sectors.goods.managementEfficiency, 1.00);
  assert.strictEqual(state.sectors.capital.managementEfficiency, 1.00);

  // 6. 实物库存与存款严格非负
  assert.ok(state.sectors.food.inventory >= 0);
  assert.ok(state.sectors.goods.inventory >= 0);
  assert.ok(state.sectors.capital.inventory >= 0);
  assert.ok(state.households.working.deposits >= 0);
  assert.ok(state.households.middle.deposits >= 0);
  assert.ok(state.households.capitalist.deposits >= 0);

  // 7. 初始宏观指标与视觉滞回档位核验
  assert.strictEqual(state.metrics.gdpYoY, null, 'GDP YoY must be null when month < 12');
  assert.strictEqual(state.metrics.inflationYoY, null, 'Inflation YoY must be null when month < 12');
  assert.strictEqual(state.visualState.workingConsumptionTier, 'MID');
  assert.strictEqual(state.visualState.employmentHealthTier, 'MID');
  assert.strictEqual(state.visualState.inventoryPileTier, 'MID');
});

test('Stage 1.4: 状态深拷贝物理隔离测试 (Deep Clone Isolation)', () => {
  const original = createInitialState(100);
  const cloned = cloneSimulationState(original);

  // 修改克隆对象的深层属性
  cloned.households.working.deposits = 9999.99;
  cloned.sectors.food.inventory = 0.0;
  cloned.municipal.projects.road_improvement.status = 'ACTIVE';

  // 验证原对象保持不变
  assert.strictEqual(original.households.working.deposits, 600.0);
  assert.strictEqual(original.sectors.food.inventory, 85.0);
  assert.strictEqual(original.municipal.projects.road_improvement.status, 'IDLE');
});

test('Stage 1.5: 存档序列化与反序列化测试 (Save Archive Serialization)', () => {
  const state0 = createInitialState(42);
  const history = [state0];

  const jsonStr = serializeArchive(history);
  assert.ok(typeof jsonStr === 'string' && jsonStr.length > 0);

  const restored = deserializeArchive(jsonStr);
  assert.strictEqual(restored.schemaVersion, 'EFLab-Archive-v1');
  assert.strictEqual(restored.seed, 42);
  assert.strictEqual(restored.currentMonth, 0);
  assert.strictEqual(restored.history.length, 1);
  assert.strictEqual(restored.history[0]?.month, 0);
  assert.strictEqual(restored.history[0]?.bank.totalDeposits, 5700.0);

  // 异常输入测试
  assert.throws(() => deserializeArchive('invalid json string'), /Invalid JSON/);
  assert.throws(
    () => deserializeArchive(JSON.stringify({ schemaVersion: 'WrongVersion' })),
    /Unsupported archive schema version/
  );
});
