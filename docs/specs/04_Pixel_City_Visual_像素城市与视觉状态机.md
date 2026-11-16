# 04_Pixel_City_Visual_像素城市与视觉状态机 (v1.0)

> **版本**：v1.0  
> **模块定位**：48×32 固定坐标像素城市网格、五大功能分区与 12 类程序化像素建筑、東亚复古色盘与 8 项指标防闪烁滞回状态机  
> **负责角色**：`Agent-04 (PixelArtist)` — Stage 4  
> **代码落盘路径**：`src/ui/city_canvas/`

---

## 1. 模块目标与核心红线

`Agent-04` 负责将 `SimulationState` 的月度宏观快照映射为一个富有生机、零外部贴图依赖的**程序化东亚像素小城（Procedural Pixel City）**。
- **核心红线 1（彻底只读）**：渲染层只能读取 `SimulationState`（特别是 `visualState: CityVisualHysteresisState` 与各部门汇总指标），**严禁修改任何经济引擎状态**。
- **核心红线 2（强制像素整数清晰渲染）**：Canvas 上下文必须设置 `ctx.imageSmoothingEnabled = false`，CSS 必须声明 `image-rendering: pixelated; image-rendering: crisp-edges;`，缩放倍率限制为整数倍（`1x`、`2x`），严禁出现双线性插值模糊。
- **核心红线 3（防闪烁滞回状态机）**：所有由宏观经济指标驱动的建筑视觉档位（`LOW` / `MID` / `HIGH`）必须经过带缓冲带的滞回状态机（Hysteresis State Machine）计算，杜绝指标在阈值附近微幅震荡时引发画面高频闪烁。

---

## 2. 画布规格与东亚小城复古色盘（Canvas & Palette）

### 2.1 网格与尺寸规范
- **网格规模**：固定 **`48 × 32` tiles**（横向 $x \in [0, 47]$，纵向 $y \in [0, 31]$）。
- **单格尺寸**：每个 tile 为 **`24 × 24` 逻辑像素**，画布原生逻辑分辨率为 **`1152 × 768` 像素**（标准 `3:2` 比例）。
- **装饰性行人/车辆精灵尺寸**：行人 `16 × 24` 像素，货运卡车 `36 × 24` 像素（沿预设主干道循环移动，移动密度由 `visualState` 档位控制，严禁微观寻路）。

### 2.2 东亚小城复古色盘（16 色主色调规范）
| 色彩用途 | 色名 | Hex 色值 | 适用对象 |
| :--- | :--- | :---: | :--- |
| **地面与道路** | 暖灰柏油路 | `#4A4E54` | 城市主干道与十字路口 |
| | 斑马线/路标白 | `#E6E2D8` | 道路标线、施工围挡条纹 |
| | 青石板人行道 | `#7A8086` | 街区人行道、市政广场地面 |
| | 城郊草坪绿 | `#4E6E4E` | 绿化带、别墅庭院、公园 |
| **住宅与商业区** | 昭和红砖墙 | `#9E473B` | 工人社区筒子楼、市政厅外立面 |
| | 暖米白水泥 | `#D9CFC1` | 中产公寓外墙、银行大楼 |
| | 青黛瓦屋顶 | `#2C3E4C` | 资本家东亚庭院别墅屋顶 |
| | 霓虹暖黄灯 | `#F5C242` | 夜晚/高消费档位窗户亮灯、商业街招牌 |
| | 霓虹町屋粉/青 | `#E05A6D` / `#3CAEA3` | 商业街店铺灯箱（随消费档位点亮） |
| **工业与基建区** | 工业钢结构蓝 | `#3B5B76` | 消费品厂房、重工资本品车间屋顶 |
| | 仓储瓦楞铁灰 | `#6C737A` | 食品加工厂、物流货场仓库 |
| | 货箱木色/橙 | `#C88A4B` / `#D96B27` | 物流货场堆叠的实物库存木箱与集装箱 |
| | 警示黄黑 | `#F2B705` | 道路施工点、闪烁招聘告示牌、吊机 |

---

## 3. 五大功能分区与 12 类建筑固定坐标矩阵（`48 × 32` Map Layout）

主干道固定布局：**横向中央大道**位于 $y \in [14, 16]$（3 格宽），**纵向中央大道**位于 $x \in [22, 24]$（3 格宽），将 `48 × 32` 网格划分为四大象限与中央十字枢纽：

| 建筑编号 | 建筑名称 | 所属功能分区 | 网格左上角 $(x, y)$ | 占地尺寸 $(w \times h)$ | 绑定汇总部门 / 视觉驱动指标 |
| :---: | :--- | :--- | :---: | :---: | :--- |
| **B01** | **工人社区（红砖筒子楼群）** | 西北：居住区 | `(2, 2)` | `9 × 6` | `households.working` / `workingConsumptionTier` |
| **B02** | **中产公寓（现代多层住宅）** | 西北：居住区 | `(12, 2)` | `8 × 6` | `households.middle` / `middleConsumptionTier` |
| **B03** | **资本家别墅（青瓦庭院群）** | 西北：居住区 | `(2, 9)` | `8 × 4` | `households.capitalist` / `capitalistConsumptionTier` |
| **B04** | **中心商业街（商店街步行区）**| 中西：商业区 | `(11, 9)` | `10 × 5` | 居民总消费 / 三阶层消费档位综合映射 |
| **B05** | **市政厅（钟楼红砖大楼）** | 中央：公共核心 | `(26, 8)` | `8 × 6` | `municipal` / 财政盈余与税率公示牌 |
| **B06** | **基础银行（罗马柱金库大楼）**| 中央：金融核心 | `(35, 8)` | `8 × 6` | `bank` / 存贷比与金库灯光状态 |
| **B07** | **道路改善施工点（中央路网）**| 中央大道节点 | `(20, 14)` | `7 × 3` | `municipal.projects.road_improvement` |
| **B08** | **能源扩容电站（东北变电站）**| 东北：公用事业 | `(36, 2)` | `10 × 5` | `municipal.projects.energy_expansion` |
| **B09** | **食品加工厂区（粮仓与车间）**| 西南：轻工业区 | `(2, 18)` | `12 × 11` | `sectors.food` / `foodSectorActivityTier` |
| **B10** | **消费品制造厂区（组装厂）** | 东南：制造业区 | `(16, 18)` | `13 × 11` | `sectors.goods` / `goodsSectorActivityTier` |
| **B11** | **重工资本品厂区（高炉与龙门吊）**| 东南：重工业区 | `(31, 18)` | `15 × 7` | `sectors.capital` / `capitalSectorActivityTier` |
| **B12** | **全城综合物流货场（露天堆场）**| 东南角：仓储区 | `(31, 26)` | `15 × 5` | 三行业总库存 / `inventoryPileTier` |

---

## 4. 8 项指标防闪烁滞回状态机规范（Hysteresis State Machine）

### 4.1 滞回状态转移通用数学规则
为防止指标在临界点（如产能利用率在 $79.9\%$ 与 $80.1\%$ 之间）来回摆动导致建筑烟囱、窗户灯光每帧/每月闪烁，每个视觉状态 $S_t \in \{\text{LOW}, \text{MID}, \text{HIGH}\}$ 必须依赖上月状态 $S_{t-1}$ 与带缓冲区间（Deadband）的上升阈值 $(T_{\text{up,1}}, T_{\text{up,2}})$ 和下降阈值 $(T_{\text{down,1}}, T_{\text{down,2}})$，其中严格满足 $T_{\text{down,1}} < T_{\text{up,1}}$ 且 $T_{\text{down,2}} < T_{\text{up,2}}$：

```typescript
export function updateHysteresisTier(
  prevTier: VisualTier,
  value: number,
  down1: number, // MID -> LOW 下降阈值
  up1: number,   // LOW -> MID 上升阈值
  down2: number, // HIGH -> MID 下降阈值
  up2: number    // MID -> HIGH 上升阈值
): VisualTier {
  if (prevTier === 'LOW') {
    if (value >= up2) return 'HIGH';
    if (value >= up1) return 'MID';
    return 'LOW';
  }
  if (prevTier === 'MID') {
    if (value < down1) return 'LOW';
    if (value >= up2) return 'HIGH';
    return 'MID';
  }
  // prevTier === 'HIGH'
  if (value < down1) return 'LOW';
  if (value < down2) return 'MID';
  return 'HIGH';
}
```

### 4.2 8 项核心视觉状态映射与阈值表
以下计算在每月 Step 10 调用（位于 `src/core/accounting/visual_mapping.ts` 或由 `city_canvas` 共享）：

| 编号 | 状态字段 (`CityVisualHysteresisState`) | 驱动指标计算公式 ($V_t$) | `down1` (`MID→LOW`) | `up1` (`LOW→MID`) | `down2` (`HIGH→MID`) | `up2` (`MID→HIGH`) | 低/中/高三档像素视觉表现（`LOW` / `MID` / `HIGH`） |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **1** | `workingConsumptionTier` | 工人实际消费相对于第0月基准比值：$C_{w,t}^{\text{real}} / C_{w,0}^{\text{real}}$ | `0.85` | `0.92` | `1.05` | `1.12` | **B01 工人社区 & B04 商业街西侧**：窗户亮灯率 `30% / 65% / 95%`；晾衣绳与夜市摊位数量 `1 / 3 / 6` 个 |
| **2** | `middleConsumptionTier` | 中层实际消费相对于第0月基准比值：$C_{m,t}^{\text{real}} / C_{m,0}^{\text{real}}$ | `0.85` | `0.92` | `1.05` | `1.12` | **B02 中产公寓 & B04 商业街中段**：阳台暖光灯与停放私家车数量 `2 / 5 / 8` 辆；百货招牌霓虹常亮 |
| **3** | `capitalistConsumptionTier`| 资本家实际消费相对于第0月基准比值：$C_{c,t}^{\text{real}} / C_{c,0}^{\text{real}}$ | `0.85` | `0.92` | `1.05` | `1.12` | **B03 资本家别墅 & B04 精品店**：庭院石灯笼与豪华轿车 `1 / 2 / 4` 辆；喷泉水花动画开关 |
| **4** | `employmentHealthTier` | 全城综合就业率：$1 - u_t = \text{employed} / 1000$ | `0.84` | `0.88` | `0.92` | `0.95` | **厂区门口 & 主干道**：`LOW` 时市政厅门口排起领救济长队；`MID` 正常通勤行人；`HIGH` 三大厂区门口挂出闪烁**“急聘 (HIRING)”**黄黑像素牌 |
| **5** | `foodSectorActivityTier` | 食品厂产能利用率：$\text{capacityUtilization}_{\text{food},t}$ | `0.65` | `0.72` | `0.83` | `0.88` | **B09 食品加工厂**：粮仓传送带运转速度、烟囱白色蒸汽粒子团数量 `1 / 3 / 6` 朵 |
| **6** | `goodsSectorActivityTier` | 消费品厂产能利用率：$\text{capacityUtilization}_{\text{goods},t}$ | `0.65` | `0.72` | `0.83` | `0.88` | **B10 消费品制造厂**：厂房天窗亮灯数、出货月台装卸叉车动画、`HIGH` 时触发扩产脚手架标识 |
| **7** | `capitalSectorActivityTier`| 资本品厂产能利用率：$\text{capacityUtilization}_{\text{capital},t}$ | `0.60` | `0.68` | `0.82` | `0.87` | **B11 重工资本品厂**：高炉火光亮度、龙门吊移动、煙囱浓烟档位 `LOW(微烟) / MID(正常) / HIGH(满负荷红光)` |
| **8** | `inventoryPileTier` | 三行业总库存占目标库存比值：$\sum_i I_{i,t} / \sum_i I_{i,t}^*$ | `0.65` | `0.80` | `1.20` | `1.35` | **B12 综合物流货场**：露天堆场木箱与集装箱堆叠高度：`LOW`（空旷缺货，仅 2 堆并亮红色缺货警示灯）、`MID`（标准 6 堆）、`HIGH`（爆仓 12 堆满溢至路边） |

### 4.3 公共基建施工点的专属视觉状态
除上述 8 项滞回指标外，**B07（道路施工点）**与 **B08（能源扩容电站）**直接映射 `PublicProjectState.status`：
- `IDLE`：普通未升级路面 / 普通小型变电站；
- `ACTIVE`：出现黄黑施工围挡、闪烁施工警示灯、工人操作像素动画及进度条浮标（`progressedMonths / totalRequiredMonths`）；
- `SUSPENDED_NO_FUNDS`（**缺钱停工**）：施工动画静止，画面上方悬挂醒目的红色像素横幅 **“停工待款 (HALTED: NO FUNDS)”**；
- `COMPLETED`：道路变为崭新宽阔的双向四车道高规格柏油路（带绿植隔离带）/ 能源电站升起双座大型冷却塔与高压输电铁塔，持续发出蓝色微光。

---

## 5. 建筑点击交互与汇总浮层规范（Aggregate Tooltip Overlay）

当玩家在 Canvas 上移动鼠标或点击任意一栋建筑（B01 ~ B12）时：
1. **高亮描边**：被选中的建筑外围绘制 `2px` 亮白色像素虚线框。
2. **汇总数据浮层（严禁伪造个体信息）**：
   - 浮层标题必须包含显著标签，例如：
     - 点击 B01：`【底层工人社区 — 全城阶层合计 (800人池)】`
     - 点击 B10：`【消费品制造厂区 — 全行业汇总数据】`
   - 浮层展示字段（直接读取当前月份 `SimulationState`）：
     - **居民区（B01~B03）**：总人口/在岗人数、失业率、人均月薪、当月税后可支配总收入、当月实际消费（食品/消费品）与强制储蓄、阶层银行存款总额、当前消费视觉档位（`LOW/MID/HIGH`）。
     - **工业区（B09~B11）**：当期单价、计划产量 vs 实际产量、产能利用率、在岗底层工人/中层管理人数、**管理协同效率系数 $\phi_{\text{mgmt}}$**（若 $<1.0$ 标红提示管理短缺）、期末实物库存、当月营收与分红、企业活期存款与银行贷款余额。
     - **市政厅（B05）/ 银行（B06）**：展示当月财政收支明细、债务余额/上限、两项基建进度；或银行总存款、总贷款、存贷比、净利差与资本缓冲池。

---

## 6. Stage 4 守门员自检标准

`Agent-04` 在移交至 Stage 5 前必须验证：
1. **滞回防抖单元测试**：构造一组在阈值上下微幅震荡的测试输入序列（例如产能利用率在 `0.71` 与 `0.66` 之间交替 20 次），验证 `updateHysteresisTier` 输出保持稳定的 `'MID'`，发生跳变次数为 `0`。
2. **第 0 月初始档位基准测试**：验证 `month = 0` 初值状态下，前 8 项视觉状态全部处于稳态 `'MID'` 档位。
3. **Canvas 纯净度检查**：确认 `src/ui/city_canvas/` 仅导出渲染组件与命中检测函数（`hitTestBuilding(tileX, tileY): BuildingMeta | null`），未修改任何传入的 `SimulationState` 字段。
