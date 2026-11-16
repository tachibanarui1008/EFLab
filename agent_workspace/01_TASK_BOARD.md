# EFLab Alpha 0.1 全局 Agent 任务看板 (Global Task Board)

> **状态码说明**：`PENDING` (待启动) | `IN_PROGRESS` (开发中) | `READY_FOR_HANDOFF` (待下游接管) | `VERIFIED` (已通过 QA 验收) | `REJECTED` (审计驳回)

| 阶段 | 模块名称 | 负责 Agent | 关联 Spec 文档 | 交接文档路径 | 当前状态 | 备注 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Stage 0** | 项目总领蓝图与 7 大 Spec v1.0 定稿 | Planner Agent | `00_EFLab_Master_Blueprint.md` & `docs/specs/00~06` | - | `VERIFIED` | 已完成总领文件、工作区及 `00~06` 分文档 v1.0 编写 |
| **Stage 1** | 数据契约、初值配平与 PRNG | Agent-01 (Architect) | `docs/specs/01_Data_Contract_*.md` | `handoffs/Stage1_to_Stage2_Data_to_Engine.md` | `VERIFIED` | 5/5 单元测试通过，第0月配平误差为 0，零 Math.random |
| **Stage 2** | 月度 10 步经济引擎与 SFC 核算 | Agent-02 (Economist) | `docs/specs/02_Economic_Engine_*.md` | `handoffs/Stage2_to_Stage3_Engine_to_Policy.md` | `VERIFIED` | 8/8 测试通过，6 个种子 360 个月 SFC 误差 <= 1e-6，零负库存 |
| **Stage 3** | 政策队列、基建项目与事件归因 | Agent-03 (PolicyMaker)| `docs/specs/03_Policy_Project_*.md` | `handoffs/Stage3_to_Stage4_Policy_to_Visual.md` | `VERIFIED` | 11/11 测试通过，延迟生效队列、缺钱停工状态机与归因分类全部就绪 |
| **Stage 4** | 48×32 像素城市与滞回状态机 | Agent-04 (PixelArtist)| `docs/specs/04_Pixel_City_*.md` | `handoffs/Stage4_to_Stage5_Visual_to_UI.md` | `VERIFIED` | 14/14 测试通过，12 类建筑矩阵、滞回零抖动与浮层格式化就绪 |
| **Stage 5** | 三大面板与双轨对照实验室 | Agent-05 (FrontendUI) | `docs/specs/05_UI_Panels_Lab_*.md` | `handoffs/Stage5_to_Stage6_UI_to_QA.md` | `VERIFIED` | 17/17 测试通过，完成三大面板布局、双轨沙盒对比与原生 macOS EFLab.app 封装 |
| **Stage 6** | 自动化核算校验与终极守门员审计 | Agent-06 (Gatekeeper) | `docs/specs/06_Acceptance_Test_*.md` | `reviews/sfc_audit_report_template.md` | `VERIFIED` | 3,000 步极端压力测试、四大传导机制与跨环境比特级复现 100% 通过 |
