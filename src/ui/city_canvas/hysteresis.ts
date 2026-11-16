/**
 * EFLab Alpha 0.1 - 8 项指标防闪烁滞回状态机 (Hysteresis State Machine)
 * 严格遵循 docs/specs/04_Pixel_City_Visual_像素城市与视觉状态机.md
 */

import type {
  VisualTier,
  CityVisualHysteresisState,
  SimulationState,
} from '../../core/prng/types.js';

/**
 * 通用滞回单项状态计算函数
 * @param prevTier 上月档位
 * @param value 当月实际指标值
 * @param down1 MID -> LOW 下降阈值
 * @param up1   LOW -> MID 上升阈值
 * @param down2 HIGH -> MID 下降阈值
 * @param up2   MID -> HIGH 上升阈值
 */
export function updateHysteresisTier(
  prevTier: VisualTier,
  value: number,
  down1: number,
  up1: number,
  down2: number,
  up2: number
): VisualTier {
  if (prevTier === 'LOW') {
    if (value >= up2) return 'HIGH';
    if (value >= up1) return 'MID';
    return 'LOW';
  }
  if (prevTier === 'MID') {
    if (value < down1) return 'LOW';
    if (value >= up2) return 'HIGH';
    return 'MID';
  }
  // prevTier === 'HIGH'
  if (value < down1) return 'LOW';
  if (value < down2) return 'MID';
  return 'HIGH';
}

/**
 * 8 项核心宏观与行业指标映射至防闪烁滞回视觉状态
 */
export function updateCityVisualState(
  prevState: SimulationState,
  currState: SimulationState
): CityVisualHysteresisState {
  const prevVis = prevState.visualState;

  // 1. 底层工人实际消费相对第0月基准 (470.73 k)
  const baseWSpend = 470.73;
  const currWSpend =
    currState.households.working.actualConsumptionFood +
    currState.households.working.actualConsumptionGoods;
  const valW = currWSpend / baseWSpend;
  const workingConsumptionTier = updateHysteresisTier(
    prevVis.workingConsumptionTier,
    valW,
    0.85,
    0.92,
    1.05,
    1.12
  );

  // 2. 中层管理实际消费相对第0月基准 (181.30 k)
  const baseMSpend = 181.30;
  const currMSpend =
    currState.households.middle.actualConsumptionFood +
    currState.households.middle.actualConsumptionGoods;
  const valM = currMSpend / baseMSpend;
  const middleConsumptionTier = updateHysteresisTier(
    prevVis.middleConsumptionTier,
    valM,
    0.85,
    0.92,
    1.05,
    1.12
  );

  // 3. 资本家实际消费相对第0月基准 (45.28 k)
  const baseCSpend = 45.28;
  const currCSpend =
    currState.households.capitalist.actualConsumptionFood +
    currState.households.capitalist.actualConsumptionGoods;
  const valC = currCSpend / baseCSpend;
  const capitalistConsumptionTier = updateHysteresisTier(
    prevVis.capitalistConsumptionTier,
    valC,
    0.85,
    0.92,
    1.05,
    1.12
  );

  // 4. 全城综合就业率: 1 - u_overall
  const valEmp = 1.0 - currState.metrics.overallUnemploymentRate;
  const employmentHealthTier = updateHysteresisTier(
    prevVis.employmentHealthTier,
    valEmp,
    0.84,
    0.88,
    0.92,
    0.95
  );

  // 5. 食品加工厂产能利用率
  const foodSectorActivityTier = updateHysteresisTier(
    prevVis.foodSectorActivityTier,
    currState.sectors.food.capacityUtilization,
    0.65,
    0.72,
    0.83,
    0.88
  );

  // 6. 消费品制造厂产能利用率
  const goodsSectorActivityTier = updateHysteresisTier(
    prevVis.goodsSectorActivityTier,
    currState.sectors.goods.capacityUtilization,
    0.65,
    0.72,
    0.83,
    0.88
  );

  // 7. 资本品重工厂产能利用率
  const capitalSectorActivityTier = updateHysteresisTier(
    prevVis.capitalSectorActivityTier,
    currState.sectors.capital.capacityUtilization,
    0.60,
    0.68,
    0.82,
    0.87
  );

  // 8. 全城库存总偏离度: 总实际库存 / 总目标安全库存
  const totalInv =
    currState.sectors.food.inventory +
    currState.sectors.goods.inventory +
    currState.sectors.capital.inventory;
  const totalTargetInv =
    0.25 * currState.sectors.food.targetOutput +
    0.25 * currState.sectors.goods.targetOutput +
    0.25 * currState.sectors.capital.targetOutput;
  const valInv = totalInv / Math.max(1, totalTargetInv);
  const inventoryPileTier = updateHysteresisTier(
    prevVis.inventoryPileTier,
    valInv,
    0.65,
    0.80,
    1.20,
    1.35
  );

  return {
    workingConsumptionTier,
    middleConsumptionTier,
    capitalistConsumptionTier,
    employmentHealthTier,
    foodSectorActivityTier,
    goodsSectorActivityTier,
    capitalSectorActivityTier,
    inventoryPileTier,
  };
}
