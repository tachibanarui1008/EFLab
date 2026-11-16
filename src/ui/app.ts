/**
 * EFLab Alpha 0.1 - 全局前端控制器与交互编排 (Application Controller)
 * 严格遵循 docs/specs/05_UI_Panels_Lab_三大面板与对照实验室.md
 */

import {
  createInitialState,
  serializeArchive,
  deserializeArchive,
  type SimulationState,
} from '../core/prng/index.js';
import {
  stepMonth,
  setPendingBaseTaxRate,
  setPendingPublicServiceBudget,
  startPublicProject,
  triggerShock,
} from '../core/engine/index.js';
import {
  renderPixelCity,
  hitTestBuilding,
  formatBuildingTooltip,
  TILE_SIZE,
  type BuildingMetadata,
} from './city_canvas/index.js';
import { formatTopHud } from './panels/top_hud.js';
import { renderTimeSeriesChart, type ChartSeries } from './panels/chart_renderer.js';
import { ComparisonLab } from './lab/comparison_lab.js';

export type ActiveTab = 'city' | 'explanation' | 'lab';

export class EFLabApp {
  public history: SimulationState[] = [];
  public lab: ComparisonLab;
  public activeTab: ActiveTab = 'city';
  public selectedBuilding: BuildingMetadata | null = null;
  public hoveredBuilding: BuildingMetadata | null = null;

  public isPlaying: boolean = false;
  public playbackSpeed: 1 | 3 = 1;
  private timerId: number | null = null;

  constructor(public seed: number = 42) {
    const s0 = createInitialState(this.seed);
    this.history = [s0];
    this.lab = new ComparisonLab(s0);
  }

  public getCurrentState(): SimulationState {
    return this.history[this.history.length - 1]!;
  }

  /**
   * 步进 1 个月
   */
  public step(): void {
    const curr = this.getCurrentState();
    if (curr.month >= 60) {
      this.pause();
      return;
    }
    const nextState = stepMonth(curr, this.history);
    this.history.push(nextState);

    // 如果在实验室标签，双轨同步步进
    if (this.activeTab === 'lab') {
      this.lab.stepSynchronized();
    }
  }

  public togglePlay(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public play(): void {
    if (this.getCurrentState().month >= 60) return;
    this.isPlaying = true;
    const interval = this.playbackSpeed === 1 ? 1200 : 400;
    this.timerId = window.setInterval(() => {
      if (this.getCurrentState().month >= 60) {
        this.pause();
        return;
      }
      this.step();
      this.triggerRender();
    }, interval);
  }

  public pause(): void {
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public setSpeed(speed: 1 | 3): void {
    this.playbackSpeed = speed;
    if (this.isPlaying) {
      this.pause();
      this.play();
    }
  }

  public reset(): void {
    this.pause();
    const s0 = createInitialState(this.seed);
    this.history = [s0];
    this.lab.reset(s0);
    this.selectedBuilding = null;
    this.hoveredBuilding = null;
  }

  public setTaxRate(rate: number): void {
    setPendingBaseTaxRate(this.getCurrentState(), rate);
  }

  public setBudget(budget: number): void {
    setPendingPublicServiceBudget(this.getCurrentState(), budget);
  }

  public startProject(projectId: 'road_improvement' | 'energy_expansion'): boolean {
    return startPublicProject(this.getCurrentState(), projectId);
  }

  public injectShock(shockId: 'confidence_drop' | 'productivity_drop'): boolean {
    return triggerShock(this.getCurrentState(), shockId, 6);
  }

  public exportJson(): string {
    return serializeArchive(this.history);
  }

  public importJson(jsonStr: string): void {
    this.pause();
    const payload = deserializeArchive(jsonStr);
    this.seed = payload.seed;
    this.history = payload.history;
    this.lab.reset(this.history[0]!);
  }

  // 占位回调，供前端页面绑定重绘事件
  public onRender: (() => void) | null = null;
  public triggerRender(): void {
    if (this.onRender) this.onRender();
  }
}
