# EFLab

像素城市宏观经济实验模拟器，当前版本为 Alpha 0.1。

## 功能

- 居民、企业、市政、银行四部门的封闭经济循环。
- 工人、中层管理与技术人员、资本家三阶层，以及食品、消费品、资本品三行业。
- 60 个月模拟，支持税率、公共预算、道路和能源基建、消费信心与生产效率冲击。
- SFC 存量与流量一致性核算、确定性随机数、JSON 存档与双轨对照实验。
- 48×32 像素城市、经济指标图表和事件解释。

## 开发与验证

需要 Node.js 和 pnpm。

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
```

## 当前限制

经济逻辑已有自动化测试；界面与 macOS 应用仍需运行验证。当前 `index.html` 引用编译后的 JavaScript，源码为 TypeScript；现有 macOS 打包脚本未包含 TypeScript 编译步骤，不能直接视为可用发行版。

## 目录

- `src/core/`：经济引擎、状态、随机数与核算。
- `src/ui/`：像素城市、图表、交互与对照实验。
- `docs/specs/`：详细设计规范。
- `tests/`：单元、压力核算与复现测试。
- `macos/`：Swift + WebKit 桌面宿主及打包脚本。
- `agent_workspace/`：开发任务、交接和历史记录。

整体设计见 [项目蓝图](00_EFLab_Master_Blueprint.md)。
