/**
 * EFLab Alpha 0.1 - 双轨对照实验室沙盒管理器 (Dual-Track Comparison Lab)
 * 严格遵循 docs/specs/05_UI_Panels_Lab_三大面板与对照实验室.md
 */

import type { SimulationState } from '../../core/prng/types.js';
import { cloneSimulationState } from '../../core/prng/serialization.js';
import { stepMonth } from '../../core/engine/monthly_pipeline.js';
import { prngSymmetricNoise } from '../../core/prng/hash_prng.js';

export interface TreatmentEffectDelta {
  month: number;
  deltaRealGdp: number;
  deltaRealGdpPct: number;
  deltaCumulativeRealGdp: number;
  deltaUnemploymentPercentagePoints: number;
  deltaCpi: number;
  deltaWorkingConsumption: number;
  deltaMunicipalDebt: number;
  prngNoiseError: number; // 必须为 0.000000
}

export class ComparisonLab {
  private baselineHistory: SimulationState[] = [];
  private interventionHistory: SimulationState[] = [];

  constructor(initialState: SimulationState) {
    this.reset(initialState);
  }

  /**
   * 重置实验室沙盒，确保基准组与干预组具有完全独立的内存对象
   */
  public reset(initialState: SimulationState): void {
    this.baselineHistory = [cloneSimulationState(initialState)];
    this.interventionHistory = [cloneSimulationState(initialState)];
  }

  public getBaselineCurrent(): SimulationState {
    return this.baselineHistory[this.baselineHistory.length - 1]!;
  }

  public getInterventionCurrent(): SimulationState {
    return this.interventionHistory[this.interventionHistory.length - 1]!;
  }

  public getBaselineHistory(): SimulationState[] {
    return this.baselineHistory;
  }

  public getInterventionHistory(): SimulationState[] {
    return this.interventionHistory;
  }

  /**
   * 双轨同步推进 1 个月
   */
  public stepSynchronized(): void {
    const baseCurr = this.getBaselineCurrent();
    const intervCurr = this.getInterventionCurrent();

    if (baseCurr.month >= 60 || intervCurr.month >= 60) {
      return;
    }

    const nextBase = stepMonth(baseCurr, this.baselineHistory);
    const nextInterv = stepMonth(intervCurr, this.interventionHistory);

    this.baselineHistory.push(nextBase);
    this.interventionHistory.push(nextInterv);
  }

  /**
   * 双轨同步快进至第 60 月
   */
  public fastForwardToMonth60(): void {
    while (
      this.getBaselineCurrent().month < 60 &&
      this.getInterventionCurrent().month < 60
    ) {
      this.stepSynchronized();
    }
  }

  /**
   * 计算当前月份的净政策处理效应差值 (Δ = Intervention - Baseline)
   */
  public calculateCurrentDelta(): TreatmentEffectDelta {
    const base = this.getBaselineCurrent();
    const interv = this.getInterventionCurrent();
    const m = base.month;

    const deltaRealGdp = interv.metrics.realGdp - base.metrics.realGdp;
    const deltaRealGdpPct =
      base.metrics.realGdp > 0 ? (deltaRealGdp / base.metrics.realGdp) * 100 : 0;

    let cumBaseGdp = 0;
    let cumIntervGdp = 0;
    for (let i = 0; i <= m; i++) {
      cumBaseGdp += this.baselineHistory[i]?.metrics.realGdp ?? 0;
      cumIntervGdp += this.interventionHistory[i]?.metrics.realGdp ?? 0;
    }
    const deltaCumulativeRealGdp = cumIntervGdp - cumBaseGdp;

    const deltaUnemploymentPercentagePoints =
      (interv.metrics.overallUnemploymentRate - base.metrics.overallUnemploymentRate) * 100;

    const deltaCpi = interv.metrics.cpi - base.metrics.cpi;

    const deltaWorkingConsumption =
      (interv.households.working.actualConsumptionFood + interv.households.working.actualConsumptionGoods) -
      (base.households.working.actualConsumptionFood + base.households.working.actualConsumptionGoods);

    const deltaMunicipalDebt = interv.municipal.debtLoans - base.municipal.debtLoans;

    // 核验当月 PRNG 纯函数噪音是否 100% 同步比特级一致
    const baseNoise = prngSymmetricNoise(base.seed, m, 'sector_food_tfp_noise', 0.015);
    const intervNoise = prngSymmetricNoise(interv.seed, m, 'sector_food_tfp_noise', 0.015);
    const prngNoiseError = Math.abs(baseNoise - intervNoise);

    return {
      month: m,
      deltaRealGdp,
      deltaRealGdpPct,
      deltaCumulativeRealGdp,
      deltaUnemploymentPercentagePoints,
      deltaCpi,
      deltaWorkingConsumption,
      deltaMunicipalDebt,
      prngNoiseError,
    };
  }
}
