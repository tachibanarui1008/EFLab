/**
 * EFLab Alpha 0.1 - 48×32 像素城市建筑与布局矩阵 (Building Layout Matrix)
 * 严格遵循 docs/specs/04_Pixel_City_Visual_像素城市与视觉状态机.md
 */

export interface BuildingMetadata {
  id: string;
  name: string;
  zone: string;
  tileX: number;
  tileY: number;
  tileW: number;
  tileH: number;
  sectorOrClass: 'working' | 'middle' | 'capitalist' | 'food' | 'goods' | 'capital' | 'municipal' | 'bank' | 'commercial';
}

export const CITY_GRID_WIDTH = 48;
export const CITY_GRID_HEIGHT = 32;
export const TILE_SIZE = 24; // 24x24 px

export const BUILDINGS: BuildingMetadata[] = [
  {
    id: 'B01',
    name: '工人社区（红砖筒子楼群）',
    zone: '西北：居住区',
    tileX: 2,
    tileY: 2,
    tileW: 9,
    tileH: 6,
    sectorOrClass: 'working',
  },
  {
    id: 'B02',
    name: '中产公寓（现代多层住宅）',
    zone: '西北：居住区',
    tileX: 12,
    tileY: 2,
    tileW: 8,
    tileH: 6,
    sectorOrClass: 'middle',
  },
  {
    id: 'B03',
    name: '资本家别墅（青瓦庭院群）',
    zone: '西北：居住区',
    tileX: 2,
    tileY: 9,
    tileW: 8,
    tileH: 4,
    sectorOrClass: 'capitalist',
  },
  {
    id: 'B04',
    name: '中心商业街（商店街步行区）',
    zone: '中西：商业区',
    tileX: 11,
    tileY: 9,
    tileW: 10,
    tileH: 5,
    sectorOrClass: 'commercial',
  },
  {
    id: 'B05',
    name: '市政厅（钟楼红砖大楼）',
    zone: '中央：公共核心',
    tileX: 26,
    tileY: 8,
    tileW: 8,
    tileH: 6,
    sectorOrClass: 'municipal',
  },
  {
    id: 'B06',
    name: '基础银行（罗马柱金库大楼）',
    zone: '中央：金融核心',
    tileX: 35,
    tileY: 8,
    tileW: 8,
    tileH: 6,
    sectorOrClass: 'bank',
  },
  {
    id: 'B07',
    name: '道路改善施工点（中央路网节点）',
    zone: '中央大道节点',
    tileX: 20,
    tileY: 14,
    tileW: 7,
    tileH: 3,
    sectorOrClass: 'municipal',
  },
  {
    id: 'B08',
    name: '能源扩容电站（变电站与冷却塔）',
    zone: '东北：公用事业',
    tileX: 36,
    tileY: 2,
    tileW: 10,
    tileH: 5,
    sectorOrClass: 'municipal',
  },
  {
    id: 'B09',
    name: '食品加工厂区（粮仓与发酵车间）',
    zone: '西南：轻工业区',
    tileX: 2,
    tileY: 18,
    tileW: 12,
    tileH: 11,
    sectorOrClass: 'food',
  },
  {
    id: 'B10',
    name: '消费品制造厂区（组装流水线）',
    zone: '东南：制造业区',
    tileX: 16,
    tileY: 18,
    tileW: 13,
    tileH: 11,
    sectorOrClass: 'goods',
  },
  {
    id: 'B11',
    name: '重工资本品厂区（高炉与龙门吊）',
    zone: '东南：重工业区',
    tileX: 31,
    tileY: 18,
    tileW: 15,
    tileH: 7,
    sectorOrClass: 'capital',
  },
  {
    id: 'B12',
    name: '全城综合物流货场（露天堆场）',
    zone: '东南角：仓储区',
    tileX: 31,
    tileY: 26,
    tileW: 15,
    tileH: 5,
    sectorOrClass: 'capital', // 汇总库存
  },
];

/**
 * 根据网格坐标查询命中的建筑元数据
 */
export function hitTestBuilding(tileX: number, tileY: number): BuildingMetadata | null {
  for (const b of BUILDINGS) {
    if (
      tileX >= b.tileX &&
      tileX < b.tileX + b.tileW &&
      tileY >= b.tileY &&
      tileY < b.tileY + b.tileH
    ) {
      return b;
    }
  }
  return null;
}
