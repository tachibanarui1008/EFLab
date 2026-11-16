# Stage 1 -> Stage 2：数据契约与 PRNG 交接至月度经济引擎

- **交出方 (From Agent)**：`Agent-01 (Architect)`
- **接收方 (To Agent)**：`Agent-02 (Economist)`
- **完成日期 (Timestamp)**：`2026-11-07 17:00`
- **当前状态 (Status)**：`READY_FOR_HANDOFF`

---

## 1. 本阶段交付文件清单 (Deliverables)
- `src/core/prng/types.ts`：全局数据契约，包含四大部门、三阶层、三行业、政策项目、外生冲击、宏观指标、事件归因、防闪烁滞回状态与 SFC 审计快照完整 TypeScript 定义。
- `src/core/prng/hash_prng.ts`：基于 FNV-1a + MurmurHash3 的抗干扰无状态确定性 Hash PRNG（`prngUniform01`、`prngRange`、`prngSymmetricNoise`），全仓零 `Math.random()`。
- `src/core/prng/initial_state.ts`：第 0 月 SFC 稳态配平初始状态工厂（`createInitialState`），配平误差为严格的 `0.000000k`。
- `src/core/prng/serialization.ts`：双轨沙盒物理隔离深拷贝（`cloneSimulationState`）及 JSON 存档导入导出工具（`serializeArchive`、`deserializeArchive`）。
- `src/core/prng/index.ts`：统一导出入口。
- `tests/unit/stage1_data_contract.test.ts`：Stage 1 自动化单元测试套件（5 大核心测试项）。
- `package.json` & `tsconfig.json`：工程构建与严格 TypeScript 配置。

---

## 2. 导出的核心接口与数据结构契约 (Exported Interfaces & Contracts)

```typescript
// 1. 状态快照与初始工厂
export function createInitialState(seed?: number): SimulationState;

// 2. 抗干扰确定性 PRNG
export function prngUniform01(seed: number, month: number, variableId: string): number;
export function prngRange(seed: number, month: number, variableId: string, min: number, max: number): number;
export function prngSymmetricNoise(seed: number, month: number, variableId: string, amplitude: number): number;

// 3. 内存深拷贝与存档
export function cloneSimulationState(state: SimulationState): SimulationState;
export function serializeArchive(history: SimulationState[]): string;
export function deserializeArchive(jsonStr: string): SaveArchivePayload;
```

---

## 3. 自检与 SFC 核算校验结果 (Self-Check & Audit Results)
- [x] 单元测试是否全部通过？：**5/5 通过 (100%)**
  - `✔ Stage 1.1: PRNG 确定性与调用顺序无关性 (Determinism & Order Independence)`
  - `✔ Stage 1.2: PRNG 分布合理性与无越界测试 (Distribution Sanity)`
  - `✔ Stage 1.3: 第 0 月 SFC 资产负债与资金池严格配平断言 (Month 0 Balance Assertion)`
  - `✔ Stage 1.4: 状态深拷贝物理隔离测试 (Deep Clone Isolation)`
  - `✔ Stage 1.5: 存档序列化与反序列化测试 (Save Archive Serialization)`
- [x] 是否严格遵守了“零 `Math.random()` 调用”与“纯逻辑无 DOM 依赖”约束？：**是 (静态扫描通过)**
- [x] 存量-流量一致性（SFC）初始误差值：**`0.000000 k`**
  - 银行总资产 (`2000.0k 贷款 + 4000.0k 金库现金 = 6000.0k`)
  - 银行负债与权益 (`5700.0k 总存款 + 300.0k 资本缓冲 = 6000.0k`)
  - 差额绝对值：`|6000.0k - 6000.0k| = 0.000000k`
- [x] TypeScript 静态类型检查：**`tsc --noEmit` 零告警通过**

---

## 4. 关键实现细节与边界提醒 (Implementation Notes & Caveats)
1. **第 0 月（`month = 0`）初值特征**：
   - 全城初始劳动力就业底层工人 720 人、中层管理 180 人，综合失业率为 `10.0%`。
   - 三行业实际在岗中层管理均略高于纯生产配比（含总部行政管理编制），确保第 0 月各行业 $\phi_{\text{mgmt}} = 1.00$。
   - `metrics.gdpYoY` 与 `metrics.inflationYoY` 在 `month < 12` 时必须严格为 `null`，下游不可在未满 12 个月时填充虚假增长率。
2. **PRNG 调用规范**：
   - 下游在 Step 4 核算 TFP 扰动时，务必使用规范注册键：`prngSymmetricNoise(seed, month, 'sector_food_tfp_noise', 0.015)`，不要自造带时间戳的动态键，以确保双轨对照隔离性。
3. **状态不可变性**：
   - `stepMonth` 推进时，必须先使用 `cloneSimulationState(prevState)` 创建新月快照，再在新快照上执行 Step 1 ~ Step 10。

---

## 5. 给下一棒 Agent 的具体任务指令 (Next Agent Action Items)
1. 目标 Agent：`Agent-02 (Economist)`。
2. 在 `src/core/accounting/` 中实现 SFC 逐月闭环核验器 `assertSfcBalance(prevState, currState)` 与宏观统计核算器。
3. 在 `src/core/engine/` 中实现月度 10 步计算流水线 `stepMonth(prevState): SimulationState`。
4. 运行 60 个月稳态推进自检，确保每一期 `sfcAudit.passed === true` 且 `maxAbsDiscrepancy <= 1e-6`。
