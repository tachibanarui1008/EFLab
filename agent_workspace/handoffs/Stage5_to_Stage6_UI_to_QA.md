# Stage 5 -> Stage 6：完整应用交接至 QA 自动化验收测试

- **交出方 (From Agent)**：`Agent-05 (FrontendUI)`
- **接收方 (To Agent)**：`Agent-06 (Gatekeeper)`
- **完成日期 (Timestamp)**：`2026-11-07 17:19`
- **当前状态 (Status)**：`READY_FOR_HANDOFF`

---

## 1. 本阶段交付文件清单 (Deliverables)
- `src/ui/lab/comparison_lab.ts`：双轨对照实验室沙盒（`ComparisonLab`），实现基准组 vs 干预组物理内存隔离推进与净政策效应 $\Delta$ 计算。
- `src/ui/panels/top_hud.ts`：顶部 7 项宏观指标看板格式化器（`formatTopHud`，`<12` 个月同比严格保护显示“数据不足”）。
- `src/ui/panels/chart_renderer.ts`：带垂直事件打标线与双轨叠加对比的 Canvas 折线图渲染器（`renderTimeSeriesChart`）。
- `src/ui/app.ts`：全局单页应用交互控制器（`EFLabApp`），集成时间控制器（满 60 个月自动暂停）、单滑杆累进税率实时折算、基建与冲击注入。
- `index.html`：东亚小城复古色盘单页应用完整前端页面，支持城市主界面、经济解释图表流与双轨对照实验室三大视图。
- `macos/main.swift` & `macos/build_mac_app.sh`：原生 macOS 桌面应用程序打包套件，生成免依赖独立应用 `dist-mac/EFLab.app`（体积仅 75 KB）。
- `tests/unit/stage5_ui_lab.test.ts`：Stage 5 自动化测试套件（双轨零干预零分叉、HUD 看板同比保护、App 状态控制器与满 60 个月暂停测试）。

---

## 2. 导出的核心接口与数据结构契约 (Exported Interfaces & Contracts)

```typescript
// 1. 双轨对照实验室沙盒
export class ComparisonLab {
  constructor(initialState: SimulationState);
  stepSynchronized(): void;
  fastForwardToMonth60(): void;
  calculateCurrentDelta(): TreatmentEffectDelta;
  getBaselineHistory(): SimulationState[];
  getInterventionHistory(): SimulationState[];
}

// 2. 顶部 HUD 格式化
export function formatTopHud(state: SimulationState): TopHudViewData;

// 3. 全局应用主控
export class EFLabApp {
  constructor(seed?: number);
  step(): void;
  play(): void;
  pause(): void;
  reset(): void;
  setTaxRate(rate: number): void;
  setBudget(budget: number): void;
  startProject(projectId: ProjectId): boolean;
  injectShock(shockId: ShockId): boolean;
  exportJson(): string;
  importJson(jsonStr: string): void;
}
```

---

## 3. 自检与 SFC 核算校验结果 (Self-Check & Audit Results)
- [x] 单元测试全部通过：**17/17 通过 (100%)**
- [x] 双轨零分叉断言：无政策干预时，推进 10 个月两组实际 GDP、失业率、CPI 差值 $\Delta$ 严格为 0
- [x] PRNG 抗干扰测试：政策干预导致宏观经济分叉后，底层 PRNG 纯函数噪声差值严格保持 `0.000000`
- [x] 同比保护断言：前 11 个月同比显示“数据不足”，第 12 个月起正常显示有效百分比
- [x] 周期终点自动暂停：到达第 60 个月定时器自动停止，步进函数锁死在 60 个月

---

## 4. 关键实现细节与边界提醒 (Implementation Notes & Caveats)
1. **macOS 打包验证**：运行 `macos/build_mac_app.sh` 会自动调用系统 `swiftc` 将 `main.swift` 编译为原生 Cocoa + WebKit App `dist-mac/EFLab.app`，完全零额外打包依赖。
2. **存档往返**：`EFLabApp.importJson` 会同时校验 Schema、重置对比沙盒并同步重绘三大视图。

---

## 5. 给下一棒 Agent 的具体任务指令 (Next Agent Action Items)
1. 目标 Agent：`Agent-06 (Gatekeeper)`。
2. 执行终极守门员验收：
   - 编写并运行 Stage 6 全量测试套件（3,000 步 SFC 压力审计、M1~M4 宏观机制传导与可复现性）；
   - 出具正式审计报告至 `agent_workspace/reviews/sfc_audit_report_template.md`；
   - 更新全局任务看板全部阶段为 `VERIFIED`。
