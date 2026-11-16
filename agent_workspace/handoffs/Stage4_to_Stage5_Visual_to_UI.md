# Stage 4 -> Stage 5：像素画布组件交接至三大面板与对照实验室

- **交出方 (From Agent)**：`Agent-04 (PixelArtist)`
- **接收方 (To Agent)**：`Agent-05 (FrontendUI)`
- **完成日期 (Timestamp)**：`2026-11-07 17:15`
- **当前状态 (Status)**：`READY_FOR_HANDOFF`

---

## 1. 本阶段交付文件清单 (Deliverables)
- `src/ui/city_canvas/hysteresis.ts`：8 项宏观与行业指标防闪烁滞回状态机（`updateHysteresisTier`、`updateCityVisualState`）。
- `src/ui/city_canvas/buildings_layout.ts`：48×32 网格坐标系统与 12 类建筑元数据矩阵（`BUILDINGS`、`hitTestBuilding`）。
- `src/ui/city_canvas/inspector.ts`：建筑点击汇总数据格式化器（`formatBuildingTooltip`，严格携带“全城汇总数据”前缀）。
- `src/ui/city_canvas/pixel_city_renderer.ts`：程序化东亚像素小城 Canvas 渲染器（`renderPixelCity`，16 色昭和色盘，动态窗户、烟囱浓烟、货场堆箱、基建施工与停工横幅）。
- `src/ui/city_canvas/index.ts`：统一导出入口。
- `tests/unit/stage4_pixel_canvas.test.ts`：Stage 4 自动化测试套件（滞回死区防抖、建筑矩阵点击检测与汇总浮层标签核验）。

---

## 2. 导出的核心接口与数据结构契约 (Exported Interfaces & Contracts)

```typescript
// 1. 渲染入口 (强制 imageSmoothingEnabled = false)
export function renderPixelCity(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  options?: RenderCityOptions
): void;

// 2. 点击命中与浮层格式化
export function hitTestBuilding(tileX: number, tileY: number): BuildingMetadata | null;
export function formatBuildingTooltip(building: BuildingMetadata, state: SimulationState): TooltipContent;

// 3. 滞回状态机
export function updateHysteresisTier(
  prevTier: VisualTier,
  value: number,
  down1: number,
  up1: number,
  down2: number,
  up2: number
): VisualTier;
```

---

## 3. 自检与 SFC 核算校验结果 (Self-Check & Audit Results)
- [x] 单元测试全部通过：**14/14 通过 (100%)**
- [x] 滞回死区零闪烁断言：在 $[0.66, 0.71]$ 临界缓冲区间交替震荡 30 次，档位稳定保持 `MID` 零跳变
- [x] 建筑矩阵与点击命中：12 类建筑位置精确对齐，普通路面无误触
- [x] 纯只读数据流验证：渲染层零反向数据修改，纯消费 `SimulationState`

---

## 4. 关键实现细节与边界提醒 (Implementation Notes & Caveats)
1. **Canvas 尺寸标准**：网格为 $48 \times 32$ tiles，单格尺寸 $24 \times 24$ 像素，画布逻辑原生分辨率为 $1152 \times 768$。UI 在挂载时建议提供 $1\times$ 与 $2\times$ 整数倍缩放切换，CSS 务必声明 `image-rendering: pixelated`。
2. **浮层展示**：点击建筑后调用 `formatBuildingTooltip` 直接渲染浮层卡片，数据实时响应月度步进变化。

---

## 5. 给下一棒 Agent 的具体任务指令 (Next Agent Action Items)
1. 目标 Agent：`Agent-05 (FrontendUI)`。
2. 在 `src/ui/panels/` 与 `src/ui/lab/` 中搭建：
   - 顶部 7 项宏观指标看板（`<12` 个月同比保护显示“数据不足”）；
   - 底部时间控制器（满 60 个月自动暂停）与单滑杆累进税率实时预览调节器；
   - 城市主界面、带垂直事件标记线的经济解释面板、双轨对照实验室；
   - 本地离线 HTML / 宿主打包脚本，构建 macOS 原生应用 `EFLab.app`。
