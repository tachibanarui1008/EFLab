/**
 * EFLab Alpha 0.1 - 抗干扰无状态纯函数伪随机数生成器 (Hash-Based PRNG)
 * 严格遵循 docs/specs/01_Data_Contract_数据契约与PRNG规范.md
 * 
 * 核心保证：
 * 1. 纯函数：不保留任何全局状态或计数器。
 * 2. 确定性：相同 (seed, month, variableId) 在任何平台、任何调用顺序下结果比特级一致。
 * 3. 隔离性：干预组与基准组调用次数不同时，随机序列绝不发生偏移与错位。
 * 4. 严禁调用原生 Math 随机函数。
 */

/**
 * 确定性生成 [0, 1) 区间的双精度浮点数
 */
export function prngUniform01(seed: number, month: number, variableId: string): number {
  const key = `${seed >>> 0}:${month | 0}:${variableId}`;
  
  // 1. FNV-1a 32-bit Hash
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }

  // 2. MurmurHash3 / Mulberry32 Avalanche Finalizer
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;

  // 映射到 [0, 1)
  return (h >>> 0) / 4294967296;
}

/**
 * 确定性生成 [min, max] 闭区间均匀分布浮点数
 */
export function prngRange(
  seed: number,
  month: number,
  variableId: string,
  min: number,
  max: number
): number {
  if (min === max) return min;
  if (min > max) {
    const tmp = min;
    min = max;
    max = tmp;
  }
  return min + (max - min) * prngUniform01(seed, month, variableId);
}

/**
 * 确定性生成以 0 为中心、范围在 [-amplitude, +amplitude] 的对称微扰动
 */
export function prngSymmetricNoise(
  seed: number,
  month: number,
  variableId: string,
  amplitude: number
): number {
  return prngRange(seed, month, variableId, -amplitude, amplitude);
}
