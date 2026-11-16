/**
 * EFLab Alpha 0.1 - Stage 4 像素城市与防闪烁滞回状态机自动化测试套件
 * 严格遵循 docs/specs/04_Pixel_City_Visual_像素城市与视觉状态机.md
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  updateHysteresisTier,
  BUILDINGS,
  hitTestBuilding,
  formatBuildingTooltip,
} from '../../src/ui/city_canvas/index.js';
import { createInitialState } from '../../src/core/prng/index.js';

test('Stage 4.1: 滞回防抖状态机临界震荡零闪烁断言 (Hysteresis Anti-Flicker Deadband)', () => {
  // 测试参数：down1 = 0.65, up1 = 0.72, down2 = 0.83, up2 = 0.88
  // 初始状态为 MID
  let tier: 'LOW' | 'MID' | 'HIGH' = 'MID';

  // 在 [0.66, 0.71] 的死区缓冲带内来回震荡 30 次
  // 因为 0.66 >= down1 (0.65)，且 0.71 < up2 (0.88)，MID 档位绝不应该跳变！
  for (let i = 0; i < 30; i++) {
    const oscillatingVal = i % 2 === 0 ? 0.66 : 0.71;
    tier = updateHysteresisTier(tier, oscillatingVal, 0.65, 0.72, 0.83, 0.88);
    assert.strictEqual(tier, 'MID', `Deadband violation at iteration ${i}: tier jumped to ${tier}`);
  }

  // 只有当有效跌破 down1 (0.65) 时才降至 LOW
  tier = updateHysteresisTier(tier, 0.64, 0.65, 0.72, 0.83, 0.88);
  assert.strictEqual(tier, 'LOW', 'Must transition to LOW when value < down1');

  // 在 LOW 档位下，只要没有突破 up1 (0.72)，哪怕回到 0.70 也保持 LOW (滞回效应)
  tier = updateHysteresisTier(tier, 0.70, 0.65, 0.72, 0.83, 0.88);
  assert.strictEqual(tier, 'LOW', 'Must stay LOW when value < up1');

  // 突破 up1 (0.72) 回到 MID
  tier = updateHysteresisTier(tier, 0.73, 0.65, 0.72, 0.83, 0.88);
  assert.strictEqual(tier, 'MID', 'Must transition to MID when value >= up1');
});

test('Stage 4.2: 48×32 建筑矩阵与点击检测断言 (Building Grid & Hit Testing)', () => {
  // 验证 12 类建筑完整存在且 ID 唯一
  assert.strictEqual(BUILDINGS.length, 12, 'Must have exactly 12 buildings');
  const ids = new Set(BUILDINGS.map((b) => b.id));
  assert.strictEqual(ids.size, 12, 'Building IDs must be unique (B01 ~ B12)');

  // 验证点击命中检测
  // B01: (2, 2, 9, 6)
  const hitB01 = hitTestBuilding(5, 5);
  assert.ok(hitB01, 'Hit test at (5, 5) should hit a building');
  assert.strictEqual(hitB01.id, 'B01');
  assert.strictEqual(hitB01.name, '工人社区（红砖筒子楼群）');

  // 横向中央大道西段 (5, 15) 应为普通道路，不命中任何建筑
  const hitRoad = hitTestBuilding(5, 15);
  assert.strictEqual(hitRoad, null, 'Road tile should not hit any building');
});

test('Stage 4.3: 汇总浮层规范格式化断言 (Aggregate Tooltip Formatter)', () => {
  const state = createInitialState(42);

  // 检验 B01 浮层标签
  const b01 = BUILDINGS.find((b) => b.id === 'B01')!;
  const tooltipB01 = formatBuildingTooltip(b01, state);
  assert.strictEqual(tooltipB01.categoryTag, '【底层工人阶层 — 全城汇总数据】');
  assert.ok(tooltipB01.rows.length >= 5);

  // 检验 B09 食品厂浮层标签
  const b09 = BUILDINGS.find((b) => b.id === 'B09')!;
  const tooltipB09 = formatBuildingTooltip(b09, state);
  assert.strictEqual(tooltipB09.categoryTag, '【食品行业 — 全行业汇总数据】');
  assert.ok(tooltipB09.rows.some((r) => r.label === '管理协同效率系数'));
});
