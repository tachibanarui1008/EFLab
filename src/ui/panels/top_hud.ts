/**
 * EFLab Alpha 0.1 - 顶部宏观指标看板格式化器 (Top HUD Formatter)
 * 严格遵循 docs/specs/05_UI_Panels_Lab_三大面板与对照实验室.md
 */

import type { SimulationState } from '../../core/prng/types.js';

export interface TopHudViewData {
  monthText: string;
  seedText: string;
  sfcStatusBadge: string;
  realGdpText: string;
  realGdpYoYText: string;
  cpiText: string;
  cpiYoYText: string;
  unemploymentText: string;
  municipalFinanceText: string;
  bankLdrText: string;
  prosperityText: string;
}

export function formatTopHud(state: SimulationState): TopHudViewData {
  const m = state.month;
  const metrics = state.metrics;
  const mun = state.municipal;
  const bank = state.bank;

  // 1. 同比指标 < 12 个月严格保护显示 "数据不足"
  const gdpYoYText =
    metrics.gdpYoY === null
      ? '数据不足 (需满12个月)'
      : `${metrics.gdpYoY >= 0 ? '+' : ''}${(metrics.gdpYoY * 100).toFixed(1)}%`;

  const cpiYoYText =
    metrics.inflationYoY === null
      ? '数据不足 (需满12个月)'
      : `${metrics.inflationYoY >= 0 ? '+' : ''}${(metrics.inflationYoY * 100).toFixed(1)}%`;

  const ldr = bank.totalDeposits > 0 ? (bank.totalLoans / bank.totalDeposits) * 100 : 0;

  return {
    monthText: `第 ${m} / 60 月`,
    seedText: `Seed: #${state.seed}`,
    sfcStatusBadge: state.sfcAudit.passed ? 'SFC 闭环守恒 ✓' : '⚠️ SFC 异常',
    realGdpText: `${metrics.realGdp.toFixed(1)} k`,
    realGdpYoYText: gdpYoYText,
    cpiText: `${metrics.cpi.toFixed(1)}`,
    cpiYoYText: cpiYoYText,
    unemploymentText: `${(metrics.overallUnemploymentRate * 100).toFixed(1)}% (工 ${(state.households.working.unemploymentRate * 100).toFixed(1)}% / 管 ${(state.households.middle.unemploymentRate * 100).toFixed(1)}%)`,
    municipalFinanceText: `存款 ${mun.cashDeposits.toFixed(1)}k | 债务 ${mun.debtLoans.toFixed(1)}/${mun.debtCeiling.toFixed(0)}k | ${mun.fiscalBalance >= 0 ? '+' : ''}${mun.fiscalBalance.toFixed(1)}k`,
    bankLdrText: `存 ${bank.totalDeposits.toFixed(1)}k | 贷 ${bank.totalLoans.toFixed(1)}k (${ldr.toFixed(1)}%)`,
    prosperityText: `${metrics.prosperityIndex.toFixed(1)} / 100`,
  };
}
