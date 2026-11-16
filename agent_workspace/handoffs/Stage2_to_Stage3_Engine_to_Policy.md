# Stage 2 -> Stage 3：月度 10 步引擎交接至政策与事件模块

- **交出方 (From Agent)**：`Agent-02 (Economist)`
- **接收方 (To Agent)**：`Agent-03 (PolicyMaker)`
- **完成日期 (Timestamp)**：`2026-11-07 17:05`
- **当前状态 (Status)**：`READY_FOR_HANDOFF`

---

## 1. 本阶段交付文件清单 (Deliverables)
- `src/core/accounting/sfc_auditor.ts`：SFC 存量-流量一致性闭环核验器（`assertSfcBalance`），校验银行资产负债恒等式、四部门净资产变动与净收支流量恒等式、非负库存与非负存款断言。
- `src/core/accounting/macro_metrics.ts`：支出法名义/实际 GDP（$C+I+G$）、固定消费篮子 CPI、`<12` 个月同比空值保护逻辑与综合景气指数核算器。
- `src/core/accounting/index.ts`：Accounting 模块统一导出入口。
- `src/core/engine/monthly_pipeline.ts`：月度 10 步计算流水线（`stepMonth`），严格按 Step 1 ~ Step 10 单向执行。
- `src/core/engine/index.ts`：Engine 模块统一导出入口。
- `tests/unit/stage2_engine_sfc.test.ts`：Stage 2 自动化测试套件（涵盖 6 个随机种子下 360 个月度连续推进零黑洞断言、管理短缺协同惩罚与配给出清极值测试）。

---

## 2. 导出的核心接口与数据结构契约 (Exported Interfaces & Contracts)

```typescript
// 1. 月度 10 步引擎核心步进函数
export function stepMonth(
  prevState: SimulationState,
  history?: SimulationState[]
): SimulationState;

// 2. SFC 闭环断言核验器
export function assertSfcBalance(
  prevState: SimulationState,
  currState: SimulationState,
  tolerance?: number // 默认 1e-6
): SfcAuditResult;

// 3. 宏观统计核算器
export function calculateMacroMetrics(
  prevState: SimulationState,
  currHouseholds: Record<string, HouseholdClassState>,
  currSectors: Record<string, SectorState>,
  municipalGovtGoodsPurchase: number,
  municipalProjectCapitalPurchase: number,
  history: SimulationState[],
  currentMonth: number
): MacroMetrics;
```

---

## 3. 自检与 SFC 核算校验结果 (Self-Check & Audit Results)
- [x] 单元测试是否全部通过？：**8/8 通过 (100%)**
  - `✔ Stage 1.1 ~ 1.5: 数据契约与 PRNG 测试全绿`
  - `✔ Stage 2.1: 60 个月稳态连续运行零资金黑洞与零负库存断言 (覆盖 seeds=[1, 7, 42, 99, 1024, 20261107] 共 360 个月)`
  - `✔ Stage 2.2: 中层管理协同惩罚机制断言 (在岗管理减半时效率精确降至 0.85)`
  - `✔ Stage 2.3: 按比例配给出清与强制储蓄断言 (极端供给短缺下期末库存严守为 0，居民强制储蓄记录完整)`
- [x] 是否严格遵守了“零 `Math.random()` 调用”与“纯逻辑无 DOM 依赖”约束？：**是**
- [x] 存量-流量一致性（SFC）误差值：**全周期每一月 $|\epsilon| \le 10^{-6}$**
- [x] TypeScript 静态类型检查：**`tsc --noEmit` 零告警通过**

---

## 4. 关键实现细节与边界提醒 (Implementation Notes & Caveats)
1. **资金闭环守恒关键流向**：
   - Step 9 中资本家分红税款 `taxC` 已严格计入市政现金存款 `municipal.cashDeposits` 与税收总额，保证市政 NetFA 与现金池零误差。
   - 企业与市政自动去杠杆本金偿还同时等额扣减 `cash` 与 `loans`，净金融资产（NetFA）保持完全守恒。
2. **基建项目与配给**：
   - 市政基建项目有效工期进度在 Step 7 按资本品实际配给满足率 `fCapital` 推进；若资金断裂或触及债务上限，自动置为 `SUSPENDED_NO_FUNDS`。
3. **同比指标空值保护**：
   - 当 `month < 12` 时，`metrics.gdpYoY` 与 `metrics.inflationYoY` 严格为 `null`，Stage 3 在事件归因或 Stage 5 在绘制图表时请直接使用空值保护分支。

---

## 5. 给下一棒 Agent 的具体任务指令 (Next Agent Action Items)
1. 目标 Agent：`Agent-03 (PolicyMaker)`。
2. 在 `src/core/engine/` 下实现：
   - 政策队列控制辅助方法（`setPendingBaseTaxRate`、`setPendingPublicServiceBudget`）；
   - 基建项目立项触发方法（`startPublicProject`）；
   - 外生冲击手动/定时触发器（`triggerShock`、`clearShock`）；
   - 结构化事件归因生成器（`generateMonthlyEvents`），严格区分 `DETERMINISTIC_MECHANISM` 与 `CORRELATED_OBSERVATION`。
