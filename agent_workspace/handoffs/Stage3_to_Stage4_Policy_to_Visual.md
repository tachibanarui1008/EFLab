# Stage 3 -> Stage 4：经济与事件快照交接至像素城市视觉状态机

- **交出方 (From Agent)**：`Agent-03 (PolicyMaker)`
- **接收方 (To Agent)**：`Agent-04 (PixelArtist)`
- **完成日期 (Timestamp)**：`2026-11-07 17:13`
- **当前状态 (Status)**：`READY_FOR_HANDOFF`

---

## 1. 本阶段交付文件清单 (Deliverables)
- `src/core/engine/policy_projects.ts`：政策延迟生效队列控制方法（`setPendingBaseTaxRate`、`setPendingPublicServiceBudget`）、基建项目控制（`startPublicProject`、`pausePublicProject`）与外生冲击注入器（`triggerShock`、`clearShock`）。
- `src/core/engine/shocks_events.ts`：可追溯事件归因引擎（`generateMonthlyEvents`），严格区分 `DETERMINISTIC_MECHANISM` 与 `CORRELATED_OBSERVATION`。
- `tests/unit/stage3_policy_events.test.ts`：Stage 3 自动化测试套件（政策延迟生效、道路工程施工完工与缺钱停工、冲击注入与归因分类断言）。

---

## 2. 导出的核心接口与数据结构契约 (Exported Interfaces & Contracts)

```typescript
// 政策与基建控制
export function setPendingBaseTaxRate(state: SimulationState, rate: number): void;
export function setPendingPublicServiceBudget(state: SimulationState, budget: number): void;
export function startPublicProject(state: SimulationState, projectId: ProjectId): boolean;
export function pausePublicProject(state: SimulationState, projectId: ProjectId): boolean;

// 冲击注入
export function triggerShock(state: SimulationState, shockId: ShockId, durationMonths?: number, magnitude?: number): boolean;
export function clearShock(state: SimulationState, shockId: ShockId): boolean;

// 事件归因生成
export function generateMonthlyEvents(prevState: SimulationState, currState: SimulationState): TraceableEventCard[];
```

---

## 3. 自检与 SFC 核算校验结果 (Self-Check & Audit Results)
- [x] 单元测试全部通过：**11/11 通过 (100%)**
- [x] 政策延迟队列准确性：在第 $t$ 月排队，在第 $t+1$ 月 Step 1 生效并生成 `POLICY_ACTIVE` 事件卡
- [x] 基建项目状态机：完整实现 `IDLE -> ACTIVE <-> SUSPENDED_NO_FUNDS -> COMPLETED` 状态跃迁
- [x] 事件归因严格分类：确定性离散机制 100% 锁定为 `DETERMINISTIC_MECHANISM`，宏观总量伴随波动 100% 归为 `CORRELATED_OBSERVATION`

---

## 4. 关键实现细节与边界提醒 (Implementation Notes & Caveats)
1. **基建实物配给推进**：基建每月有效施工进度受资本品出清配给率 $f_{\text{capital}}$ 约束；若资本品供应紧张，总工期将按比例自然拉长（真实反映物质资本瓶颈）。
2. **缺钱停工触发**：当市政厅现金与法定举债上限不足以支付当月资本品采购时，项目状态自动切换为 `SUSPENDED_NO_FUNDS`。
3. **视觉状态机消费建议**：Stage 4 的像素城市渲染器可直接读取 `currState.municipal.projects` 的状态渲染施工围挡或“停工待款”标识。

---

## 5. 给下一棒 Agent 的具体任务指令 (Next Agent Action Items)
1. 目标 Agent：`Agent-04 (PixelArtist)`。
2. 在 `src/ui/city_canvas/` 下实现：
   - 8 项防闪烁滞回状态机（`hysteresis.ts`）；
   - `48 × 32` 程序化东亚像素小城渲染器（`pixel_city_renderer.ts`，12 类建筑与固定布局）；
   - 建筑点击检测与全城汇总数据展示浮层（`inspector.ts`）。
