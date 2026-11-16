/**
 * EFLab Alpha 0.1 - SFC 存量-流量一致性闭环核验器 (Stock-Flow Consistency Auditor)
 * 严格遵循 docs/specs/02_Economic_Engine_月度经济引擎与SFC核算.md
 */

import type { SimulationState, SfcAuditResult } from '../prng/types.js';

export class SfcBalanceError extends Error {
  constructor(public readonly auditResult: SfcAuditResult) {
    super(
      `[SFC Balance Violation at Month ${auditResult.month}] Max discrepancy: ${auditResult.maxAbsDiscrepancy.toExponential(4)}. Details:\n${auditResult.details.join('\n')}`
    );
    this.name = 'SfcBalanceError';
  }
}

/**
 * 严格核验月度前后两个快照之间的存量-流量一致性与资金闭环守恒
 */
export function assertSfcBalance(
  prevState: SimulationState,
  currState: SimulationState,
  tolerance: number = 1e-6
): SfcAuditResult {
  const details: string[] = [];
  let maxAbsDiscrepancy = 0;

  // 1. 恒等式 B：银行资产负债与现金池恒等式 (Bank Balance Sheet Conservation)
  // 银行生息资产 + 金库现金准备 = 吸收存款总额 + 银行留存资本缓冲池
  const bankAssets = currState.bank.totalLoans + currState.bank.reserveCash;
  const bankLiabAndEquity = currState.bank.totalDeposits + currState.bank.equityBuffer;
  const moneyPoolConservationError = Math.abs(bankAssets - bankLiabAndEquity);
  maxAbsDiscrepancy = Math.max(maxAbsDiscrepancy, moneyPoolConservationError);

  if (moneyPoolConservationError > tolerance) {
    details.push(
      `Bank balance sheet mismatch: Assets (${bankAssets.toFixed(4)}) - (Liab+Equity) (${bankLiabAndEquity.toFixed(4)}) = ${moneyPoolConservationError.toExponential(4)}`
    );
  }

  // 校验银行总存款与各部门存款分项之和的一致性
  const sumHouseholdDeposits =
    currState.households.working.deposits +
    currState.households.middle.deposits +
    currState.households.capitalist.deposits;
  const householdDepError = Math.abs(sumHouseholdDeposits - currState.bank.totalHouseholdDeposits);
  maxAbsDiscrepancy = Math.max(maxAbsDiscrepancy, householdDepError);
  if (householdDepError > tolerance) {
    details.push(
      `Household deposits sum mismatch: Sum (${sumHouseholdDeposits.toFixed(4)}) vs Bank.totalHouseholdDeposits (${currState.bank.totalHouseholdDeposits.toFixed(4)})`
    );
  }

  const sumCorporateDeposits =
    currState.sectors.food.cash +
    currState.sectors.goods.cash +
    currState.sectors.capital.cash;
  const corporateDepError = Math.abs(sumCorporateDeposits - currState.bank.totalCorporateDeposits);
  maxAbsDiscrepancy = Math.max(maxAbsDiscrepancy, corporateDepError);
  if (corporateDepError > tolerance) {
    details.push(
      `Corporate deposits sum mismatch: Sum (${sumCorporateDeposits.toFixed(4)}) vs Bank.totalCorporateDeposits (${currState.bank.totalCorporateDeposits.toFixed(4)})`
    );
  }

  const sumCorporateLoans =
    currState.sectors.food.loans +
    currState.sectors.goods.loans +
    currState.sectors.capital.loans;
  const corporateLoanError = Math.abs(sumCorporateLoans - currState.bank.totalCorporateLoans);
  maxAbsDiscrepancy = Math.max(maxAbsDiscrepancy, corporateLoanError);
  if (corporateLoanError > tolerance) {
    details.push(
      `Corporate loans sum mismatch: Sum (${sumCorporateLoans.toFixed(4)}) vs Bank.totalCorporateLoans (${currState.bank.totalCorporateLoans.toFixed(4)})`
    );
  }

  // 2. 恒等式 A：部门净金融资产变化 = 当月净收支流量 (Stock Change = Net Flow Identity)
  let flowIdentityError = 0;

  // A1: 居民部门各阶层
  for (const hid of ['working', 'middle', 'capitalist'] as const) {
    const prevH = prevState.households[hid];
    const currH = currState.households[hid];
    const deltaDeposits = currH.deposits - prevH.deposits;
    const netFlow =
      currH.wageIncome +
      currH.dividendIncome +
      currH.transferIncome +
      currH.interestIncome -
      currH.taxPaid -
      (currH.actualConsumptionFood + currH.actualConsumptionGoods);
    const diff = Math.abs(deltaDeposits - netFlow);
    flowIdentityError = Math.max(flowIdentityError, diff);
    maxAbsDiscrepancy = Math.max(maxAbsDiscrepancy, diff);
    if (diff > tolerance) {
      details.push(
        `Household '${hid}' flow mismatch: ΔDeposits (${deltaDeposits.toFixed(4)}) vs NetFlow (${netFlow.toFixed(4)}), diff: ${diff.toExponential(4)}`
      );
    }
  }

  // A2: 企业部门三行业
  for (const sid of ['food', 'goods', 'capital'] as const) {
    const prevS = prevState.sectors[sid];
    const currS = currState.sectors[sid];
    const deltaNetFA = (currS.cash - currS.loans) - (prevS.cash - prevS.loans);
    const netFlow =
      currS.revenue -
      currS.wageBill -
      currS.interestPaid -
      currS.capitalPurchaseCost -
      currS.dividendsPaid;
    const diff = Math.abs(deltaNetFA - netFlow);
    flowIdentityError = Math.max(flowIdentityError, diff);
    maxAbsDiscrepancy = Math.max(maxAbsDiscrepancy, diff);
    if (diff > tolerance) {
      details.push(
        `Sector '${sid}' flow mismatch: ΔNetFA (${deltaNetFA.toFixed(4)}) vs NetFlow (${netFlow.toFixed(4)}), diff: ${diff.toExponential(4)}`
      );
    }
  }

  // A3: 市政厅部门
  const prevM = prevState.municipal;
  const currM = currState.municipal;
  const deltaGovNetFA = (currM.cashDeposits - currM.debtLoans) - (prevM.cashDeposits - prevM.debtLoans);
  const govNetFlow =
    currM.totalTaxRevenue -
    (currM.transferPayoutTotal +
      currM.govtGoodsPurchaseActual +
      currM.projectCapitalPurchaseActual +
      currM.interestPaid);
  const govDiff = Math.abs(deltaGovNetFA - govNetFlow);
  flowIdentityError = Math.max(flowIdentityError, govDiff);
  maxAbsDiscrepancy = Math.max(maxAbsDiscrepancy, govDiff);
  if (govDiff > tolerance) {
    details.push(
      `Municipal flow mismatch: ΔNetFA (${deltaGovNetFA.toFixed(4)}) vs NetFlow (${govNetFlow.toFixed(4)}), diff: ${govDiff.toExponential(4)}`
    );
  }

  // A4: 基础银行留存权益
  const prevB = prevState.bank;
  const currB = currState.bank;
  const deltaBankEquity = currB.equityBuffer - prevB.equityBuffer;
  const bankNetRetainedFlow = currB.netProfit - currB.dividendsPaid;
  const bankDiff = Math.abs(deltaBankEquity - bankNetRetainedFlow);
  flowIdentityError = Math.max(flowIdentityError, bankDiff);
  maxAbsDiscrepancy = Math.max(maxAbsDiscrepancy, bankDiff);
  if (bankDiff > tolerance) {
    details.push(
      `Bank equity flow mismatch: ΔEquity (${deltaBankEquity.toFixed(4)}) vs NetRetained (${bankNetRetainedFlow.toFixed(4)}), diff: ${bankDiff.toExponential(4)}`
    );
  }

  // 3. 恒等式 C & D：实物库存与现金非负断言 (Non-Negative Physical Stock & Deposits)
  let minInventoryAcrossSectors = Number.POSITIVE_INFINITY;
  for (const sid of ['food', 'goods', 'capital'] as const) {
    const inv = currState.sectors[sid].inventory;
    minInventoryAcrossSectors = Math.min(minInventoryAcrossSectors, inv);
    if (inv < -tolerance) {
      details.push(`Sector '${sid}' negative inventory: ${inv.toFixed(6)} < 0`);
    }
    if (currState.sectors[sid].cash < -tolerance) {
      details.push(`Sector '${sid}' negative cash: ${currState.sectors[sid].cash.toFixed(6)} < 0`);
    }
  }

  for (const hid of ['working', 'middle', 'capitalist'] as const) {
    if (currState.households[hid].deposits < -tolerance) {
      details.push(`Household '${hid}' negative deposits: ${currState.households[hid].deposits.toFixed(6)} < 0`);
    }
  }

  const passed = details.length === 0 && maxAbsDiscrepancy <= tolerance;
  const result: SfcAuditResult = {
    month: currState.month,
    passed,
    maxAbsDiscrepancy,
    moneyPoolConservationError,
    flowIdentityError,
    minInventoryAcrossSectors,
    details: details.length > 0 ? details : ['SFC Stock-Flow & Zero Blackhole assertions passed.'],
  };

  if (!passed) {
    throw new SfcBalanceError(result);
  }

  return result;
}
