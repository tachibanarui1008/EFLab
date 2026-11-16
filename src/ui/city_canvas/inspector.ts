/**
 * EFLab Alpha 0.1 - 建筑点击检查器与汇总浮层格式化 (Aggregate Tooltip Inspector)
 * 严格遵循 docs/specs/04_Pixel_City_Visual_像素城市与视觉状态机.md
 */

import type { SimulationState } from '../../core/prng/types.js';
import type { BuildingMetadata } from './buildings_layout.js';

export interface TooltipContent {
  title: string;
  categoryTag: string;
  rows: Array<{ label: string; value: string; highlight?: boolean }>;
}

export function formatBuildingTooltip(
  building: BuildingMetadata,
  state: SimulationState
): TooltipContent {
  switch (building.id) {
    case 'B01': {
      const h = state.households.working;
      return {
        title: building.name,
        categoryTag: '【底层工人阶层 — 全城汇总数据】',
        rows: [
          { label: '总人口上限', value: `${h.populationLimit} 人` },
          { label: '在岗就业人数', value: `${h.employed} 人` },
          { label: '阶层失业率', value: `${(h.unemploymentRate * 100).toFixed(1)}%` },
          { label: '当期月薪', value: `${h.wageRate.toFixed(2)} k/人` },
          { label: '税后可支配总收入', value: `${h.disposableIncome.toFixed(1)} k` },
          { label: '实际消费支出', value: `食品 ${(h.actualConsumptionFood).toFixed(1)}k / 消费品 ${(h.actualConsumptionGoods).toFixed(1)}k` },
          { label: '强制储蓄（缺货）', value: `${h.forcedSaving.toFixed(1)} k` },
          { label: '银行存款存量', value: `${h.deposits.toFixed(1)} k`, highlight: true },
          { label: '消费视觉档位', value: state.visualState.workingConsumptionTier },
        ],
      };
    }
    case 'B02': {
      const h = state.households.middle;
      return {
        title: building.name,
        categoryTag: '【中层管理阶层 — 全城汇总数据】',
        rows: [
          { label: '总人口上限', value: `${h.populationLimit} 人` },
          { label: '在岗就业人数', value: `${h.employed} 人` },
          { label: '阶层失业率', value: `${(h.unemploymentRate * 100).toFixed(1)}%` },
          { label: '当期月薪', value: `${h.wageRate.toFixed(2)} k/人` },
          { label: '税后可支配总收入', value: `${h.disposableIncome.toFixed(1)} k` },
          { label: '实际消费支出', value: `食品 ${(h.actualConsumptionFood).toFixed(1)}k / 消费品 ${(h.actualConsumptionGoods).toFixed(1)}k` },
          { label: '银行存款存量', value: `${h.deposits.toFixed(1)} k`, highlight: true },
          { label: '消费视觉档位', value: state.visualState.middleConsumptionTier },
        ],
      };
    }
    case 'B03': {
      const h = state.households.capitalist;
      return {
        title: building.name,
        categoryTag: '【资本家阶层 — 全城汇总数据】',
        rows: [
          { label: '户数规模', value: `${h.populationLimit} 户 (不参与劳动力市场求职)` },
          { label: '当月分红总收入', value: `${h.dividendIncome.toFixed(1)} k` },
          { label: '缴纳分红税款', value: `${h.taxPaid.toFixed(1)} k (适用税率 1.25τ)` },
          { label: '实际消费支出', value: `食品 ${(h.actualConsumptionFood).toFixed(1)}k / 消费品 ${(h.actualConsumptionGoods).toFixed(1)}k` },
          { label: '银行存款存量', value: `${h.deposits.toFixed(1)} k`, highlight: true },
          { label: '消费视觉档位', value: state.visualState.capitalistConsumptionTier },
        ],
      };
    }
    case 'B04': {
      const totalC =
        state.households.working.actualConsumptionFood +
        state.households.working.actualConsumptionGoods +
        state.households.middle.actualConsumptionFood +
        state.households.middle.actualConsumptionGoods +
        state.households.capitalist.actualConsumptionFood +
        state.households.capitalist.actualConsumptionGoods;
      return {
        title: building.name,
        categoryTag: '【中心商业街 — 全城商品零售汇总】',
        rows: [
          { label: '全城居民当月总消费', value: `${totalC.toFixed(1)} k`, highlight: true },
          { label: '食品销售总额', value: `${state.sectors.food.revenue.toFixed(1)} k` },
          { label: '消费品销售总额', value: `${state.sectors.goods.revenue.toFixed(1)} k` },
          { label: '全城居民强制储蓄', value: `${(state.households.working.forcedSaving + state.households.middle.forcedSaving + state.households.capitalist.forcedSaving).toFixed(1)} k` },
        ],
      };
    }
    case 'B05': {
      const m = state.municipal;
      return {
        title: building.name,
        categoryTag: '【市政厅 — 全城财政收支汇总】',
        rows: [
          { label: '基准个人所得税率 τ', value: `${(m.baseTaxRate * 100).toFixed(1)}%` },
          { label: '当月总税收收入', value: `${m.totalTaxRevenue.toFixed(1)} k` },
          { label: '民生转移支付支出', value: `${m.transferPayoutTotal.toFixed(1)} k` },
          { label: '公务消费品采购支出', value: `${m.govtGoodsPurchaseActual.toFixed(1)} k` },
          { label: '基建项目采购支出', value: `${m.projectCapitalPurchaseActual.toFixed(1)} k` },
          { label: '市政财政存款', value: `${m.cashDeposits.toFixed(1)} k` },
          { label: '市政债务 / 上限', value: `${m.debtLoans.toFixed(1)} / ${m.debtCeiling.toFixed(1)} k`, highlight: true },
          { label: '当月财政盈余/赤字', value: `${m.fiscalBalance >= 0 ? '+' : ''}${m.fiscalBalance.toFixed(1)} k` },
        ],
      };
    }
    case 'B06': {
      const b = state.bank;
      const ldr = b.totalDeposits > 0 ? (b.totalLoans / b.totalDeposits) * 100 : 0;
      return {
        title: building.name,
        categoryTag: '【基础银行 — 全城信用中介汇总】',
        rows: [
          { label: '吸收存款总额', value: `${b.totalDeposits.toFixed(1)} k (居民 ${b.totalHouseholdDeposits.toFixed(1)}k / 企业 ${b.totalCorporateDeposits.toFixed(1)}k)` },
          { label: '发放贷款总额', value: `${b.totalLoans.toFixed(1)} k (企业 ${b.totalCorporateLoans.toFixed(1)}k / 市政 ${b.municipalLoans.toFixed(1)}k)` },
          { label: '当前存贷比 / 上限', value: `${ldr.toFixed(1)}% / ${(b.maxLoanToDepositRatio * 100).toFixed(1)}%`, highlight: true },
          { label: '金库留存现金准备', value: `${b.reserveCash.toFixed(1)} k` },
          { label: '自有资本留存缓冲池', value: `${b.equityBuffer.toFixed(1)} k` },
          { label: '当月存贷净利差利润', value: `${b.netProfit.toFixed(1)} k` },
        ],
      };
    }
    case 'B07': {
      const p = state.municipal.projects.road_improvement;
      return {
        title: building.name,
        categoryTag: '【道路改善工程 — 市政公共基建】',
        rows: [
          { label: '工程状态', value: p.status, highlight: true },
          { label: '有效施工进度', value: `${p.progressedMonths.toFixed(1)} / ${p.totalRequiredMonths} 个月` },
          { label: '月度资本品需求', value: `${p.monthlyCapitalGoodsDemand} 件/月` },
          { label: '全城物流损耗率', value: `${(state.metrics.logisticsLossRate * 100).toFixed(1)}% (完工降至 0.5%)` },
          { label: '永久增益激活', value: p.permanentBonusApplied ? '已激活 ✓' : '未激活' },
        ],
      };
    }
    case 'B08': {
      const p = state.municipal.projects.energy_expansion;
      return {
        title: building.name,
        categoryTag: '【能源扩容工程 — 市政公共基建】',
        rows: [
          { label: '工程状态', value: p.status, highlight: true },
          { label: '有效施工进度', value: `${p.progressedMonths.toFixed(1)} / ${p.totalRequiredMonths} 个月` },
          { label: '月度资本品需求', value: `${p.monthlyCapitalGoodsDemand} 件/月` },
          { label: '全城生产效率加成', value: `${((state.metrics.energyEfficiencyBonus - 1) * 100).toFixed(1)}% (完工提升 8%)` },
          { label: '永久增益激活', value: p.permanentBonusApplied ? '已激活 ✓' : '未激活' },
        ],
      };
    }
    case 'B09':
    case 'B10':
    case 'B11': {
      const sid = building.id === 'B09' ? 'food' : building.id === 'B10' ? 'goods' : 'capital';
      const s = state.sectors[sid];
      return {
        title: building.name,
        categoryTag: `【${s.name} — 全行业汇总数据】`,
        rows: [
          { label: '单件售价', value: `${s.price.toFixed(2)} k/件` },
          { label: '计划排产 vs 实际产出', value: `${s.targetOutput.toFixed(1)} / ${s.actualOutput.toFixed(1)} 件` },
          { label: '产能利用率', value: `${(s.capacityUtilization * 100).toFixed(1)}%`, highlight: true },
          { label: '在岗工人 / 在岗管理', value: `${s.employedWorkers} 人 / ${s.employedManagers} 人` },
          { label: '管理协同效率系数', value: `${(s.managementEfficiency * 100).toFixed(1)}% ${s.managementEfficiency < 1.0 ? '⚠️ (管理短缺)' : '✓'}` },
          { label: '期末实物商品库存', value: `${s.inventory.toFixed(1)} 件 (非负安全库存)` },
          { label: '当月销售营收', value: `${s.revenue.toFixed(1)} k` },
          { label: '向资本家发放分红', value: `${s.dividendsPaid.toFixed(1)} k (利润的 80%)` },
          { label: '企业自有活期现金', value: `${s.cash.toFixed(1)} k` },
          { label: '尚欠银行贷款余额', value: `${s.loans.toFixed(1)} k` },
        ],
      };
    }
    case 'B12': {
      const totalInv =
        state.sectors.food.inventory +
        state.sectors.goods.inventory +
        state.sectors.capital.inventory;
      return {
        title: building.name,
        categoryTag: '【全城综合物流货场 — 实物库存汇总】',
        rows: [
          { label: '全城实物总库存量', value: `${totalInv.toFixed(1)} 件`, highlight: true },
          { label: '食品行业期末库存', value: `${state.sectors.food.inventory.toFixed(1)} 件` },
          { label: '消费品行业期末库存', value: `${state.sectors.goods.inventory.toFixed(1)} 件` },
          { label: '资本品行业期末库存', value: `${state.sectors.capital.inventory.toFixed(1)} 件` },
          { label: '堆场库存堆高视觉档位', value: state.visualState.inventoryPileTier },
        ],
      };
    }
    default:
      return {
        title: building.name,
        categoryTag: '【汇总设施】',
        rows: [],
      };
  }
}
