# [Stage X -> Stage Y] Agent 工作交接单 (Handoff Document)

- **交出方 (From Agent)**：`Agent-XX`
- **接收方 (To Agent)**：`Agent-YY`
- **完成日期 (Timestamp)**：`YYYY-MM-DD HH:MM`
- **当前状态 (Status)**：`PENDING` / `READY_FOR_HANDOFF`

---

## 1. 本阶段交付文件清单 (Deliverables)
> 请列出本阶段新建或修改的所有代码及配置文件路径：
- `src/...`
- `tests/...`

## 2. 导出的核心接口与数据结构契约 (Exported Interfaces & Contracts)
> 请直接粘贴下游 Agent 需要调用的函数签名、类定义或状态字段说明（确保下游无需通读源码即可直接调用）：
```typescript
// 示例接口定义预留区
```

## 3. 自检与 SFC 核算校验结果 (Self-Check & Audit Results)
- [ ] 单元测试是否全部通过？
- [ ] 是否严格遵守了“零 `Math.random()` 调用”或“单向数据流”约束？
- [ ] 存量-流量一致性（SFC）误差值：`__________`

## 4. 关键实现细节与边界提醒 (Implementation Notes & Caveats)
> 提醒下游 Agent 必须注意的事项（如特殊初始值处理、空值保护、防闪烁滞回缓冲状态读取方式等）：
1. 
2. 

## 5. 给下一棒 Agent 的具体任务指令 (Next Agent Action Items)
1. 
2. 
