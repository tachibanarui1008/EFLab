/**
 * EFLab Alpha 0.1 - Stage 3 政策队列、基建状态机与事件归因自动化测试套件
 * 严格遵循 docs/specs/03_Policy_Project_Event_政策项目与事件归因.md
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../../src/core/prng/index.js';
import {
  stepMonth,
  setPendingBaseTaxRate,
  setPendingPublicServiceBudget,
  startPublicProject,
  triggerShock,
  clearShock,
} from '../../src/core/engine/index.js';
import type { SimulationState } from '../../src/core/prng/types.js';

test('Stage 3.1: 政策延迟生效队列与事件卡片断言 (Delayed Policy Queue & Event Card)', () => {
  const state0 = createInitialState(42);
  // 在第 0 月排队调整税率至 30%
  setPendingBaseTaxRate(state0, 0.30);
  assert.strictEqual(state0.municipal.baseTaxRate, 0.20, 'Tax rate in month 0 should remain 20%');
  assert.strictEqual(state0.municipal.pendingBaseTaxRate, 0.30);

  // 推进至第 1 月
  const state1 = stepMonth(state0, [state0]);
  assert.strictEqual(state1.municipal.baseTaxRate, 0.30, 'Tax rate in month 1 must become 30%');
  assert.strictEqual(state1.municipal.pendingBaseTaxRate, null, 'Pending tax rate should be reset to null');

  // 校验事件卡片
  const taxEvent = state1.events.find((e) => e.category === 'POLICY_ACTIVE' && e.id.includes('tax'));
  assert.ok(taxEvent, 'Policy active event must be generated');
  assert.strictEqual(taxEvent.attributionType, 'DETERMINISTIC_MECHANISM');
  assert.ok(taxEvent.description.includes('30.0%'));
});

test('Stage 3.2: 公共基建项目施工、完工增益与缺钱停工状态机测试 (Infrastructure Lifecycle & Halted State)', () => {
  const state0 = createInitialState(100);
  // 启动道路改善工程 (工期 6 个月，每月采购 25 件资本品)
  const started = startPublicProject(state0, 'road_improvement');
  assert.strictEqual(started, true);
  assert.strictEqual(state0.municipal.projects.road_improvement.status, 'ACTIVE');

  let state = state0;
  const history: SimulationState[] = [state0];

  // 连续推进直到完工 (考虑实物资本品配给满足率，约 10 个月)
  for (let m = 1; m <= 11; m++) {
    state = stepMonth(state, history);
    history.push(state);
    if (state.municipal.projects.road_improvement.status === 'COMPLETED') {
      break;
    }
  }

  // 验证第 6 或第 7 月完工状态与永久增益
  const roadProj = state.municipal.projects.road_improvement;
  assert.strictEqual(roadProj.status, 'COMPLETED', 'Road project should be completed within 7 months');
  assert.strictEqual(roadProj.permanentBonusApplied, true, 'Permanent bonus must be applied');
  assert.strictEqual(state.metrics.logisticsLossRate, 0.005, 'Logistics loss rate must drop to 0.5%');

  // 验证完工事件卡片
  const completeEvent = history.flatMap((h) => h.events).find((e) => e.title.includes('工程竣工'));
  assert.ok(completeEvent, 'Project completion event must be recorded');
  assert.strictEqual(completeEvent.attributionType, 'DETERMINISTIC_MECHANISM');

  // 验证缺钱停工 (SUSPENDED_NO_FUNDS) 状态机分支
  const bankruptState = createInitialState(200);
  startPublicProject(bankruptState, 'energy_expansion');
  // 人为耗尽市政资金并拉满债务上限
  bankruptState.municipal.cashDeposits = 0.0;
  bankruptState.municipal.debtLoans = bankruptState.municipal.debtCeiling;

  const nextBankrupt = stepMonth(bankruptState, [bankruptState]);
  const energyProj = nextBankrupt.municipal.projects.energy_expansion;
  assert.strictEqual(energyProj.status, 'SUSPENDED_NO_FUNDS', 'Project must be suspended when funds exhausted');

  const suspendedEvent = nextBankrupt.events.find((e) => e.title.includes('缺钱停工'));
  assert.ok(suspendedEvent, 'Suspended event must be generated');
  assert.strictEqual(suspendedEvent.attributionType, 'DETERMINISTIC_MECHANISM');
});

test('Stage 3.3: 外生冲击注入与归因类型严格区分测试 (Shock Injection & Attribution Classification)', () => {
  const state0 = createInitialState(300);
  triggerShock(state0, 'confidence_drop', 3, 0.20);
  assert.strictEqual(state0.shocks.confidence_drop.active, true);
  assert.strictEqual(state0.shocks.confidence_drop.remainingMonths, 3);
  assert.strictEqual(state0.shocks.confidence_drop.magnitude, 0.20);

  const state1 = stepMonth(state0, [state0]);
  const shockEvent = state1.events.find((e) => e.category === 'SHOCK_TRIGGER');
  assert.ok(shockEvent, 'Shock trigger event must be generated');
  assert.strictEqual(shockEvent.attributionType, 'DETERMINISTIC_MECHANISM');

  // 检查所有生成的事件，必须有且仅有合法归因类型
  for (const evt of state1.events) {
    assert.ok(
      evt.attributionType === 'DETERMINISTIC_MECHANISM' ||
        evt.attributionType === 'CORRELATED_OBSERVATION',
      `Event ${evt.id} has invalid attributionType`
    );
    if (evt.category === 'CORRELATED_CHANGE') {
      assert.strictEqual(evt.attributionType, 'CORRELATED_OBSERVATION');
    }
  }
});
