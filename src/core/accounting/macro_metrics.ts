/**
 * EFLab Alpha 0.1 - 宏观统计核算器 (Macroeconomic Metrics Calculator)
 * 严格遵循 docs/specs/02_Economic_Engine_月度经济引擎与SFC核算.md
 */

import type {
  SimulationState,
  MacroMetrics,
  HouseholdClassState,
  SectorState,
} from '../prng/types.js';

export const BASE_PRICES = {
  food: 1.0,
  goods: 1.0,
  capital: 2.0,
} as const;

// 第 0 月居民基准消费篮子 (件数)
export const BASE_BASKET = {
  food: 340.0,
  goods: 340.0,
} as const;

/**
 * 计算当期宏观统计指标
 */
export function calculateMacroMetrics(
  prevState: SimulationState,
  currHouseholds: Record<string, HouseholdClassState>,
  currSectors: Record<string, SectorState>,
  currMunicipal: {
    govtGoodsPurchaseActual: number;
    projectCapitalPurchaseActual: number;
    projects: {
      road_improvement: { permanentBonusApplied: boolean };
      energy_expansion: { permanentBonusApplied: boolean };
    };
  },
  history: SimulationState[],
  currentMonth: number
): MacroMetrics {
  const municipalGovtGoodsPurchase = currMunicipal.govtGoodsPurchaseActual;
  const municipalProjectCapitalPurchase = currMunicipal.projectCapitalPurchaseActual;
  // 1. 支出法名义 GDP 核算 (C + I + G)
  // 名义总消费 C: 三阶层居民实际在食品和消费品上的消费支出之和
  const C =
    (currHouseholds.working?.actualConsumptionFood ?? 0) +
    (currHouseholds.working?.actualConsumptionGoods ?? 0) +
    (currHouseholds.middle?.actualConsumptionFood ?? 0) +
    (currHouseholds.middle?.actualConsumptionGoods ?? 0) +
    (currHouseholds.capitalist?.actualConsumptionFood ?? 0) +
    (currHouseholds.capitalist?.actualConsumptionGoods ?? 0);

  // 名义总投资 I: 三行业资本品实际采购金额 + 三行业库存变动市值
  let I = 0;
  for (const s of Object.values(currSectors)) {
    const prevSector = prevState.sectors[s.id as keyof typeof prevState.sectors];
    const prevInv = prevSector?.inventory ?? s.inventory;
    const invChange = (s.inventory - prevInv) * s.price;
    I += s.capitalPurchaseCost + invChange;
  }

  // 名义政府购买 G: 市政厅实际采购消费品支出 + 基建项目实际采购资本品支出 (民生转移支付补贴属于再分配，绝不计入G)
  const G = municipalGovtGoodsPurchase + municipalProjectCapitalPurchase;

  const nominalGdp = Math.max(0, C + I + G);

  // 2. 实际 GDP 核算 (按第 0 月不变价格基准核算)
  // 实际消费: 实际销售件数中居民购买的部分乘以基期价
  const foodSalesUnits = currSectors.food?.salesUnits ?? 0;
  const goodsHouseholdSalesUnits = Math.max(
    0,
    (currSectors.goods?.salesUnits ?? 0) - (municipalGovtGoodsPurchase / (currSectors.goods?.price ?? 1.0))
  );
  const realC =
    foodSalesUnits * BASE_PRICES.food +
    goodsHouseholdSalesUnits * BASE_PRICES.goods;

  let realI = 0;
  for (const s of Object.values(currSectors)) {
    const prevSector = prevState.sectors[s.id as keyof typeof prevState.sectors];
    const prevInv = prevSector?.inventory ?? s.inventory;
    const baseP = BASE_PRICES[s.id as keyof typeof BASE_PRICES] ?? 1.0;
    const invChangeUnits = (s.inventory - prevInv);
    realI += s.actualCapitalPurchasedUnits * BASE_PRICES.capital + invChangeUnits * baseP;
  }

  const realG =
    (municipalGovtGoodsPurchase / (currSectors.goods?.price ?? 1.0)) * BASE_PRICES.goods +
    (municipalProjectCapitalPurchase / (currSectors.capital?.price ?? 2.0)) * BASE_PRICES.capital;

  const realGdp = Math.max(0, realC + realI + realG);

  // 3. 不含资本品的固定篮子 CPI 核算 (第 0 月基期 = 100.0)
  const pFood = currSectors.food?.price ?? 1.0;
  const pGoods = currSectors.goods?.price ?? 1.0;
  const basketCurrentCost = BASE_BASKET.food * pFood + BASE_BASKET.goods * pGoods;
  const basketBaseCost = BASE_BASKET.food * BASE_PRICES.food + BASE_BASKET.goods * BASE_PRICES.goods;
  const cpi = (basketCurrentCost / basketBaseCost) * 100.0;

  // 4. 同比指标空值保护 (month < 12 严格为 null)
  let gdpYoY: number | null = null;
  let inflationYoY: number | null = null;

  if (currentMonth >= 12 && history && history.length >= 12) {
    const baseSnapshot = history[currentMonth - 12];
    if (baseSnapshot && baseSnapshot.metrics.realGdp > 0) {
      gdpYoY = (realGdp - baseSnapshot.metrics.realGdp) / baseSnapshot.metrics.realGdp;
    }
    if (baseSnapshot && baseSnapshot.metrics.cpi > 0) {
      inflationYoY = (cpi - baseSnapshot.metrics.cpi) / baseSnapshot.metrics.cpi;
    }
  }

  // 5. 全城综合失业率
  const workingLimit = currHouseholds.working?.populationLimit ?? 800;
  const middleLimit = currHouseholds.middle?.populationLimit ?? 200;
  const workingEmployed = currHouseholds.working?.employed ?? 0;
  const middleEmployed = currHouseholds.middle?.employed ?? 0;
  const totalLabor = workingLimit + middleLimit;
  const totalEmployed = workingEmployed + middleEmployed;
  const overallUnemploymentRate = Math.max(0, (totalLabor - totalEmployed) / totalLabor);

  // 6. 综合景气指数
  const realGdpBase = 1010.0;
  const prosperityIndex = Math.max(
    0,
    Math.min(
      100,
      50 +
        150 * (0.90 - overallUnemploymentRate - 0.80) +
        30 * (realGdp / realGdpBase - 1.0) -
        50 * Math.abs(cpi / 100.0 - 1.0)
    )
  );

  return {
    nominalGdp,
    realGdp,
    gdpYoY,
    cpi,
    inflationYoY,
    overallUnemploymentRate,
    prosperityIndex,
    logisticsLossRate: currMunicipal.projects.road_improvement.permanentBonusApplied ? 0.005 : 0.030,
    energyEfficiencyBonus: currMunicipal.projects.energy_expansion.permanentBonusApplied ? 1.08 : 1.00,
  };
}
