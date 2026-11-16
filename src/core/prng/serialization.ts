/**
 * EFLab Alpha 0.1 - 存档序列化与深拷贝工具 (Serialization & Deep Clone)
 * 严格遵循 docs/specs/01_Data_Contract_数据契约与PRNG规范.md
 */

import type { SimulationState } from './types.js';

export interface SaveArchivePayload {
  schemaVersion: 'EFLab-Archive-v1';
  exportedAtIso: string; // 仅作元数据记录，绝不参与任何引擎计算
  seed: number;
  currentMonth: number;
  history: SimulationState[]; // 从 month = 0 到 currentMonth 的完整快照数组
}

/**
 * 深度克隆单一月度状态快照，确保沙盒之间没有任何共享对象引用
 */
export function cloneSimulationState(state: SimulationState): SimulationState {
  if (typeof structuredClone === 'function') {
    return structuredClone(state);
  }
  return JSON.parse(JSON.stringify(state)) as SimulationState;
}

/**
 * 将月度历史序列导出为标准化 JSON 字符串
 */
export function serializeArchive(history: SimulationState[]): string {
  if (!history || history.length === 0) {
    throw new Error('Cannot serialize empty simulation history');
  }
  const currentMonth = history[history.length - 1]!.month;
  const seed = history[0]!.seed;

  const payload: SaveArchivePayload = {
    schemaVersion: 'EFLab-Archive-v1',
    exportedAtIso: new Date().toISOString(),
    seed,
    currentMonth,
    history,
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * 解析并校验导入的 JSON 存档字符串
 */
export function deserializeArchive(jsonStr: string): SaveArchivePayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    throw new Error(`Invalid JSON archive string: ${(err as Error).message}`);
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid archive payload: expected an object');
  }

  const payload = parsed as Partial<SaveArchivePayload>;

  if (payload.schemaVersion !== 'EFLab-Archive-v1') {
    throw new Error(
      `Unsupported archive schema version: ${String(payload.schemaVersion)}. Expected 'EFLab-Archive-v1'`
    );
  }

  if (typeof payload.seed !== 'number' || !Number.isInteger(payload.seed)) {
    throw new Error('Invalid archive seed: must be an integer');
  }

  if (typeof payload.currentMonth !== 'number' || payload.currentMonth < 0) {
    throw new Error('Invalid archive currentMonth: must be non-negative integer');
  }

  if (!Array.isArray(payload.history) || payload.history.length === 0) {
    throw new Error('Invalid archive history: must be a non-empty array');
  }

  if (payload.history[0]?.month !== 0) {
    throw new Error('Invalid archive history: history[0] must have month === 0');
  }

  // 校验每一期快照的基本完整性与 SFC 通过状态
  for (let i = 0; i < payload.history.length; i++) {
    const snap = payload.history[i];
    if (!snap || snap.month !== i) {
      throw new Error(`Archive sequence error: expected snapshot month ${i}, got ${snap?.month}`);
    }
    if (!snap.sfcAudit || snap.sfcAudit.passed !== true) {
      throw new Error(`Archive corruption: snapshot month ${i} failed SFC audit`);
    }
  }

  return payload as SaveArchivePayload;
}
