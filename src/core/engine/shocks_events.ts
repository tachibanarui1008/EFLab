/**
 * EFLab Alpha 0.1 - 可追溯事件归因引擎 (Traceable Event Attribution Engine)
 * 严格遵循 docs/specs/03_Policy_Project_Event_政策项目与事件归因.md
 */

import type {
  SimulationState,
  TraceableEventCard,
  ProjectId,
  SectorId,
} from '../prng/types.js';

export function generateMonthlyEvents(
  prevState: SimulationState,
  currState: SimulationState
): TraceableEventCard[] {
  const events: TraceableEventCard[] = [];
  const m = currState.month;

  // 1. 确定性机制触发：政策生效 (POLICY_ACTIVE)
  if (prevState.municipal.baseTaxRate !== currState.municipal.baseTaxRate) {
    const tau = currState.municipal.baseTaxRate;
    events.push({
      id: `evt_tax_${m}`,
      month: m,
      category: 'POLICY_ACTIVE',
      attributionType: 'DETERMINISTIC_MECHANISM',
      title: '基准个人所得税率调整正式生效',
      description: `市政基准税率调整为 ${(tau * 100).toFixed(1)}% 正式生效。三阶层折算实际税率：底层工薪 ${(tau * 0.75 * 100).toFixed(1)}%、中层工薪 ${(tau * 1.00 * 100).toFixed(1)}%、资本家分红 ${(tau * 1.25 * 100).toFixed(1)}%。`,
      relatedMetrics: ['baseTaxRate', 'totalTaxRevenue', 'disposableIncome'],
    });
  }

  if (prevState.municipal.publicServiceBudgetTarget !== currState.municipal.publicServiceBudgetTarget) {
    events.push({
      id: `evt_budget_${m}`,
      month: m,
      category: 'POLICY_ACTIVE',
      attributionType: 'DETERMINISTIC_MECHANISM',
      title: '公共服务月度预算调整正式生效',
      description: `市政月度公共服务预算调整为 ${currState.municipal.publicServiceBudgetTarget.toFixed(1)} k。其中 50% 划拨民生补贴，50% 用于公务消费品采购。`,
      relatedMetrics: ['publicServiceBudgetTarget', 'transferPayoutTotal', 'govtGoodsPurchaseActual'],
    });
  }

  // 2. 确定性机制触发：外生冲击激活与解除 (SHOCK_TRIGGER)
  for (const sid of ['confidence_drop', 'productivity_drop'] as const) {
    const prevShock = prevState.shocks[sid];
    const currShock = currState.shocks[sid];

    const isShockJustStarted =
      (!prevShock.active && currShock.active) ||
      (currShock.active && currShock.startMonth === m);

    if (isShockJustStarted) {
      events.push({
        id: `evt_shock_start_${sid}_${m}`,
        month: m,
        category: 'SHOCK_TRIGGER',
        attributionType: 'DETERMINISTIC_MECHANISM',
        title: `【外生冲击】${currShock.name} 爆发`,
        description: `全城遭遇 ${currShock.name}，预计持续 ${currShock.remainingMonths} 个月，强度为 -${(currShock.magnitude * 100).toFixed(0)}%。`,
        relatedMetrics: [sid, 'realGdp', 'cpi'],
      });
    } else if (prevShock.active && !currShock.active) {
      events.push({
        id: `evt_shock_end_${sid}_${m}`,
        month: m,
        category: 'SHOCK_TRIGGER',
        attributionType: 'DETERMINISTIC_MECHANISM',
        title: `【冲击解除】${currShock.name} 已自然消退`,
        description: `${currShock.name} 持续周期已满，市场预期与生产环境恢复基准常态。`,
        relatedMetrics: [sid, 'realGdp', 'cpi'],
      });
    }
  }

  // 3. 确定性机制触发：基建项目状态机变更 (PROJECT_STATUS)
  for (const pid of ['road_improvement', 'energy_expansion'] as const) {
    const prevP = prevState.municipal.projects[pid];
    const currP = currState.municipal.projects[pid];

    if (prevP.status === 'IDLE' && currP.status === 'ACTIVE') {
      events.push({
        id: `evt_proj_start_${pid}_${m}`,
        month: m,
        category: 'PROJECT_STATUS',
        attributionType: 'DETERMINISTIC_MECHANISM',
        title: `【基建开工】${currP.name} 正式立项`,
        description: `市政厅启动 ${currP.name}，计划建设工期 ${currP.totalRequiredMonths} 个月，每月将采购 ${currP.monthlyCapitalGoodsDemand} 件资本品。`,
        relatedMetrics: ['capitalDemand', 'debtLoans'],
      });
    } else if (prevP.status !== 'SUSPENDED_NO_FUNDS' && currP.status === 'SUSPENDED_NO_FUNDS') {
      events.push({
        id: `evt_proj_suspended_${pid}_${m}`,
        month: m,
        category: 'PROJECT_STATUS',
        attributionType: 'DETERMINISTIC_MECHANISM',
        title: `【缺钱停工】${currP.name} 被迫暂停`,
        description: `市政财政赤字触及举债上限且金库现金断裂，${currP.name} 暂停施工并停止资本品采购，待财政恢复后方可续建。`,
        relatedMetrics: ['debtLoans', 'debtCeiling', 'projectCapitalPurchaseActual'],
      });
    } else if (prevP.status === 'SUSPENDED_NO_FUNDS' && currP.status === 'ACTIVE') {
      events.push({
        id: `evt_proj_resumed_${pid}_${m}`,
        month: m,
        category: 'PROJECT_STATUS',
        attributionType: 'DETERMINISTIC_MECHANISM',
        title: `【资金恢复】${currP.name} 恢复施工`,
        description: `市政财政状况好转，${currP.name} 重新恢复资本品采购并推进工程进度。`,
        relatedMetrics: ['cashDeposits', 'projectCapitalPurchaseActual'],
      });
    } else if (prevP.status !== 'COMPLETED' && currP.status === 'COMPLETED') {
      const bonusText =
        pid === 'road_improvement'
          ? '全城商品物流损耗率从 3.0% 永久降至 0.5%！'
          : '全城三行业产能上限与劳动生产率永久提升 8.0%！';
      events.push({
        id: `evt_proj_completed_${pid}_${m}`,
        month: m,
        category: 'PROJECT_STATUS',
        attributionType: 'DETERMINISTIC_MECHANISM',
        title: `【工程竣工】${currP.name} 圆满完工`,
        description: `${currP.name} 历经全部工期顺利竣工！永久增益已激活：${bonusText}`,
        relatedMetrics: ['logisticsLossRate', 'energyEfficiencyBonus', 'realGdp'],
      });
    }
  }

  // 4. 确定性机制触发：经济运行警报与机制反馈 (MECHANISM_ALERT)
  for (const sid of ['food', 'goods', 'capital'] as const) {
    const s = currState.sectors[sid];
    // 管理短缺协同惩罚
    if (s.managementEfficiency < 0.98) {
      events.push({
        id: `evt_mgmt_penalty_${sid}_${m}`,
        month: m,
        category: 'MECHANISM_ALERT',
        attributionType: 'DETERMINISTIC_MECHANISM',
        title: `【管理短缺】${s.name} 协同效率受损`,
        description: `因中层管理人才短缺（在岗 ${s.employedManagers} 人 < 标准配比所需 ${(s.employedWorkers / s.requiredWorkerPerManager).toFixed(1)} 人），${s.name} 管理协同效率系数降至 ${(s.managementEfficiency * 100).toFixed(1)}%。`,
        relatedMetrics: ['managementEfficiency', 'employedManagers'],
      });
    }

    // 高景气扩产触发
    if (s.expansionOrderUnits > 0) {
      events.push({
        id: `evt_expansion_${sid}_${m}`,
        month: m,
        category: 'MECHANISM_ALERT',
        attributionType: 'DETERMINISTIC_MECHANISM',
        title: `【高景气扩产】${s.name} 触发净扩产采购`,
        description: `${s.name} 产能利用率达到 ${(s.capacityUtilization * 100).toFixed(1)}% 且保持盈利，当月额外下达 ${s.expansionOrderUnits.toFixed(1)} 件（固定资本的 5.0%）净扩产资本品采购订单。`,
        relatedMetrics: ['capacityUtilization', 'expansionOrderUnits'],
      });
    }

    // 供不应求配给出清
    if (s.demandUnits > 0 && s.salesUnits < s.demandUnits * 0.95) {
      events.push({
        id: `evt_rationing_${sid}_${m}`,
        month: m,
        category: 'MECHANISM_ALERT',
        attributionType: 'DETERMINISTIC_MECHANISM',
        title: `【供不应求配给】${s.name} 出现缺货出清`,
        description: `${s.name} 当月市场总需求 ${s.demandUnits.toFixed(1)} 件超过可用库存及当期产出，实际成交率仅为 ${((s.salesUnits / s.demandUnits) * 100).toFixed(1)}%，未满足需求转化为买方强制储蓄或投资推迟。`,
        relatedMetrics: ['unmetDemandUnits', 'inventory'],
      });
    }
  }

  // 5. 相关变化观察：宏观总量显著伴随异动 (CORRELATED_OBSERVATION)
  if (prevState.month > 0) {
    const gdpChange = (currState.metrics.realGdp - prevState.metrics.realGdp) / Math.max(1, prevState.metrics.realGdp);
    const unempChange = currState.metrics.overallUnemploymentRate - prevState.metrics.overallUnemploymentRate;
    const cpiChange = (currState.metrics.cpi - prevState.metrics.cpi) / Math.max(1, prevState.metrics.cpi);

    if (Math.abs(gdpChange) > 0.03 || Math.abs(unempChange) > 0.015 || Math.abs(cpiChange) > 0.015) {
      events.push({
        id: `evt_macro_obs_${m}`,
        month: m,
        category: 'CORRELATED_CHANGE',
        attributionType: 'CORRELATED_OBSERVATION',
        title: '【宏观异动观察】城邦经济指标波动',
        description: `本月实际 GDP 环比变动 ${(gdpChange * 100).toFixed(1)}%，综合失业率环比变动 ${(unempChange * 100).toFixed(1)} 个百分点，物价指数环比变动 ${(cpiChange * 100).toFixed(1)}%。（注：宏观总量为多部门存量-流量网络耦合结果，属相关变化观察，严禁归为单一因果定论）`,
        relatedMetrics: ['realGdp', 'overallUnemploymentRate', 'cpi'],
      });
    }
  }

  return events;
}
