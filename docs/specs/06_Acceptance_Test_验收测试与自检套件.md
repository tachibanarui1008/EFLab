# 06_Acceptance_Test_验收测试与自检套件 (v1.0)

> **版本**：v1.0  
> **模块定位**：60 个月数值稳定性与 SFC 零黑洞审计、四大宏观传导机制自动化验证、跨环境与双轨可复现性测试套件及驳回协议  
> **负责角色**：`Agent-06 (Gatekeeper)` — Stage 6  
> **代码落盘路径**：`tests/sfc_audit/`、`tests/reproducibility/`、`agent_workspace/reviews/`

---

## 1. 模块目标与守门员最高权限

`Agent-06 (Gatekeeper)` 是 EFLab Alpha 0.1 项目的最终质量仲裁者。
- **核心职责**：编写并运行全套无头（Headless）自动化验收测试脚本，并将真实测试输出填入 [`/agent_workspace/reviews/sfc_audit_report_template.md`](../../agent_workspace/reviews/sfc_audit_report_template.md)。
- **一票否决权（Veto Power）**：若在测试中发现任何月份 SFC 账目不平（$|\epsilon| > 10^{-6}$）、实物库存为负、调用了 `Math.random()`、或者宏观传导方向违背经济学逻辑，**严禁 `Agent-06` 私自用 Try-Catch 或强行抹平余数来掩盖上游 Bug**，必须在审计报告中将结论标为 `REJECTED`，并将对应上游 Stage 状态退回 `REJECTED` 要求修复。

---

## 2. 第一大测试套件：60 个月存量-流量一致性（SFC）与极端压力审计（`tests/sfc_audit/`）

必须在不少于 **10 个不同随机种子（`seeds = [1, 7, 42, 99, 1024, ...]`）** 下，分别针对以下 **5 种政策与环境剧本** 连续运行 60 个月（共 $10 \times 5 \times 60 = 3000$ 个模拟月步进）：

1. **剧本 S1（基准稳态运行）**：默认参数（$\tau = 0.20$，公共预算 $180\text{k}$，无冲击，无基建）。
2. **剧本 S2（极限紧缩高税率压力测试）**：第 1 月将基准税率拉满至 $\tau = 0.50$，公共服务预算砍至最低 $60\text{k}$。
3. **剧本 S3（极限赤字扩张与“缺钱停工”压力测试）**：第 1 月将税率降至最低 $\tau = 0.05$，公共预算拉至最高 $360\text{k}$，同时启动 `road_improvement` 与 `energy_expansion` 两项大型基建工程，故意触发市政债务上限与 `SUSPENDED_NO_FUNDS` 缺钱停工。
4. **剧本 S4（双重外生冲击叠加测试）**：在第 10 月同时注入 `confidence_drop` 与 `productivity_drop`，并在第 25 月再次注入。
5. **剧本 S5（高频随机政策切换压力测试）**：每 3 个月在合法范围内大幅调整一次税率与预算。

### 每一模拟月强制通过的 6 项硬性断言（Hard Assertions）
对上述全部 3000 个月度快照，必须 100% 满足：
- **断言 A1（资金池零黑洞恒等式）**：
  $$\Big|\big(\text{bank.totalLoans} + \text{bank.reserveCash}\big) - \big(\text{bank.totalDeposits} + \text{bank.equityBuffer}\big)\Big| \le 10^{-6}$$
- **断言 A2（基础货币外生守恒）**：由于封闭城邦无央行印钞，银行金库现金加全社会净金融资产对应的基础准备金总量必须恒等于第 0 月初始值（误差 $\le 10^{-6}$）。
- **断言 A3（部门存量变动 $=$ 当月净流量）**：对三阶层居民、三行业企业、市政厅、银行，其期末减期初的净金融资产变动必须严格等于当月各项收支流量代数和（误差 $\le 10^{-6}$）。
- **断言 A4（实物库存与存款非负）**：
  $$\forall i \in \{\text{food}, \text{goods}, \text{capital}\},\quad \text{sectors}[i].\text{inventory} \ge 0,\quad \text{sectors}[i].\text{cash} \ge 0$$
  $$\forall k \in \{\text{working}, \text{middle}, \text{capitalist}\},\quad \text{households}[k].\text{deposits} \ge 0$$
- **断言 A5（人口与就业硬边界）**：
  $$0 \le \text{working.employed} \le 800,\quad 0 \le \text{middle.employed} \le 200$$
- **断言 A6（数值有效性与同比边界）**：所有数值字段严禁出现 `NaN` 或 `±Infinity`；当 `month < 12` 时，`metrics.gdpYoY === null` 且 `metrics.inflationYoY === null`；当 `month >= 12` 时两者必须为有效 `number`。

---

## 3. 第二大测试套件：四大宏观经济学传导机制方向性检验（Mechanism Verification）

模拟器不仅要账平，还必须表现出正确的经济学因果传导。在固定种子 `seed = 42` 下运行双轨对照，验证以下 4 个标准教学实验：

### 实验 M1：增税抑制当期消费与总需求（Tax Hike Contraction Test）
- **设置**：基准组保持 $\tau = 0.20$；干预组在第 5 月将基准税率上调至 $\tau = 0.35$（公共预算保持不变）。
- **验收标准**：
  1. 第 6 月（政策生效首月），干预组三阶层居民的税后可支配收入之和严格小于基准组；
  2. 第 6 ~ 11 月期间，干预组的居民累计实际消费（食品+消费品）严格小于基准组（$\Delta C < 0$），且消费品行业期末库存高于基准组或排产下调。

### 实验 M2：消费信心冲击引发预防性储蓄与产出收缩（Confidence Shock Test）
- **设置**：基准组无冲击；干预组在第 6 月注入 `confidence_drop`（持续 6 个月，有效 MPC 打 $85$ 折）。
- **验收标准**：
  1. 第 6 ~ 11 月期间，干预组居民消费支出显著低于基准组，而居民银行存款净增量（预防性储蓄）高于基准组；
  2. 随后 2 ~ 4 个月内，由于库存积压（$I_{i,t} > I_{i,t}^*$），干预组消费品行业下调目标排产量 $Y_{\text{goods}}^{\text{target}}$，导致综合失业率高于基准组。

### 实验 M3：基建投资拉动资本品行业与竣工永久增益（Public Infrastructure Multiplier Test）
- **设置**：基准组无基建；干预组在第 2 月启动 `road_improvement`（工期 6 个月，每月采购 25 件资本品）与 `energy_expansion`（工期 8 个月，每月采购 35 件资本品），且市政资金充足。
- **验收标准**：
  1. **建设期拉动效应**：在施工期内，干预组 `capital`（资本品行业）的市场需求量 `demandUnits`、实际产出或产能利用率显著高于基准组；
  2. **竣工永久增益效应**：项目完工后（`status === 'COMPLETED'`），验证 `metrics.logisticsLossRate` 从 `0.030` 降至 `0.005`，`metrics.energyEfficiencyBonus` 从 `1.00` 升至 `1.08`，且三行业最大产能上限 $Y_{i}^{\max}$ 永久提升。

### 实验 M4：中层管理短缺触发协同惩罚 $\phi_{\text{mgmt}}$ 与扩产订单触发测试
- **设置**：构造高需求扩张场景（或直接对 Step 4/Step 6 单元函数施加上界测试）。
- **验收标准**：
  1. 当某行业实际在岗中层管理低于标准配比（`food/goods` 低于 $1:5$，`capital` 低于 $1:4$）时，$\phi_{\text{mgmt}}$ 严格落在 $[0.70, 1.00)$，且生成 `DETERMINISTIC_MECHANISM` 管理短缺告警事件卡；
  2. 当某行业产能利用率 `> 0.85` 且当月盈利时，`expansionOrderUnits` 严格等于 `0.05 * capitalStock`。

---

## 4. 第三大测试套件：可复现性、PRNG 抗干扰与静态代码合规扫描（`tests/reproducibility/`）

1. **同种子跨次运行 100% 比特级一致测试（Bitwise Reproducibility）**：
   - 使用相同 `seed = 20261107` 独立运行两次完整的 60 个月模拟（含中途政策调整），将两次产出的 `history[60]` 序列化为 JSON 字符串（忽略 `exportedAtIso` 时间戳），两个 JSON 字符串必须 **逐字符 100% 相等**。
2. **双轨对照 PRNG 抗干扰测试（Cross-Sandbox PRNG Isolation）**：
   - 基准组不开启基建、不触发信贷；干预组开启两项基建、大幅改税并触发企业借贷。
   - 在第 $1 \sim 60$ 月的每一步，核验两边在同一月份 $t$ 对 `prngSymmetricNoise(seed, t, "sector_food_tfp_noise", 0.015)` 等所有注册变量的返回值差值严格为 `0`。
3. **存档中途导出与续跑一致性测试（Save/Load Continuity Test）**：
   - 连续运行 0 → 60 月得到 `fullHistory[60]`；
   - 另起一次运行 0 → 30 月，调用 `serializeArchive` 导出 JSON，再调用 `deserializeArchive` 恢复状态并继续运行 31 → 60 月得到 `resumedHistory[60]`；
   - 断言 `resumedHistory[60]` 与 `fullHistory[60]` 深度相等（Deep Equal）。
4. **静态源码红线扫描（Static Codebase Scan）**：
   - 扫描 `src/` 下所有 `.ts` / `.tsx` 文件，断言：
     - 不存在 `Math.random(` 调用；
     - `src/core/` 目录下不存在 `window`、`document`、`HTMLElement`、`CanvasRenderingContext2D`、`requestAnimationFrame` 引用。

---

## 5. 审计报告出具与通关签署流程

`Agent-06` 执行完上述三大测试套件后：
1. 将完整的测试统计数据（3000 个月最大 SFC 误差数值、最小库存值、M1~M4 实验具体对比数值、静态扫描结果）如实写入 [`/agent_workspace/reviews/sfc_audit_report_template.md`](../../agent_workspace/reviews/sfc_audit_report_template.md)。
2. 若全部通过：
   - 将审计报告结论设为 `PASSED (VERIFIED)`；
   - 将 [`/agent_workspace/01_TASK_BOARD.md`](../../agent_workspace/01_TASK_BOARD.md) 中 Stage 1 ~ Stage 6 的状态全部更新为 `VERIFIED`。
3. 若任一测试失败：
   - 将审计报告结论设为 `REJECTED` 并附失败复现用例；
   - 在任务看板中将责任阶段标记为 `REJECTED`。
