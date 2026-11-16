/**
 * EFLab Alpha 0.1 - 全局状态字典契约 (Global State Schema Contract)
 * 严格遵循 docs/specs/01_Data_Contract_数据契约与PRNG规范.md
 */

export type HouseholdClassId = 'working' | 'middle' | 'capitalist';
export type SectorId = 'food' | 'goods' | 'capital';
export type ProjectId = 'road_improvement' | 'energy_expansion';
export type ShockId = 'confidence_drop' | 'productivity_drop';
export type VisualTier = 'LOW' | 'MID' | 'HIGH';

/** 单一居民阶层状态 */
export interface HouseholdClassState {
  id: HouseholdClassId;
  name: string;
  populationLimit: number;       // 人口/户数上限 (working: 800, middle: 200, capitalist: 50)
  employed: number;              // 当期就业人数 (capitalist 固定为 0)
  unemploymentRate: number;      // 失业率 [0, 1] (capitalist 固定为 0)
  wageRate: number;              // 当期人均月薪 (k/人, capitalist 固定为 0)
  mpc: number;                   // 基准边际消费倾向 (working: 0.85, middle: 0.70, capitalist: 0.40)
  foodShare: number;             // 消费预算中食品占比 (working: 0.40, middle: 0.20, capitalist: 0.05)
  goodsShare: number;            // 消费预算中消费品占比 (working: 0.60, middle: 0.80, capitalist: 0.95)
  taxMultiplier: number;         // 相对基准税率 τ 的累进乘数 (0.75 / 1.00 / 1.25)

  // 存量账本 (Stock)
  deposits: number;              // 在基础银行的存款余额 (k)

  // 当月流量明细 (Monthly Flows)
  wageIncome: number;            // 当月税前工资总收入 (k)
  dividendIncome: number;        // 当月税前分红总收入 (k)
  transferIncome: number;        // 当月市政民生转移支付收入 (k)
  interestIncome: number;        // 当月银行存款利息收入 (k)
  taxPaid: number;               // 当月缴纳个人所得税/分红税总额 (k)
  disposableIncome: number;      // 当月税后可支配总收入 (k)
  plannedConsumptionFood: number;// 计划购买食品金额 (k)
  plannedConsumptionGoods: number;// 计划购买消费品金额 (k)
  actualConsumptionFood: number; // 实际成交食品金额 (k)
  actualConsumptionGoods: number;// 实际成交消费品金额 (k)
  forcedSaving: number;          // 因缺货配给产生的强制储蓄金额 (k)
  netSavingFlow: number;         // 当月净储蓄流入 (k) = disposableIncome - actualConsumption
}

/** 单一企业行业汇总状态 */
export interface SectorState {
  id: SectorId;
  name: string;
  requiredWorkerPerManager: number; // 标准工管配比 (food: 5, goods: 5, capital: 4)
  baseTfp: number;                  // 行业基准全要素生产率系数

  // 存量账本 (Stock)
  cash: number;                     // 企业自有流动资金存款 (存放在基础银行的企业活期账户, k)
  loans: number;                    // 尚欠基础银行的经营/投资贷款余额 (k)
  capitalStock: number;             // 物理固定资本存量 (机器设备台套标准量)
  inventory: number;                // 期末实物商品库存量 (单位：标准件)
  targetInventoryRatio: number;     // 目标安全库存占月均销量比例 (默认 0.25)

  // 价格与生产状态
  price: number;                    // 当期单件售价 (k/件)
  targetOutput: number;             // Step 2 计划排产量 (件)
  actualOutput: number;             // Step 4 实际产出量 (件)
  capacityLimit: number;            // 当期固定资本对应的最大产能上限 (件)
  capacityUtilization: number;      // 产能利用率 = actualOutput / capacityLimit

  // 劳动力与管理协同
  employedWorkers: number;          // 在岗底层工人数
  employedManagers: number;         // 在岗中层管理数
  targetWorkers: number;            // 计划需求底层工人数
  targetManagers: number;           // 计划需求中层管理数
  managementEfficiency: number;     // 管理协同效率系数 φ_mgmt ∈ [0.70, 1.00]

  // 当月流量明细 (Monthly Flows)
  demandUnits: number;              // Step 6 市场汇总需求量 (件)
  salesUnits: number;               // Step 7 实际出清销售量 (件)
  unmetDemandUnits: number;         // Step 7 因配给未满足的需求量 (件)
  revenue: number;                  // 销售总收入 (k)
  wageBill: number;                 // 支付给工人与管理层的薪资总额 (k)
  interestPaid: number;             // 支付给银行的贷款利息 (k)
  depreciationUnits: number;        // 当月自然折旧物理量 (2.0% * capitalStock)
  replacementOrderUnits: number;    // 折旧更新资本品需求量 (件)
  expansionOrderUnits: number;      // 净扩产资本品需求量 (件, 5.0% * capitalStock)
  actualCapitalPurchasedUnits: number; // Step 7 实际买到的资本品数量 (件)
  capitalPurchaseCost: number;      // 实际支付的资本品采购总额 (k, 含折旧重置与扩产支出)
  accountingProfit: number;         // 核算营业利润 (k) = revenue - wageBill - interestPaid - depreciationCost
  dividendsPaid: number;            // 向资本家发放的税前分红总额 (k)
}

/** 基础银行（纯信用中介）状态 */
export interface BankState {
  // 利率参数
  depositRateMonthly: number;       // 月度存款利率 (默认 0.002)
  loanRateMonthly: number;          // 月度贷款利率 (默认 0.005)
  maxLoanToDepositRatio: number;    // 最高存贷比硬约束 (默认 0.85)
  reserveCash: number;              // 银行金库留存未贷出现金 (k)

  // 资产负债汇总 (Stock)
  totalHouseholdDeposits: number;   // 三阶层居民存款总额 (k)
  totalCorporateDeposits: number;   // 三行业企业活期现金存款总额 (k)
  municipalDeposits: number;        // 市政厅财政存款余额 (k)
  totalDeposits: number;            // 银行总负债：吸收存款合计 (k)
  totalCorporateLoans: number;      // 对三行业企业贷款总额 (k)
  municipalLoans: number;           // 对市政厅赤字融资贷款余额 (k)
  totalLoans: number;               // 银行生息资产：发放贷款合计 (k)
  equityBuffer: number;             // 银行自有资本留存缓冲池 (k)

  // 当月流量明细
  interestIncome: number;           // 收到企业与市政贷款利息合计 (k)
  interestExpense: number;          // 支付给居民存款利息合计 (k)
  netProfit: number;                // 银行当月净利润 (k)
  dividendsPaid: number;            // 向资本家发放的银行分红 (k)
}

/** 公共基建项目状态 */
export interface PublicProjectState {
  id: ProjectId;
  name: string;
  status: 'IDLE' | 'ACTIVE' | 'SUSPENDED_NO_FUNDS' | 'COMPLETED';
  totalRequiredMonths: number;      // 标准建设工期 (月)
  progressedMonths: number;         // 已有效施工月数
  monthlyCapitalGoodsDemand: number;// 每施工月需采购资本品数量 (件)
  monthlyWorkerDemand: number;      // 每施工月需临时用工/补贴人数
  monthlyBudgetCost: number;        // 预计每月标准预算消耗 (k)
  permanentBonusApplied: boolean;   // 完工永久增益是否已激活
}

/** 市政部门状态 */
export interface MunicipalState {
  // 政策控制变量 (当前已生效)
  baseTaxRate: number;              // 基准个税率 τ ∈ [0.05, 0.50]，默认 0.20
  publicServiceBudgetTarget: number;// 每月公共服务目标预算 (k)，默认 180.0
  transferShareOfService: number;   // 公共服务预算中用于民生转移支付比例 (默认 0.50)

  // 延迟生效队列 (下月 Step 1 激活)
  pendingBaseTaxRate: number | null;
  pendingPublicServiceBudget: number | null;

  // 存量账本 (Stock)
  cashDeposits: number;             // 市政厅在银行的财政存款 (k)
  debtLoans: number;                // 市政厅累计向银行借入的赤字债务 (k)
  debtCeiling: number;              // 法定最高举债上限 (k，默认 1500.0)

  // 当月流量明细
  taxRevenueWorking: number;        // 底层工薪个税收入 (k)
  taxRevenueMiddle: number;         // 中层工薪个税收入 (k)
  taxRevenueCapitalist: number;     // 资本家分红税收入 (k)
  totalTaxRevenue: number;          // 当月总税收 (k)
  transferPayoutTotal: number;      // 当月实际发放民生补贴总额 (k)
  govtGoodsPurchaseActual: number;  // 当月公务采购消费品实际支出 (k)
  projectCapitalPurchaseActual: number; // 当月在建基建项目采购资本品实际支出 (k)
  interestPaid: number;             // 市政债务利息支出 (k)
  fiscalBalance: number;            // 当月财政盈余/赤字 (k) = totalTaxRevenue - 总支出
  projects: Record<ProjectId, PublicProjectState>;
}

/** 外生冲击状态 */
export interface ActiveShockState {
  id: ShockId;
  name: string;
  active: boolean;
  startMonth: number;
  remainingMonths: number;          // 剩余持续月数
  magnitude: number;                // 冲击强度参数
}

/** 宏观统计与事件归因 */
export interface MacroMetrics {
  nominalGdp: number;               // 支出法名义 GDP (k): C + I + G
  realGdp: number;                  // 按第 0 月不变价计算的实际 GDP (k)
  gdpYoY: number | null;            // 实际 GDP 同比增长率 (month < 12 时严格为 null)
  cpi: number;                      // 居民消费价格指数 (第 0 月基准 = 100.0，不含资本品)
  inflationYoY: number | null;      // CPI 同比通胀率 (month < 12 时严格为 null)
  overallUnemploymentRate: number;  // 全城综合失业率 = (失业工人+失业管理) / (800+200)
  prosperityIndex: number;          // 综合景气指数 [0, 100]
  logisticsLossRate: number;        // 全城物流损耗率 (默认 0.03)
  energyEfficiencyBonus: number;    // 能源扩容生产率加成 (默认 1.00)
}

export interface TraceableEventCard {
  id: string;
  month: number;
  category: 'POLICY_ACTIVE' | 'SHOCK_TRIGGER' | 'PROJECT_STATUS' | 'MECHANISM_ALERT' | 'CORRELATED_CHANGE';
  attributionType: 'DETERMINISTIC_MECHANISM' | 'CORRELATED_OBSERVATION';
  title: string;
  description: string;
  relatedMetrics: string[];
}

/** 像素城 8 项防闪烁滞回视觉档位 */
export interface CityVisualHysteresisState {
  workingConsumptionTier: VisualTier;
  middleConsumptionTier: VisualTier;
  capitalistConsumptionTier: VisualTier;
  employmentHealthTier: VisualTier;
  foodSectorActivityTier: VisualTier;
  goodsSectorActivityTier: VisualTier;
  capitalSectorActivityTier: VisualTier;
  inventoryPileTier: VisualTier;
}

/** SFC 配平核验快照 */
export interface SfcAuditResult {
  month: number;
  passed: boolean;
  maxAbsDiscrepancy: number;
  moneyPoolConservationError: number;  // 银行现金池恒等误差
  flowIdentityError: number;           // 部门收支净额与存量变动恒等误差
  minInventoryAcrossSectors: number;   // 最小库存值 (必须 >= 0)
  details: string[];
}

/** 单月完整状态快照 (Core 产出并交给 UI 的唯一权威结构) */
export interface SimulationState {
  version: string;                  // 固定为 "EFLab-Alpha-0.1"
  seed: number;                     // 32-bit 整数随机种子
  month: number;                    // 当前月份 (0 ~ 60)
  households: Record<HouseholdClassId, HouseholdClassState>;
  sectors: Record<SectorId, SectorState>;
  bank: BankState;
  municipal: MunicipalState;
  shocks: Record<ShockId, ActiveShockState>;
  metrics: MacroMetrics;
  visualState: CityVisualHysteresisState;
  events: TraceableEventCard[];
  sfcAudit: SfcAuditResult;
}
