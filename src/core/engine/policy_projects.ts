/**
 * EFLab Alpha 0.1 - 政策控制、基建项目与外生冲击控制器
 * 严格遵循 docs/specs/03_Policy_Project_Event_政策项目与事件归因.md
 */

import type { SimulationState, ProjectId, ShockId } from '../prng/types.js';

/**
 * 设定待生效基准个人所得税率 (将在下一月 Step 1 正式激活)
 * 范围: [0.05, 0.50]
 */
export function setPendingBaseTaxRate(state: SimulationState, rate: number): void {
  const clamped = Math.min(0.50, Math.max(0.05, rate));
  state.municipal.pendingBaseTaxRate = clamped;
}

/**
 * 设定待生效月度公共服务预算 (将在下一月 Step 1 正式激活)
 * 范围: [60.0, 360.0] k
 */
export function setPendingPublicServiceBudget(state: SimulationState, budget: number): void {
  const clamped = Math.min(360.0, Math.max(60.0, budget));
  state.municipal.pendingPublicServiceBudget = clamped;
}

/**
 * 启动市政公共基建项目
 */
export function startPublicProject(state: SimulationState, projectId: ProjectId): boolean {
  const proj = state.municipal.projects[projectId];
  if (!proj) return false;
  if (proj.status === 'COMPLETED') return false; // 已竣工无法重新启动

  proj.status = 'ACTIVE';
  return true;
}

/**
 * 暂停或取消市政基建项目
 */
export function pausePublicProject(state: SimulationState, projectId: ProjectId): boolean {
  const proj = state.municipal.projects[projectId];
  if (!proj) return false;
  if (proj.status === 'COMPLETED') return false;

  proj.status = 'IDLE';
  return true;
}

/**
 * 注入外生冲击
 */
export function triggerShock(
  state: SimulationState,
  shockId: ShockId,
  durationMonths: number = 6,
  magnitude?: number
): boolean {
  const shock = state.shocks[shockId];
  if (!shock) return false;

  shock.active = true;
  shock.startMonth = state.month + 1;
  shock.remainingMonths = durationMonths;
  if (typeof magnitude === 'number') {
    shock.magnitude = magnitude;
  }
  return true;
}

/**
 * 手动解除外生冲击
 */
export function clearShock(state: SimulationState, shockId: ShockId): boolean {
  const shock = state.shocks[shockId];
  if (!shock) return false;

  shock.active = false;
  shock.remainingMonths = 0;
  return true;
}
