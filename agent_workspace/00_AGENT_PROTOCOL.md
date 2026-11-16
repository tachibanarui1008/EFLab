# EFLab 多 Agent 协同工作与文档交接协议 (Agent Collaboration Protocol)

## 1. 核心设计哲学
在本项目中，不同的 Agent 负责不同模块的开发（如底层数学引擎、像素视觉状态机、前端实验室面板、SFC 审计测试）。为了杜绝“上下文污染”与“接口脑补”，**所有 Agent 之间的信息传递必须通过 `agent_workspace/` 目录下的 Markdown 文件完成**。

## 2. Agent 角色划分与职责边界
| Agent 代号 | 负责阶段 | 核心职责 | 允许修改的代码目录 | 严禁触碰的红线 |
| :--- | :--- | :--- | :--- | :--- |
| **Agent-01 (Architect)** | Stage 1 | 全局状态字典、第 0 月稳态初值、Hash PRNG、存档 Schema | `src/core/prng/` | 严禁使用 `Math.random()` |
| **Agent-02 (Economist)** | Stage 2 | 月度 10 步流水线、三阶层消费与管理协同、SFC 配平断言 | `src/core/engine/`, `src/core/accounting/` | 严禁引入任何 UI/DOM 依赖；SFC 误差不得超过 `1e-6` |
| **Agent-03 (PolicyMaker)**| Stage 3 | 延迟生效政策队列、两类基建项目、外生冲击、可追溯事件生成 | `src/core/engine/` | 无法单一归因的波动必须标记为“相关变化” |
| **Agent-04 (PixelArtist)**| Stage 4 | 48×32 固定矩阵、12 类程序化像素建筑、8 项指标滞回状态机 | `src/ui/city_canvas/` | 严禁反向修改经济引擎数据；必须开启像素整数缩放 |
| **Agent-05 (FrontendUI)** | Stage 5 | 三大面板布局、时间控制器、事件打标折线图、双轨对照实验室 | `src/ui/panels/`, `src/ui/lab/` | 历史不足 12 个月时同比必须显示“数据不足” |
| **Agent-06 (Gatekeeper)** | Stage 6 | 60 个月数值稳定性测试、三大传导机制复现、跨环境一致性审计 | `tests/`, `agent_workspace/reviews/` | 发现账目不平直接驳回对应阶段，不得替上游掩盖 Bug |

## 3. 标准交接流程（Handoff Workflow）
1. **接单前必读**：
   - 先读取根目录 `/00_EFLab_Master_Blueprint.md` 掌握全局背景；
   - 再读取 `/agent_workspace/01_TASK_BOARD.md` 确认当前所处阶段；
   - 读取 `/agent_workspace/handoffs/` 下由上一任 Agent 编写的交接文档。
2. **开发中记录**：
   - 若遇到公式边界或实现取舍，实时追加记录至 `/agent_workspace/logs/agent_execution_log.md`。
3. **交单时必填**：
   - 运行本阶段自检测试；
   - 按照 `/agent_workspace/handoffs/HANDOFF_TEMPLATE.md` 格式，填写本阶段通往下一阶段的交接文件；
   - 更新 `/agent_workspace/01_TASK_BOARD.md` 的状态码。
