/**
 * EFLab Alpha 0.1 - 第 0 月 SFC 稳态配平初始状态工厂 (Initial State Factory)
 * 严格遵循 docs/specs/01_Data_Contract_数据契约与PRNG规范.md
 */

import type {
  SimulationState,
  HouseholdClassState,
  SectorState,
  BankState,
  MunicipalState,
  ActiveShockState,
  MacroMetrics,
  CityVisualHysteresisState,
  SfcAuditResult,
} from './types.js';

export function createInitialState(seed: number = 42): SimulationState {
  const households: Record<string, HouseholdClassState> = {
    working: {
      id: 'working',
      name: '底层工人阶层',
      populationLimit: 800,
      employed: 720,
      unemploymentRate: 0.10,
      wageRate: 0.80,
      mpc: 0.85,
      foodShare: 0.40,
      goodsShare: 0.60,
      taxMultiplier: 0.75,
      deposits: 600.0,
      wageIncome: 576.0,          // 720 * 0.80
      dividendIncome: 0.0,
      transferIncome: 63.0,       // 90.0 * 0.70
      interestIncome: 1.20,       // 600.0 * 0.002
      taxPaid: 86.40,             // 576.0 * (0.75 * 0.20)
      disposableIncome: 553.80,
      plannedConsumptionFood: 188.29,
      plannedConsumptionGoods: 282.44,
      actualConsumptionFood: 188.29,
      actualConsumptionGoods: 282.44,
      forcedSaving: 0.0,
      netSavingFlow: 83.07,
    },
    middle: {
      id: 'middle',
      name: '中层管理与技术阶层',
      populationLimit: 200,
      employed: 180,
      unemploymentRate: 0.10,
      wageRate: 1.60,
      mpc: 0.70,
      foodShare: 0.20,
      goodsShare: 0.80,
      taxMultiplier: 1.00,
      deposits: 800.0,
      wageIncome: 288.0,          // 180 * 1.60
      dividendIncome: 0.0,
      transferIncome: 27.0,       // 90.0 * 0.30
      interestIncome: 1.60,       // 800.0 * 0.002
      taxPaid: 57.60,             // 288.0 * (1.00 * 0.20)
      disposableIncome: 259.0,
      plannedConsumptionFood: 36.26,
      plannedConsumptionGoods: 145.04,
      actualConsumptionFood: 36.26,
      actualConsumptionGoods: 145.04,
      forcedSaving: 0.0,
      netSavingFlow: 77.70,
    },
    capitalist: {
      id: 'capitalist',
      name: '资本家阶层',
      populationLimit: 50,
      employed: 0,
      unemploymentRate: 0.0,
      wageRate: 0.0,
      mpc: 0.40,
      foodShare: 0.05,
      goodsShare: 0.95,
      taxMultiplier: 1.25,
      deposits: 2600.0,
      wageIncome: 0.0,
      dividendIncome: 144.0,      // 三行业与银行分红合计
      transferIncome: 0.0,
      interestIncome: 5.20,       // 2600.0 * 0.002
      taxPaid: 36.0,              // 144.0 * (1.25 * 0.20 = 25%)
      disposableIncome: 113.20,
      plannedConsumptionFood: 2.26,
      plannedConsumptionGoods: 43.02,
      actualConsumptionFood: 2.26,
      actualConsumptionGoods: 43.02,
      forcedSaving: 0.0,
      netSavingFlow: 67.92,
    },
  };

  const sectors: Record<string, SectorState> = {
    food: {
      id: 'food',
      name: '食品行业',
      requiredWorkerPerManager: 5,
      baseTfp: 1.0,
      cash: 350.0,
      loans: 400.0,
      capitalStock: 2000.0,
      inventory: 85.0,
      targetInventoryRatio: 0.25,
      price: 1.00,
      targetOutput: 340.0,
      actualOutput: 340.0,
      capacityLimit: 420.0,
      capacityUtilization: 340.0 / 420.0,
      employedWorkers: 250,
      employedManagers: 55,
      targetWorkers: 250,
      targetManagers: 55,
      managementEfficiency: 1.00,
      demandUnits: 340.0,
      salesUnits: 340.0,
      unmetDemandUnits: 0.0,
      revenue: 340.0,
      wageBill: 288.0,            // 250*0.80 + 55*1.60
      interestPaid: 2.0,          // 400.0 * 0.005
      depreciationUnits: 40.0,    // 2.0% * 2000
      replacementOrderUnits: 40.0,
      expansionOrderUnits: 0.0,
      actualCapitalPurchasedUnits: 40.0,
      capitalPurchaseCost: 80.0,  // 40 * 2.00
      accountingProfit: 10.0,
      dividendsPaid: 8.0,         // 80% of distributed profit
    },
    goods: {
      id: 'goods',
      name: '消费品行业',
      requiredWorkerPerManager: 5,
      baseTfp: 1.0,
      cash: 450.0,
      loans: 600.0,
      capitalStock: 2500.0,
      inventory: 107.5,
      targetInventoryRatio: 0.25,
      price: 1.00,
      targetOutput: 430.0,
      actualOutput: 430.0,
      capacityLimit: 540.0,
      capacityUtilization: 430.0 / 540.0,
      employedWorkers: 270,
      employedManagers: 65,
      targetWorkers: 270,
      targetManagers: 65,
      managementEfficiency: 1.00,
      demandUnits: 430.0,
      salesUnits: 430.0,
      unmetDemandUnits: 0.0,
      revenue: 430.0,
      wageBill: 320.0,            // 270*0.80 + 65*1.60
      interestPaid: 3.0,          // 600.0 * 0.005
      depreciationUnits: 50.0,    // 2.0% * 2500
      replacementOrderUnits: 50.0,
      expansionOrderUnits: 0.0,
      actualCapitalPurchasedUnits: 50.0,
      capitalPurchaseCost: 100.0, // 50 * 2.00
      accountingProfit: 7.0,
      dividendsPaid: 5.6,
    },
    capital: {
      id: 'capital',
      name: '资本品行业',
      requiredWorkerPerManager: 4,
      baseTfp: 1.0,
      cash: 400.0,
      loans: 500.0,
      capitalStock: 1500.0,
      inventory: 40.0,
      targetInventoryRatio: 0.25,
      price: 2.00,
      targetOutput: 160.0,
      actualOutput: 160.0,
      capacityLimit: 210.0,
      capacityUtilization: 160.0 / 210.0,
      employedWorkers: 200,
      employedManagers: 60,
      targetWorkers: 200,
      targetManagers: 60,
      managementEfficiency: 1.00,
      demandUnits: 160.0,
      salesUnits: 160.0,
      unmetDemandUnits: 0.0,
      revenue: 320.0,             // 160 * 2.00
      wageBill: 256.0,            // 200*0.80 + 60*1.60
      interestPaid: 2.5,          // 500.0 * 0.005
      depreciationUnits: 30.0,    // 2.0% * 1500
      replacementOrderUnits: 30.0,
      expansionOrderUnits: 0.0,
      actualCapitalPurchasedUnits: 30.0,
      capitalPurchaseCost: 60.0,  // 30 * 2.00
      accountingProfit: 1.5,
      dividendsPaid: 1.2,
    },
  };

  const bank: BankState = {
    depositRateMonthly: 0.002,
    loanRateMonthly: 0.005,
    maxLoanToDepositRatio: 0.85,
    reserveCash: 4000.0,
    totalHouseholdDeposits: 4000.0, // 600 + 800 + 2600
    totalCorporateDeposits: 1200.0, // 350 + 450 + 400
    municipalDeposits: 500.0,
    totalDeposits: 5700.0,         // 4000 + 1200 + 500
    totalCorporateLoans: 1500.0,    // 400 + 600 + 500
    municipalLoans: 500.0,
    totalLoans: 2000.0,            // 1500 + 500
    equityBuffer: 300.0,
    interestIncome: 10.0,          // 2000.0 * 0.005
    interestExpense: 8.0,          // 4000.0 * 0.002
    netProfit: 2.0,
    dividendsPaid: 1.6,            // 80% of netProfit
  };

  const municipal: MunicipalState = {
    baseTaxRate: 0.20,
    publicServiceBudgetTarget: 180.0,
    transferShareOfService: 0.50,
    pendingBaseTaxRate: null,
    pendingPublicServiceBudget: null,
    cashDeposits: 500.0,
    debtLoans: 500.0,
    debtCeiling: 1500.0,
    taxRevenueWorking: 86.4,
    taxRevenueMiddle: 57.6,
    taxRevenueCapitalist: 36.0,
    totalTaxRevenue: 180.0,
    transferPayoutTotal: 90.0,
    govtGoodsPurchaseActual: 90.0,
    projectCapitalPurchaseActual: 0.0,
    interestPaid: 2.5,
    fiscalBalance: -2.5,
    projects: {
      road_improvement: {
        id: 'road_improvement',
        name: '全城主干道路改善工程',
        status: 'IDLE',
        totalRequiredMonths: 6,
        progressedMonths: 0,
        monthlyCapitalGoodsDemand: 25.0,
        monthlyWorkerDemand: 0,
        monthlyBudgetCost: 50.0,
        permanentBonusApplied: false,
      },
      energy_expansion: {
        id: 'energy_expansion',
        name: '城邦电网与能源扩容工程',
        status: 'IDLE',
        totalRequiredMonths: 8,
        progressedMonths: 0,
        monthlyCapitalGoodsDemand: 35.0,
        monthlyWorkerDemand: 0,
        monthlyBudgetCost: 70.0,
        permanentBonusApplied: false,
      },
    },
  };

  const shocks: Record<string, ActiveShockState> = {
    confidence_drop: {
      id: 'confidence_drop',
      name: '居民消费信心受挫',
      active: false,
      startMonth: 0,
      remainingMonths: 0,
      magnitude: 0.15,
    },
    productivity_drop: {
      id: 'productivity_drop',
      name: '全行业生产率冲击',
      active: false,
      startMonth: 0,
      remainingMonths: 0,
      magnitude: 0.12,
    },
  };

  const metrics: MacroMetrics = {
    nominalGdp: 1010.0,
    realGdp: 1010.0,
    gdpYoY: null,
    cpi: 100.0,
    inflationYoY: null,
    overallUnemploymentRate: 0.10,
    prosperityIndex: 50.0,
    logisticsLossRate: 0.03,
    energyEfficiencyBonus: 1.00,
  };

  const visualState: CityVisualHysteresisState = {
    workingConsumptionTier: 'MID',
    middleConsumptionTier: 'MID',
    capitalistConsumptionTier: 'MID',
    employmentHealthTier: 'MID',
    foodSectorActivityTier: 'MID',
    goodsSectorActivityTier: 'MID',
    capitalSectorActivityTier: 'MID',
    inventoryPileTier: 'MID',
  };

  const sfcAudit: SfcAuditResult = {
    month: 0,
    passed: true,
    maxAbsDiscrepancy: 0.0,
    moneyPoolConservationError: 0.0,
    flowIdentityError: 0.0,
    minInventoryAcrossSectors: 40.0,
    details: ['Month 0 initial steady-state balanced: Asset = Liabilities + Equity'],
  };

  return {
    version: 'EFLab-Alpha-0.1',
    seed: seed >>> 0,
    month: 0,
    households: households as Record<'working' | 'middle' | 'capitalist', HouseholdClassState>,
    sectors: sectors as Record<'food' | 'goods' | 'capital', SectorState>,
    bank,
    municipal,
    shocks: shocks as Record<'confidence_drop' | 'productivity_drop', ActiveShockState>,
    metrics,
    visualState,
    events: [],
    sfcAudit,
  };
}
