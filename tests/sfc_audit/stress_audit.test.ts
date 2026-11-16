/**
 * EFLab Alpha 0.1 - Stage 6 终极守门员：3,000 步 SFC 极端压力审计
 * 严格遵循 docs/specs/06_Acceptance_Test_验收测试与自检套件.md
 * 
 * 规模：10 个随机种子 × 5 大极端情景 × 60 个月 = 3,000 个模拟步
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
} from '../../src/core/engine/index.js';
import type { SimulationState } from '../../src/core/prng/types.js';

test('Stage 6.1: 3,000 步全量 SFC 存量-流量一致性与零黑洞极端压力审计 (3,000-Step Stress Audit)', () => {
  const seeds = [1, 7, 42, 99, 123, 555, 777, 1024, 8888, 20261107];
  let totalStepsAudited = 0;
  let globalMaxDiscrepancy = 0;
  let globalMinInventory = Number.POSITIVE_INFINITY;

  for (const seed of seeds) {
    // 5 大极端场景
    for (let scenario = 1; scenario <= 5; scenario++) {
      let state = createInitialState(seed);
      const history: SimulationState[] = [state];

      for (let m = 1; m <= 60; m++) {
        // 情景 S2: 极限紧缩高税率
        if (scenario === 2 && m === 1) {
          setPendingBaseTaxRate(state, 0.50);
          setPendingPublicServiceBudget(state, 60.0);
        }

        // 情景 S3: 极限赤字扩张与基建启动
        if (scenario === 3 && m === 1) {
          setPendingBaseTaxRate(state, 0.05);
          setPendingPublicServiceBudget(state, 360.0);
          startPublicProject(state, 'road_improvement');
          startPublicProject(state, 'energy_expansion');
        }

        // 情景 S4: 双重外生冲击叠加
        if (scenario === 4 && (m === 10 || m === 25)) {
          triggerShock(state, 'confidence_drop', 6, 0.20);
          triggerShock(state, 'productivity_drop', 6, 0.15);
        }

        // 情景 S5: 高频随机政策调整
        if (scenario === 5 && m % 4 === 0) {
          const newTax = 0.10 + ((m * 7) % 35) / 100;
          setPendingBaseTaxRate(state, newTax);
        }

        state = stepMonth(state, history);
        history.push(state);
        totalStepsAudited++;

        // 核心硬断言核验
        assert.strictEqual(
          state.sfcAudit.passed,
          true,
          `Seed ${seed} Scenario S${scenario} Month ${m} failed SFC audit`
        );

        globalMaxDiscrepancy = Math.max(globalMaxDiscrepancy, state.sfcAudit.maxAbsDiscrepancy);
        assert.ok(
          state.sfcAudit.maxAbsDiscrepancy <= 1e-6,
          `Discrepancy ${state.sfcAudit.maxAbsDiscrepancy.toExponential(4)} exceeded 1e-6`
        );

        for (const sid of ['food', 'goods', 'capital'] as const) {
          const inv = state.sectors[sid].inventory;
          globalMinInventory = Math.min(globalMinInventory, inv);
          assert.ok(inv >= 0, `Negative inventory in sector ${sid}: ${inv}`);
          assert.ok(state.sectors[sid].cash >= 0, `Negative cash in sector ${sid}`);
        }

        for (const hid of ['working', 'middle', 'capitalist'] as const) {
          assert.ok(state.households[hid].deposits >= 0, `Negative deposits in household ${hid}`);
        }
      }
    }
  }

  assert.strictEqual(totalStepsAudited, 3000, 'Must audit exactly 3,000 monthly steps');
  assert.ok(globalMaxDiscrepancy <= 1e-6, `Global max discrepancy ${globalMaxDiscrepancy} <= 1e-6`);
  assert.ok(globalMinInventory >= 0, `Global min inventory ${globalMinInventory} >= 0`);
});
