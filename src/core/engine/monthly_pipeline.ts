/**
 * EFLab Alpha 0.1 - 月度 10 步经济计算流水线 (10-Step Monthly Pipeline)
 * 严格遵循 docs/specs/02_Economic_Engine_月度经济引擎与SFC核算.md
 */

import type {
  SimulationState,
  HouseholdClassState,
  SectorState,
  BankState,
  MunicipalState,
  ActiveShockState,
} from '../prng/types.js';
import { cloneSimulationState } from '../prng/serialization.js';
import { prngSymmetricNoise } from '../prng/hash_prng.js';
import { assertSfcBalance } from '../accounting/sfc_auditor.js';
import { calculateMacroMetrics } from '../accounting/macro_metrics.js';
import { generateMonthlyEvents } from './shocks_events.js';
import { updateCityVisualState } from '../../ui/city_canvas/hysteresis.js';

export function stepMonth(
  prevState: SimulationState,
  history: SimulationState[] = []
): SimulationState {
  if (prevState.month >= 60) {
    return prevState; // 达到 60 个月上限暂停推进
  }

  const currentMonth = prevState.month + 1;
  const currState = cloneSimulationState(prevState);
  currState.month = currentMonth;

  // 清空当月流量明细
  for (const hid of ['working', 'middle', 'capitalist'] as const) {
    const h = currState.households[hid];
    h.wageIncome = 0;
    h.dividendIncome = 0;
    h.transferIncome = 0;
    h.interestIncome = 0;
    h.taxPaid = 0;
    h.disposableIncome = 0;
    h.plannedConsumptionFood = 0;
    h.plannedConsumptionGoods = 0;
    h.actualConsumptionFood = 0;
    h.actualConsumptionGoods = 0;
    h.forcedSaving = 0;
    h.netSavingFlow = 0;
  }

  for (const sid of ['food', 'goods', 'capital'] as const) {
    const s = currState.sectors[sid];
    s.demandUnits = 0;
    s.salesUnits = 0;
    s.unmetDemandUnits = 0;
    s.revenue = 0;
    s.wageBill = 0;
    s.interestPaid = 0;
    s.depreciationUnits = 0;
    s.replacementOrderUnits = 0;
    s.expansionOrderUnits = 0;
    s.actualCapitalPurchasedUnits = 0;
    s.capitalPurchaseCost = 0;
    s.accountingProfit = 0;
    s.dividendsPaid = 0;
  }

  currState.municipal.taxRevenueWorking = 0;
  currState.municipal.taxRevenueMiddle = 0;
  currState.municipal.taxRevenueCapitalist = 0;
  currState.municipal.totalTaxRevenue = 0;
  currState.municipal.transferPayoutTotal = 0;
  currState.municipal.govtGoodsPurchaseActual = 0;
  currState.municipal.projectCapitalPurchaseActual = 0;
  currState.municipal.interestPaid = 0;
  currState.municipal.fiscalBalance = 0;

  currState.bank.interestIncome = 0;
  currState.bank.interestExpense = 0;
  currState.bank.netProfit = 0;
  currState.bank.dividendsPaid = 0;
  currState.events = [];

  // ==========================================
  // Step 1: 外生冲击与待生效政策激活
  // ==========================================
  if (currState.municipal.pendingBaseTaxRate !== null) {
    currState.municipal.baseTaxRate = Math.min(
      0.50,
      Math.max(0.05, currState.municipal.pendingBaseTaxRate)
    );
    currState.municipal.pendingBaseTaxRate = null;
  }
  if (currState.municipal.pendingPublicServiceBudget !== null) {
    currState.municipal.publicServiceBudgetTarget = Math.max(
      0,
      currState.municipal.pendingPublicServiceBudget
    );
    currState.municipal.pendingPublicServiceBudget = null;
  }

  // 外生冲击倒计时与乘数核算
  let psiConf = 1.0;
  let psiProd = 1.0;

  const confShock = currState.shocks.confidence_drop;
  if (confShock.active) {
    psiConf = Math.max(0.1, 1.0 - confShock.magnitude);
    confShock.remainingMonths -= 1;
    if (confShock.remainingMonths <= 0) {
      confShock.active = false;
    }
  }

  const prodShock = currState.shocks.productivity_drop;
  if (prodShock.active) {
    psiProd = Math.max(0.1, 1.0 - prodShock.magnitude);
    prodShock.remainingMonths -= 1;
    if (prodShock.remainingMonths <= 0) {
      prodShock.active = false;
    }
  }

  // 基建永久增益状态读取
  const deltaLog = currState.municipal.projects.road_improvement.permanentBonusApplied
    ? 0.005
    : 0.030;
  const gammaEnergy = currState.municipal.projects.energy_expansion.permanentBonusApplied
    ? 1.08
    : 1.00;
  currState.metrics.logisticsLossRate = deltaLog;
  currState.metrics.energyEfficiencyBonus = gammaEnergy;

  // ==========================================
  // Step 2: 行业价格调整与排产计划
  // ==========================================
  const basePrices = { food: 1.0, goods: 1.0, capital: 2.0 };
  const baseOutputs = { food: 340.0, goods: 430.0, capital: 160.0 };
  const capitalOutputCoeffs = { food: 0.21, goods: 0.216, capital: 0.14 };

  for (const sid of ['food', 'goods', 'capital'] as const) {
    const s = currState.sectors[sid];
    const prevS = prevState.sectors[sid];

    const refDemand = currentMonth === 1 ? baseOutputs[sid] : prevS.demandUnits;
    const targetInventory = 0.25 * refDemand;
    const inventoryGap = (targetInventory - prevS.inventory) / Math.max(refDemand, 1.0);
    const clampedGap = Math.min(0.5, Math.max(-0.5, inventoryGap));

    // 粘性价格调整
    const baseP = basePrices[sid];
    const newPrice = Math.min(
      2.50 * baseP,
      Math.max(0.50 * baseP, prevS.price * (1 + 0.08 * clampedGap))
    );
    s.price = newPrice;

    // 最大物理产能上限
    const capLimit = prevS.capitalStock * capitalOutputCoeffs[sid] * gammaEnergy;
    s.capacityLimit = capLimit;

    // 目标排产量
    const plannedTarget = refDemand + 0.5 * (targetInventory - prevS.inventory);
    s.targetOutput = Math.min(capLimit, Math.max(0.20 * capLimit, plannedTarget));
  }

  // ==========================================
  // Step 3: 劳动力需求计算与招聘/裁员匹配
  // ==========================================
  const baseProductivity = { food: 1.36, goods: 430.0 / 270.0, capital: 0.80 };
  const baseOverheadManagers = { food: 5, goods: 11, capital: 10 };
  const standardRatio = { food: 5, goods: 5, capital: 4 };

  let totalDemandWorkers = 0;
  let totalDemandManagers = 0;

  for (const sid of ['food', 'goods', 'capital'] as const) {
    const s = currState.sectors[sid];
    const targetWorkers = Math.round(s.targetOutput / (baseProductivity[sid] * gammaEnergy));
    const targetManagers = baseOverheadManagers[sid] + Math.ceil(targetWorkers / standardRatio[sid]);
    s.targetWorkers = targetWorkers;
    s.targetManagers = targetManagers;
    totalDemandWorkers += targetWorkers;
    totalDemandManagers += targetManagers;
  }

  // 劳动力总量约束配给
  const maxWorkers = 800;
  const maxManagers = 200;

  for (const sid of ['food', 'goods', 'capital'] as const) {
    const s = currState.sectors[sid];
    if (totalDemandWorkers <= maxWorkers) {
      s.employedWorkers = s.targetWorkers;
    } else {
      s.employedWorkers = Math.floor((maxWorkers * s.targetWorkers) / totalDemandWorkers);
    }

    if (totalDemandManagers <= maxManagers) {
      s.employedManagers = s.targetManagers;
    } else {
      s.employedManagers = Math.floor((maxManagers * s.targetManagers) / totalDemandManagers);
    }
  }

  // 兜底分配余数，避免取整导致工人闲置
  let allocatedWorkers = currState.sectors.food.employedWorkers + currState.sectors.goods.employedWorkers + currState.sectors.capital.employedWorkers;
  if (totalDemandWorkers > maxWorkers && allocatedWorkers < maxWorkers) {
    currState.sectors.food.employedWorkers += (maxWorkers - allocatedWorkers);
  }

  let allocatedManagers = currState.sectors.food.employedManagers + currState.sectors.goods.employedManagers + currState.sectors.capital.employedManagers;
  if (totalDemandManagers > maxManagers && allocatedManagers < maxManagers) {
    currState.sectors.food.employedManagers += (maxManagers - allocatedManagers);
  }

  const totalEmployedWorkers = currState.sectors.food.employedWorkers + currState.sectors.goods.employedWorkers + currState.sectors.capital.employedWorkers;
  const totalEmployedManagers = currState.sectors.food.employedManagers + currState.sectors.goods.employedManagers + currState.sectors.capital.employedManagers;

  currState.households.working.employed = totalEmployedWorkers;
  currState.households.working.unemploymentRate = (maxWorkers - totalEmployedWorkers) / maxWorkers;

  currState.households.middle.employed = totalEmployedManagers;
  currState.households.middle.unemploymentRate = (maxManagers - totalEmployedManagers) / maxManagers;

  // 菲利普斯曲线双向粘性工资更新
  const uW = currState.households.working.unemploymentRate;
  const deltaWageW = uW <= 0.10 ? 0.15 * (0.10 - uW) : -0.05 * (uW - 0.10);
  currState.households.working.wageRate = prevState.households.working.wageRate * Math.min(1.030, Math.max(0.985, 1.0 + deltaWageW));

  const uM = currState.households.middle.unemploymentRate;
  const deltaWageM = uM <= 0.10 ? 0.15 * (0.10 - uM) : -0.05 * (uM - 0.10);
  currState.households.middle.wageRate = prevState.households.middle.wageRate * Math.min(1.030, Math.max(0.985, 1.0 + deltaWageM));

  // ==========================================
  // Step 4: 实际生产与管理协同核算
  // ==========================================
  for (const sid of ['food', 'goods', 'capital'] as const) {
    const s = currState.sectors[sid];
    const reqM = s.employedWorkers / standardRatio[sid];
    if (s.employedWorkers === 0 || s.employedManagers >= reqM) {
      s.managementEfficiency = 1.0;
    } else {
      s.managementEfficiency = Math.min(1.0, Math.max(0.70, 0.70 + 0.30 * (s.employedManagers / reqM)));
    }

    const noise = prngSymmetricNoise(currState.seed, currentMonth, `sector_${sid}_tfp_noise`, 0.015);
    const laborOutput =
      s.employedWorkers *
      baseProductivity[sid] *
      s.managementEfficiency *
      gammaEnergy *
      psiProd *
      (1.0 + noise);

    const grossOutput = Math.min(s.capacityLimit, laborOutput);
    s.actualOutput = sid === 'capital' ? grossOutput : grossOutput * (1.0 - deltaLog);
    s.capacityUtilization = s.capacityLimit > 0 ? grossOutput / s.capacityLimit : 0;
  }

  // ==========================================
  // Step 5: 工资发放、市政转移支付与个税扣缴
  // ==========================================
  const wageRateW = currState.households.working.wageRate;
  const wageRateM = currState.households.middle.wageRate;

  for (const sid of ['food', 'goods', 'capital'] as const) {
    const s = currState.sectors[sid];
    const wageBill = s.employedWorkers * wageRateW + s.employedManagers * wageRateM;
    s.wageBill = wageBill;

    // 若流动资金不足发薪，申请银行短期经营贷
    if (s.cash < wageBill) {
      const wageLoanNeeded = wageBill - s.cash;
      s.loans += wageLoanNeeded;
      s.cash += wageLoanNeeded;
      currState.bank.totalLoans += wageLoanNeeded;
      currState.bank.totalCorporateLoans += wageLoanNeeded;
    }
    s.cash -= wageBill;
  }

  // 居民工薪收入与个税扣缴
  const totalWageW = currState.sectors.food.employedWorkers * wageRateW +
    currState.sectors.goods.employedWorkers * wageRateW +
    currState.sectors.capital.employedWorkers * wageRateW;
  const totalWageM = currState.sectors.food.employedManagers * wageRateM +
    currState.sectors.goods.employedManagers * wageRateM +
    currState.sectors.capital.employedManagers * wageRateM;

  currState.households.working.wageIncome = totalWageW;
  currState.households.middle.wageIncome = totalWageM;

  const baseTax = currState.municipal.baseTaxRate;
  const taxRateW = 0.75 * baseTax;
  const taxRateM = 1.00 * baseTax;

  const taxW = totalWageW * taxRateW;
  const taxM = totalWageM * taxRateM;

  currState.households.working.taxPaid += taxW;
  currState.households.middle.taxPaid += taxM;

  currState.households.working.deposits += (totalWageW - taxW);
  currState.households.middle.deposits += (totalWageM - taxM);

  currState.municipal.taxRevenueWorking = taxW;
  currState.municipal.taxRevenueMiddle = taxM;
  currState.municipal.cashDeposits += (taxW + taxM);

  // 市政民生自动稳定器转移支付
  const overallUnemp = (1000 - (totalEmployedWorkers + totalEmployedManagers)) / 1000;
  const targetTransferBudget = currState.municipal.publicServiceBudgetTarget * currState.municipal.transferShareOfService;
  const actualTransferNeeded = overallUnemp > 0.10
    ? targetTransferBudget * (1.0 + 1.5 * (overallUnemp - 0.10))
    : targetTransferBudget;

  if (currState.municipal.cashDeposits < actualTransferNeeded) {
    const govLoan = actualTransferNeeded - currState.municipal.cashDeposits;
    currState.municipal.debtLoans += govLoan;
    currState.municipal.cashDeposits += govLoan;
    currState.bank.totalLoans += govLoan;
    currState.bank.municipalLoans += govLoan;
  }

  const transferPaid = Math.min(actualTransferNeeded, currState.municipal.cashDeposits);
  currState.municipal.cashDeposits -= transferPaid;
  currState.municipal.transferPayoutTotal = transferPaid;

  const transferW = 0.70 * transferPaid;
  const transferM = 0.30 * transferPaid;
  currState.households.working.transferIncome = transferW;
  currState.households.working.deposits += transferW;
  currState.households.middle.transferIncome = transferM;
  currState.households.middle.deposits += transferM;

  // ==========================================
  // Step 6: 消费与资本品采购需求生成
  // ==========================================
  const priceFood = currState.sectors.food.price;
  const priceGoods = currState.sectors.goods.price;
  const priceCapital = currState.sectors.capital.price;

  // 居民消费预算
  for (const hid of ['working', 'middle', 'capitalist'] as const) {
    const h = currState.households[hid];
    const prevH = prevState.households[hid];
    const baseInc = hid === 'capitalist'
      ? prevH.disposableIncome
      : (h.wageIncome - h.taxPaid + h.transferIncome);

    const effMpc = Math.min(0.95, Math.max(0.10, h.mpc * psiConf));
    const plannedBudget = Math.min(
      0.90 * h.deposits,
      baseInc * effMpc + 0.015 * h.deposits
    );

    h.plannedConsumptionFood = plannedBudget * h.foodShare;
    h.plannedConsumptionGoods = plannedBudget * h.goodsShare;
  }

  // 市政公务采购消费品
  const govtGoodsBudget = Math.min(
    currState.municipal.cashDeposits,
    currState.municipal.publicServiceBudgetTarget * (1.0 - currState.municipal.transferShareOfService)
  );

  // 企业折旧更新与扩产订单
  for (const sid of ['food', 'goods', 'capital'] as const) {
    const s = currState.sectors[sid];
    const prevS = prevState.sectors[sid];
    const depOrder = 0.02 * prevS.capitalStock;
    s.replacementOrderUnits = depOrder;

    let expOrder = 0.0;
    if (s.capacityUtilization > 0.85 && prevS.accountingProfit > 0) {
      expOrder = 0.05 * prevS.capitalStock;
    }
    s.expansionOrderUnits = expOrder;
  }

  // 市政在建基建项目资本品需求
  let govtCapitalDemandUnits = 0;
  for (const pid of ['road_improvement', 'energy_expansion'] as const) {
    const proj = currState.municipal.projects[pid];
    if (proj.status === 'ACTIVE' || proj.status === 'SUSPENDED_NO_FUNDS') {
      const monthlyCost = proj.monthlyCapitalGoodsDemand * priceCapital;
      // 检验资金充足性
      if (currState.municipal.cashDeposits >= monthlyCost || currState.municipal.debtLoans + monthlyCost <= currState.municipal.debtCeiling) {
        proj.status = 'ACTIVE';
        govtCapitalDemandUnits += proj.monthlyCapitalGoodsDemand;
      } else {
        proj.status = 'SUSPENDED_NO_FUNDS';
      }
    }
  }

  // 汇总总需求
  const totalDemandFood =
    (currState.households.working.plannedConsumptionFood +
      currState.households.middle.plannedConsumptionFood +
      currState.households.capitalist.plannedConsumptionFood) /
    priceFood;

  const totalDemandGoods =
    (currState.households.working.plannedConsumptionGoods +
      currState.households.middle.plannedConsumptionGoods +
      currState.households.capitalist.plannedConsumptionGoods +
      govtGoodsBudget) /
    priceGoods;

  const totalDemandCapital =
    currState.sectors.food.replacementOrderUnits +
    currState.sectors.food.expansionOrderUnits +
    currState.sectors.goods.replacementOrderUnits +
    currState.sectors.goods.expansionOrderUnits +
    currState.sectors.capital.replacementOrderUnits +
    currState.sectors.capital.expansionOrderUnits +
    govtCapitalDemandUnits;

  currState.sectors.food.demandUnits = totalDemandFood;
  currState.sectors.goods.demandUnits = totalDemandGoods;
  currState.sectors.capital.demandUnits = totalDemandCapital;

  // ==========================================
  // Step 7: 商品市场供需匹配与配给出清
  // ==========================================
  const availSupplyFood = prevState.sectors.food.inventory + currState.sectors.food.actualOutput;
  const availSupplyGoods = prevState.sectors.goods.inventory + currState.sectors.goods.actualOutput;
  const availSupplyCapital = prevState.sectors.capital.inventory + currState.sectors.capital.actualOutput;

  const salesFood = Math.min(totalDemandFood, availSupplyFood);
  const salesGoods = Math.min(totalDemandGoods, availSupplyGoods);
  const salesCapital = Math.min(totalDemandCapital, availSupplyCapital);

  const fFood = totalDemandFood > 0 ? salesFood / totalDemandFood : 1.0;
  const fGoods = totalDemandGoods > 0 ? salesGoods / totalDemandGoods : 1.0;
  const fCapital = totalDemandCapital > 0 ? salesCapital / totalDemandCapital : 1.0;

  // 实物库存结算（严格非负）
  currState.sectors.food.inventory = Math.max(0, availSupplyFood - salesFood);
  currState.sectors.goods.inventory = Math.max(0, availSupplyGoods - salesGoods);
  currState.sectors.capital.inventory = Math.max(0, availSupplyCapital - salesCapital);

  currState.sectors.food.salesUnits = salesFood;
  currState.sectors.goods.salesUnits = salesGoods;
  currState.sectors.capital.salesUnits = salesCapital;

  currState.sectors.food.unmetDemandUnits = Math.max(0, totalDemandFood - salesFood);
  currState.sectors.goods.unmetDemandUnits = Math.max(0, totalDemandGoods - salesGoods);
  currState.sectors.capital.unmetDemandUnits = Math.max(0, totalDemandCapital - salesCapital);

  // 居民消费支出与强制储蓄结算
  for (const hid of ['working', 'middle', 'capitalist'] as const) {
    const h = currState.households[hid];
    h.actualConsumptionFood = h.plannedConsumptionFood * fFood;
    h.actualConsumptionGoods = h.plannedConsumptionGoods * fGoods;
    const actualTotalSpend = h.actualConsumptionFood + h.actualConsumptionGoods;
    h.forcedSaving = (h.plannedConsumptionFood - h.actualConsumptionFood) + (h.plannedConsumptionGoods - h.actualConsumptionGoods);
    h.deposits -= actualTotalSpend;
  }

  // 市政公务采购支出
  const actualGovGoodsSpend = govtGoodsBudget * fGoods;
  currState.municipal.cashDeposits -= actualGovGoodsSpend;
  currState.municipal.govtGoodsPurchaseActual = actualGovGoodsSpend;

  // 市政基建资本品采购支出与进度推进
  const actualGovCapitalSpend = govtCapitalDemandUnits * fCapital * priceCapital;
  if (currState.municipal.cashDeposits < actualGovCapitalSpend) {
    const loanForCap = actualGovCapitalSpend - currState.municipal.cashDeposits;
    currState.municipal.debtLoans += loanForCap;
    currState.municipal.cashDeposits += loanForCap;
    currState.bank.totalLoans += loanForCap;
    currState.bank.municipalLoans += loanForCap;
  }
  currState.municipal.cashDeposits -= actualGovCapitalSpend;
  currState.municipal.projectCapitalPurchaseActual = actualGovCapitalSpend;

  for (const pid of ['road_improvement', 'energy_expansion'] as const) {
    const proj = currState.municipal.projects[pid];
    if (proj.status === 'ACTIVE') {
      proj.progressedMonths += fCapital;
      if (proj.progressedMonths >= proj.totalRequiredMonths - 1e-6) {
        proj.status = 'COMPLETED';
        proj.permanentBonusApplied = true;
      }
    }
  }

  // 企业资本品采购支出
  for (const sid of ['food', 'goods', 'capital'] as const) {
    const s = currState.sectors[sid];
    const targetCapUnits = s.replacementOrderUnits + s.expansionOrderUnits;
    const purchasedUnits = targetCapUnits * fCapital;
    const capCost = purchasedUnits * priceCapital;
    s.actualCapitalPurchasedUnits = purchasedUnits;
    s.capitalPurchaseCost = capCost;

    if (s.cash < capCost) {
      const loanForEquip = capCost - s.cash;
      s.loans += loanForEquip;
      s.cash += loanForEquip;
      currState.bank.totalLoans += loanForEquip;
      currState.bank.totalCorporateLoans += loanForEquip;
    }
    s.cash -= capCost;
  }

  // 卖方销售收入结算
  currState.sectors.food.revenue = salesFood * priceFood;
  currState.sectors.goods.revenue = salesGoods * priceGoods;
  currState.sectors.capital.revenue = salesCapital * priceCapital;

  currState.sectors.food.cash += currState.sectors.food.revenue;
  currState.sectors.goods.cash += currState.sectors.goods.revenue;
  currState.sectors.capital.cash += currState.sectors.capital.revenue;

  // ==========================================
  // Step 8: 企业成本核算、折旧计提与资本家分红
  // ==========================================
  const loanRate = currState.bank.loanRateMonthly;

  for (const sid of ['food', 'goods', 'capital'] as const) {
    const s = currState.sectors[sid];
    const prevS = prevState.sectors[sid];

    // 更新固定资本存量
    s.depreciationUnits = 0.02 * prevS.capitalStock;
    s.capitalStock = prevS.capitalStock * (1.0 - 0.02) + s.actualCapitalPurchasedUnits;

    // 支付银行贷款利息
    const intPaid = s.loans * loanRate;
    s.interestPaid = intPaid;
    if (s.cash < intPaid) {
      s.loans += (intPaid - s.cash);
      s.cash += (intPaid - s.cash);
      currState.bank.totalLoans += (intPaid - s.cash);
      currState.bank.totalCorporateLoans += (intPaid - s.cash);
    }
    s.cash -= intPaid;

    // 营业利润
    s.accountingProfit = s.revenue - s.wageBill - s.interestPaid - s.depreciationUnits * priceCapital;

    // 80% 可分配利润分红
    const distributableCash = Math.min(
      Math.max(0, s.accountingProfit),
      Math.max(0, s.cash - 0.5 * s.wageBill)
    );
    const divPaid = 0.80 * distributableCash;
    s.dividendsPaid = divPaid;
    s.cash -= divPaid;
  }

  // ==========================================
  // Step 9: 银行存贷结算、市政赤字融资与 SFC 闭环配平
  // ==========================================
  const govInt = currState.municipal.debtLoans * loanRate;
  currState.municipal.interestPaid = govInt;
  if (currState.municipal.cashDeposits < govInt) {
    const loanForGovInt = govInt - currState.municipal.cashDeposits;
    currState.municipal.debtLoans += loanForGovInt;
    currState.municipal.cashDeposits += loanForGovInt;
    currState.bank.totalLoans += loanForGovInt;
    currState.bank.municipalLoans += loanForGovInt;
  }
  currState.municipal.cashDeposits -= govInt;

  // 银行利息汇总
  const totalCorpInt =
    currState.sectors.food.interestPaid +
    currState.sectors.goods.interestPaid +
    currState.sectors.capital.interestPaid;
  currState.bank.interestIncome = totalCorpInt + govInt;

  // 支付居民存款利息
  const depRate = currState.bank.depositRateMonthly;
  let totalHouseholdInt = 0;
  for (const hid of ['working', 'middle', 'capitalist'] as const) {
    const h = currState.households[hid];
    const interest = h.deposits * depRate;
    h.interestIncome = interest;
    h.deposits += interest;
    totalHouseholdInt += interest;
  }
  currState.bank.interestExpense = totalHouseholdInt;

  const bankNetProfit = currState.bank.interestIncome - currState.bank.interestExpense;
  currState.bank.netProfit = bankNetProfit;

  let bankDividends = 0;
  if (bankNetProfit > 0) {
    bankDividends = 0.80 * bankNetProfit;
    currState.bank.equityBuffer += 0.20 * bankNetProfit;
  } else {
    currState.bank.equityBuffer += bankNetProfit; // 亏损吸收
  }
  currState.bank.dividendsPaid = bankDividends;

  // 资本家分红总额入账与代扣分红税
  const totalDivToCapitalist =
    currState.sectors.food.dividendsPaid +
    currState.sectors.goods.dividendsPaid +
    currState.sectors.capital.dividendsPaid +
    bankDividends;

  currState.households.capitalist.dividendIncome = totalDivToCapitalist;
  const taxRateC = Math.min(0.95, 1.25 * baseTax);
  const taxC = totalDivToCapitalist * taxRateC;

  currState.households.capitalist.taxPaid = taxC;
  currState.households.capitalist.deposits += (totalDivToCapitalist - taxC);

  currState.municipal.taxRevenueCapitalist = taxC;
  currState.municipal.cashDeposits += taxC;
  currState.municipal.totalTaxRevenue =
    currState.municipal.taxRevenueWorking +
    currState.municipal.taxRevenueMiddle +
    currState.municipal.taxRevenueCapitalist;

  currState.municipal.fiscalBalance =
    currState.municipal.totalTaxRevenue -
    (currState.municipal.transferPayoutTotal +
      currState.municipal.govtGoodsPurchaseActual +
      currState.municipal.projectCapitalPurchaseActual +
      currState.municipal.interestPaid);

  // 企业与市政自动去杠杆偿还本金
  for (const sid of ['food', 'goods', 'capital'] as const) {
    const s = currState.sectors[sid];
    if (s.cash > 1.5 * s.wageBill && s.loans > 0) {
      const repay = Math.min(s.loans, 0.5 * (s.cash - 1.5 * s.wageBill));
      s.cash -= repay;
      s.loans -= repay;
    }
  }

  if (currState.municipal.cashDeposits > 2.0 * currState.municipal.publicServiceBudgetTarget && currState.municipal.debtLoans > 0) {
    const govRepay = Math.min(
      currState.municipal.debtLoans,
      0.5 * (currState.municipal.cashDeposits - 2.0 * currState.municipal.publicServiceBudgetTarget)
    );
    currState.municipal.cashDeposits -= govRepay;
    currState.municipal.debtLoans -= govRepay;
  }

  // 银行存贷及金库总额对账更新
  currState.bank.totalHouseholdDeposits =
    currState.households.working.deposits +
    currState.households.middle.deposits +
    currState.households.capitalist.deposits;

  currState.bank.totalCorporateDeposits =
    currState.sectors.food.cash +
    currState.sectors.goods.cash +
    currState.sectors.capital.cash;

  currState.bank.municipalDeposits = currState.municipal.cashDeposits;
  currState.bank.totalDeposits =
    currState.bank.totalHouseholdDeposits +
    currState.bank.totalCorporateDeposits +
    currState.bank.municipalDeposits;

  currState.bank.totalCorporateLoans =
    currState.sectors.food.loans +
    currState.sectors.goods.loans +
    currState.sectors.capital.loans;

  currState.bank.municipalLoans = currState.municipal.debtLoans;
  currState.bank.totalLoans =
    currState.bank.totalCorporateLoans + currState.bank.municipalLoans;

  // 金库现金准备 = 吸收存款总额 + 留存资本缓冲 - 发放贷款总额
  currState.bank.reserveCash =
    currState.bank.totalDeposits + currState.bank.equityBuffer - currState.bank.totalLoans;

  // 居民净收支与可支配收入更新
  for (const hid of ['working', 'middle', 'capitalist'] as const) {
    const h = currState.households[hid];
    h.disposableIncome = h.wageIncome + h.dividendIncome + h.transferIncome + h.interestIncome - h.taxPaid;
    h.netSavingFlow = h.disposableIncome - (h.actualConsumptionFood + h.actualConsumptionGoods);
  }

  // 执行 SFC 严格闭环配平断言
  const auditResult = assertSfcBalance(prevState, currState);
  currState.sfcAudit = auditResult;

  // ==========================================
  // Step 10: 宏观统计指标汇总与可追溯事件生成
  // ==========================================
  currState.metrics = calculateMacroMetrics(
    prevState,
    currState.households,
    currState.sectors,
    currState.municipal,
    history,
    currentMonth
  );

  currState.visualState = updateCityVisualState(prevState, currState);
  currState.events = generateMonthlyEvents(prevState, currState);

  return currState;
}
