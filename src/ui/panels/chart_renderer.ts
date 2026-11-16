/**
 * EFLab Alpha 0.1 - 经济折线图与双轨对比渲染器 (Economic Chart Renderer)
 * 严格遵循 docs/specs/05_UI_Panels_Lab_三大面板与对照实验室.md
 */

import type { SimulationState } from '../../core/prng/types.js';

export interface ChartSeries {
  name: string;
  color: string;
  data: number[];
  dashed?: boolean;
}

export interface ChartOptions {
  width: number;
  height: number;
  title: string;
  yUnit?: string;
  showEventMarkers?: boolean;
}

/**
 * 绘制带关键事件垂直打标线的经济时间序列折线图
 */
export function renderTimeSeriesChart(
  ctx: CanvasRenderingContext2D,
  seriesList: ChartSeries[],
  history: SimulationState[],
  options: ChartOptions
): void {
  const { width, height, title, yUnit = '', showEventMarkers = true } = options;
  ctx.clearRect(0, 0, width, height);

  // 背景
  ctx.fillStyle = '#1A1E24';
  ctx.fillRect(0, 0, width, height);

  const padLeft = 60;
  const padRight = 30;
  const padTop = 40;
  const padBottom = 40;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  // 标题
  ctx.fillStyle = '#E6E2D8';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(title, padLeft, 24);

  if (seriesList.length === 0 || seriesList[0]!.data.length === 0) {
    ctx.fillStyle = '#888888';
    ctx.textAlign = 'center';
    ctx.fillText('暂无数据', width / 2, height / 2);
    return;
  }

  // 计算 Y 轴极值
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const s of seriesList) {
    for (const v of s.data) {
      if (!Number.isNaN(v)) {
        minY = Math.min(minY, v);
        maxY = Math.max(maxY, v);
      }
    }
  }

  if (minY === maxY) {
    minY -= 1;
    maxY += 1;
  }
  // 留出 10% 上下缓冲区
  const ySpan = maxY - minY;
  minY -= ySpan * 0.05;
  maxY += ySpan * 0.05;

  const maxMonths = 60;

  // 网格线与 Y 轴刻度
  ctx.strokeStyle = '#2B313B';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#8E95A0';
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';

  const ySteps = 4;
  for (let i = 0; i <= ySteps; i++) {
    const yVal = minY + ((maxY - minY) * i) / ySteps;
    const py = padTop + plotH - (plotH * i) / ySteps;
    ctx.beginPath();
    ctx.moveTo(padLeft, py);
    ctx.lineTo(width - padRight, py);
    ctx.stroke();
    ctx.fillText(`${yVal.toFixed(1)}${yUnit}`, padLeft - 6, py + 3);
  }

  // X 轴刻度 (0, 12, 24, 36, 48, 60)
  ctx.textAlign = 'center';
  for (let m = 0; m <= maxMonths; m += 12) {
    const px = padLeft + (plotW * m) / maxMonths;
    ctx.beginPath();
    ctx.moveTo(px, padTop + plotH);
    ctx.lineTo(px, padTop + plotH + 5);
    ctx.stroke();
    ctx.fillText(`${m}M`, px, padTop + plotH + 18);
  }

  // 垂直事件标记线 (Event Markers)
  if (showEventMarkers && history) {
    for (const snap of history) {
      if (snap.events && snap.events.length > 0) {
        const px = padLeft + (plotW * snap.month) / maxMonths;
        for (const evt of snap.events) {
          let markerColor = '#4A90E2'; // 默认政策蓝
          if (evt.category === 'SHOCK_TRIGGER') markerColor = '#E63946'; // 冲击红
          if (evt.category === 'PROJECT_STATUS') markerColor = '#F2B705'; // 基建黄

          ctx.strokeStyle = markerColor;
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(px, padTop);
          ctx.lineTo(px, padTop + plotH);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
  }

  // 绘制各数据曲线
  for (const s of seriesList) {
    if (s.data.length === 0) continue;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    if (s.dashed) {
      ctx.setLineDash([5, 4]);
    } else {
      ctx.setLineDash([]);
    }

    ctx.beginPath();
    for (let i = 0; i < s.data.length; i++) {
      const val = s.data[i]!;
      const px = padLeft + (plotW * i) / maxMonths;
      const py = padTop + plotH - ((val - minY) / (maxY - minY)) * plotH;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 图例
  let legX = width - padRight - 10;
  ctx.textAlign = 'right';
  ctx.font = '11px sans-serif';
  for (let i = seriesList.length - 1; i >= 0; i--) {
    const s = seriesList[i]!;
    ctx.fillStyle = s.color;
    ctx.fillRect(legX - 16, 14, 12, 8);
    ctx.fillStyle = '#E6E2D8';
    ctx.fillText(s.name, legX - 22, 22);
    legX -= ctx.measureText(s.name).width + 36;
  }
}
