/**
 * EFLab Alpha 0.1 - 程序化东亚像素小城渲染器 (Procedural Pixel City Renderer)
 * 严格遵循 docs/specs/04_Pixel_City_Visual_像素城市与视觉状态机.md
 */

import type { SimulationState } from '../../core/prng/types.js';
import {
  BUILDINGS,
  CITY_GRID_WIDTH,
  CITY_GRID_HEIGHT,
  TILE_SIZE,
  type BuildingMetadata,
} from './buildings_layout.js';

export const PALETTE = {
  road: '#4A4E54',
  roadMarking: '#E6E2D8',
  sidewalk: '#7A8086',
  grass: '#4E6E4E',
  brick: '#9E473B',
  concrete: '#D9CFC1',
  tileRoof: '#2C3E4C',
  windowOn: '#F5C242',
  windowOff: '#2A323D',
  neonPink: '#E05A6D',
  steelBlue: '#3B5B76',
  ironGrey: '#6C737A',
  woodBox: '#C88A4B',
  orangeBox: '#D96B27',
  warningYellow: '#F2B705',
  darkSlate: '#1E252B',
  alertRed: '#E63946',
} as const;

export interface RenderCityOptions {
  selectedBuildingId?: string | null;
  hoveredBuildingId?: string | null;
  scale?: number; // 1 or 2
}

/**
 * 渲染完整 48×32 像素城市至 HTML5 Canvas 上下文
 */
export function renderPixelCity(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  options: RenderCityOptions = {}
): void {
  // 强制关闭插值平滑，保证纯正点阵像素感
  ctx.imageSmoothingEnabled = false;

  const totalPixelW = CITY_GRID_WIDTH * TILE_SIZE; // 1152
  const totalPixelH = CITY_GRID_HEIGHT * TILE_SIZE; // 768

  // 1. 地面底色与草坪绿化
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(0, 0, totalPixelW, totalPixelH);

  // 2. 街区人行道地面 (Sidewalks)
  ctx.fillStyle = PALETTE.sidewalk;
  ctx.fillRect(1 * TILE_SIZE, 1 * TILE_SIZE, 20 * TILE_SIZE, 13 * TILE_SIZE); // 西北居住/商业区地基
  ctx.fillRect(25 * TILE_SIZE, 7 * TILE_SIZE, 19 * TILE_SIZE, 8 * TILE_SIZE);  // 中央市政/金融地基
  ctx.fillRect(1 * TILE_SIZE, 17 * TILE_SIZE, 45 * TILE_SIZE, 14 * TILE_SIZE); // 南部工业/物流地基

  // 3. 主干道路网 (Roads)
  ctx.fillStyle = PALETTE.road;
  // 横向中央大道 (y: 14 ~ 16, 3格宽)
  ctx.fillRect(0, 14 * TILE_SIZE, totalPixelW, 3 * TILE_SIZE);
  // 纵向中央大道 (x: 21 ~ 24, 4格宽)
  ctx.fillRect(21 * TILE_SIZE, 0, 4 * TILE_SIZE, totalPixelH);

  // 道路标线 (Road Markings)
  ctx.fillStyle = PALETTE.roadMarking;
  for (let x = 0; x < CITY_GRID_WIDTH; x += 3) {
    ctx.fillRect(x * TILE_SIZE + 4, 15.4 * TILE_SIZE, TILE_SIZE * 1.5, 4);
  }
  for (let y = 0; y < CITY_GRID_HEIGHT; y += 3) {
    ctx.fillRect(22.8 * TILE_SIZE, y * TILE_SIZE + 4, 4, TILE_SIZE * 1.5);
  }

  // 4. 逐一绘制 12 类程序化建筑
  for (const b of BUILDINGS) {
    const px = b.tileX * TILE_SIZE;
    const py = b.tileY * TILE_SIZE;
    const pw = b.tileW * TILE_SIZE;
    const ph = b.tileH * TILE_SIZE;

    drawBuildingFacade(ctx, b, px, py, pw, ph, state);

    // 选中与悬停高亮边框
    if (b.id === options.selectedBuildingId) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(px - 2, py - 2, pw + 4, ph + 4);
      ctx.setLineDash([]);
    } else if (b.id === options.hoveredBuildingId) {
      ctx.strokeStyle = PALETTE.warningYellow;
      ctx.lineWidth = 2;
      ctx.strokeRect(px - 1, py - 1, pw + 2, ph + 2);
    }
  }
}

/**
 * 绘制单栋建筑的立面与动态视觉状态
 */
function drawBuildingFacade(
  ctx: CanvasRenderingContext2D,
  b: BuildingMetadata,
  x: number,
  y: number,
  w: number,
  h: number,
  state: SimulationState
): void {
  const vis = state.visualState;

  switch (b.id) {
    case 'B01': { // 工人社区筒子楼
      ctx.fillStyle = PALETTE.brick;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = PALETTE.darkSlate;
      ctx.fillRect(x, y, w, 12); // 屋顶屋檐
      drawWindowGrid(ctx, x + 12, y + 20, w - 24, h - 30, vis.workingConsumptionTier);
      break;
    }
    case 'B02': { // 中产公寓
      ctx.fillStyle = PALETTE.concrete;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = PALETTE.steelBlue;
      ctx.fillRect(x, y, w, 14); // 现代平顶
      drawWindowGrid(ctx, x + 10, y + 22, w - 20, h - 32, vis.middleConsumptionTier);
      break;
    }
    case 'B03': { // 资本家别墅青瓦庭院
      ctx.fillStyle = PALETTE.concrete;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = PALETTE.tileRoof;
      ctx.fillRect(x - 4, y, w + 8, 16); // 飞檐屋顶
      drawWindowGrid(ctx, x + 14, y + 24, w - 28, h - 34, vis.capitalistConsumptionTier);
      break;
    }
    case 'B04': { // 中心商业街
      ctx.fillStyle = PALETTE.concrete;
      ctx.fillRect(x, y, w, h);
      // 霓虹商铺招牌
      ctx.fillStyle = PALETTE.neonPink;
      ctx.fillRect(x + 10, y + 10, w - 20, 16);
      drawWindowGrid(ctx, x + 12, y + 36, w - 24, h - 46, vis.workingConsumptionTier);
      break;
    }
    case 'B05': { // 市政厅钟楼
      ctx.fillStyle = PALETTE.brick;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = PALETTE.concrete;
      ctx.fillRect(x + w / 2 - 16, y - 24, 32, 24); // 中央钟楼塔楼
      ctx.fillStyle = PALETTE.warningYellow;
      ctx.fillRect(x + w / 2 - 6, y - 18, 12, 12); // 表盘
      drawWindowGrid(ctx, x + 12, y + 20, w - 24, h - 30, 'MID');
      break;
    }
    case 'B06': { // 基础银行罗马柱大楼
      ctx.fillStyle = PALETTE.concrete;
      ctx.fillRect(x, y, w, h);
      // 罗马柱排布
      ctx.fillStyle = PALETTE.darkSlate;
      ctx.fillRect(x, y, w, 14); // 三角山形三角顶
      for (let cx = x + 12; cx < x + w - 12; cx += 22) {
        ctx.fillStyle = '#B8B0A2';
        ctx.fillRect(cx, y + 14, 10, h - 20);
      }
      break;
    }
    case 'B07': { // 道路施工点
      const p = state.municipal.projects.road_improvement;
      if (p.status === 'COMPLETED') {
        ctx.fillStyle = PALETTE.road;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = PALETTE.grass;
        ctx.fillRect(x + 4, y + h / 2 - 3, w - 8, 6); // 竣工绿化带
      } else {
        ctx.fillStyle = '#686054';
        ctx.fillRect(x, y, w, h);
        // 黄黑警示围挡条纹
        for (let bx = x; bx < x + w; bx += 18) {
          ctx.fillStyle = PALETTE.warningYellow;
          ctx.fillRect(bx, y + 4, 9, h - 8);
          ctx.fillStyle = PALETTE.darkSlate;
          ctx.fillRect(bx + 9, y + 4, 9, h - 8);
        }
        if (p.status === 'SUSPENDED_NO_FUNDS') {
          drawHaltedBanner(ctx, x, y + h / 2 - 8, w, 16);
        }
      }
      break;
    }
    case 'B08': { // 能源扩容电站
      const p = state.municipal.projects.energy_expansion;
      ctx.fillStyle = PALETTE.ironGrey;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = PALETTE.steelBlue;
      ctx.fillRect(x + 10, y + 10, 36, h - 20);
      ctx.fillRect(x + w - 46, y + 10, 36, h - 20);
      if (p.status === 'SUSPENDED_NO_FUNDS') {
        drawHaltedBanner(ctx, x, y + h / 2 - 8, w, 16);
      }
      break;
    }
    case 'B09': { // 食品加工厂
      ctx.fillStyle = PALETTE.ironGrey;
      ctx.fillRect(x, y, w, h);
      // 烟囱排烟
      drawChimneyAndSmoke(ctx, x + 20, y - 16, vis.foodSectorActivityTier);
      drawWindowGrid(ctx, x + 16, y + 30, w - 32, h - 50, vis.foodSectorActivityTier);
      break;
    }
    case 'B10': { // 消费品制造厂
      ctx.fillStyle = PALETTE.steelBlue;
      ctx.fillRect(x, y, w, h);
      drawChimneyAndSmoke(ctx, x + 30, y - 20, vis.goodsSectorActivityTier);
      drawWindowGrid(ctx, x + 20, y + 36, w - 40, h - 56, vis.goodsSectorActivityTier);
      break;
    }
    case 'B11': { // 重工资本品厂
      ctx.fillStyle = PALETTE.darkSlate;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = PALETTE.alertRed;
      ctx.fillRect(x + 16, y + 16, 40, 20); // 高炉火光
      drawChimneyAndSmoke(ctx, x + w - 30, y - 24, vis.capitalSectorActivityTier);
      break;
    }
    case 'B12': { // 综合物流货场
      ctx.fillStyle = '#5A564C';
      ctx.fillRect(x, y, w, h);
      drawCargoBoxes(ctx, x + 8, y + 8, w - 16, h - 16, vis.inventoryPileTier);
      break;
    }
  }

  // 绘制建筑文字标识 (黑底白字小标签)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(x + 4, y + h - 18, w - 8, 14);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(b.name.split('（')[0] ?? b.name, x + w / 2, y + h - 7);
}

function drawWindowGrid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  tier: 'LOW' | 'MID' | 'HIGH'
): void {
  const litColor = PALETTE.windowOn;
  const offColor = PALETTE.windowOff;
  const litRate = tier === 'HIGH' ? 0.90 : tier === 'MID' ? 0.55 : 0.25;

  let count = 0;
  for (let wy = y; wy < y + h - 10; wy += 14) {
    for (let wx = x; wx < x + w - 10; wx += 14) {
      count++;
      const isLit = (count % 10) / 10 < litRate;
      ctx.fillStyle = isLit ? litColor : offColor;
      ctx.fillRect(wx, wy, 8, 9);
    }
  }
}

function drawChimneyAndSmoke(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tier: 'LOW' | 'MID' | 'HIGH'
): void {
  ctx.fillStyle = PALETTE.brick;
  ctx.fillRect(x, y, 14, 28); // 烟囱筒体

  const puffCount = tier === 'HIGH' ? 3 : tier === 'MID' ? 2 : 1;
  ctx.fillStyle = tier === 'HIGH' ? '#555555' : 'rgba(230, 230, 230, 0.85)';
  for (let p = 0; p < puffCount; p++) {
    ctx.fillRect(x - 2 + p * 6, y - 10 - p * 8, 12 + p * 4, 8 + p * 2);
  }
}

function drawCargoBoxes(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  tier: 'LOW' | 'MID' | 'HIGH'
): void {
  const boxCount = tier === 'HIGH' ? 12 : tier === 'MID' ? 6 : 2;
  const boxW = 20;
  const boxH = 14;

  let current = 0;
  for (let r = 0; r < 2 && current < boxCount; r++) {
    for (let c = 0; c < 6 && current < boxCount; c++) {
      ctx.fillStyle = current % 2 === 0 ? PALETTE.woodBox : PALETTE.orangeBox;
      ctx.fillRect(x + c * (boxW + 6), y + r * (boxH + 6), boxW, boxH);
      current++;
    }
  }

  if (tier === 'LOW') {
    // 红色缺货警示灯
    ctx.fillStyle = PALETTE.alertRed;
    ctx.fillRect(x + w - 20, y + 4, 10, 10);
  }
}

function drawHaltedBanner(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  ctx.fillStyle = PALETTE.alertRed;
  ctx.fillRect(x + 4, y, w - 8, h);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('⚠️ 停工待款 (HALTED: NO FUNDS)', x + w / 2, y + h - 4);
}
