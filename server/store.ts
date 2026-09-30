import { TEMPLATES } from './templates';
import { runBacktest } from './backtester';

export interface Strategy {
  id: number;
  name: string;
  description: string;
  template: string | null;
  risk_profile: string;
  created_at: string;
  updated_at: string;
}

export interface StrategyVersion {
  id: number;
  strategy_id: number;
  version_number: number;
  pine_script: string;
  parameters: string; // JSON string
  explanation: string;
  is_current: boolean;
  created_at: string;
}

export interface BacktestRecord {
  id: number;
  strategy_id: number;
  version_id: number | null;
  params: string;
  initial_capital: number;
  final_capital: number;
  return_pct: number;
  num_trades: number;
  win_rate: number;
  max_drawdown: number;
  profit_factor: number;
  sharpe_ratio: number;
  source: string;
  equity_curve: string;
  created_at: string;
}

export interface ReportRecord {
  id: number;
  strategy_id: number;
  content: string;
  created_at: string;
}

class InMemoryStore {
  private strategies: Strategy[] = [];
  private versions: StrategyVersion[] = [];
  private backtests: BacktestRecord[] = [];
  private reports: ReportRecord[] = [];

  private nextStratId = 1;
  private nextVersionId = 1;
  private nextBtId = 1;
  private nextReportId = 1;

  constructor() {
    this.seed();
  }

  private seed() {
    // Seed Strategy 1: SMA Cross BTC
    const now = new Date().toISOString();
    const strat1 = this.createStrategy({
      name: "SMA Cross 20/50 Bitcoin",
      description: "Stratégie tendancielle classique basée sur le croisement SMA 20 et SMA 50 sur Bitcoin journalier.",
      template: "sma",
      risk_profile: "moderate"
    });

    const v1 = this.createVersion(strat1.id, {
      pine_script: TEMPLATES.sma.generate({ fast_length: 20, slow_length: 50, stop_loss_pct: 2.0, take_profit_pct: 4.0 }),
      parameters: { fast_length: 20, slow_length: 50, stop_loss_pct: 2.0, take_profit_pct: 4.0 },
      explanation: "Version initiale calibrée sur BTC/USD daily."
    });

    const bt1Metrics = runBacktest('sma', { fast_length: 20, slow_length: 50, stop_loss_pct: 2.0, take_profit_pct: 4.0 }, 10000);
    const bt1 = this.createBacktest({
      strategy_id: strat1.id,
      version_id: v1.id,
      params: { fast_length: 20, slow_length: 50, stop_loss_pct: 2.0, take_profit_pct: 4.0 },
      source: "local",
      ...bt1Metrics
    });

    // Seed Strategy 2: Supertrend Strategy
    const strat2 = this.createStrategy({
      name: "Supertrend Trend Following",
      description: "Suivi de tendance dynamique via ATR factor 3.0 et période 10.",
      template: "supertrend",
      risk_profile: "aggressive"
    });

    const v2 = this.createVersion(strat2.id, {
      pine_script: TEMPLATES.supertrend.generate({ atr_period: 10, factor: 3.0, stop_loss_pct: 2.0, take_profit_pct: 6.0 }),
      parameters: { atr_period: 10, factor: 3.0, stop_loss_pct: 2.0, take_profit_pct: 6.0 },
      explanation: "Version paramétrée pour capturer les grands mouvements haussiers du BTC."
    });

    const bt2Metrics = runBacktest('supertrend', { atr_period: 10, factor: 3.0, stop_loss_pct: 2.0, take_profit_pct: 6.0 }, 10000);
    this.createBacktest({
      strategy_id: strat2.id,
      version_id: v2.id,
      params: { atr_period: 10, factor: 3.0, stop_loss_pct: 2.0, take_profit_pct: 6.0 },
      source: "local",
      ...bt2Metrics
    });

    // Seed Strategy 3: Combined Multi-Indicator
    const strat3 = this.createStrategy({
      name: "SMA + RSI + ADX Triple Confirmation",
      description: "Combinaison haute précision : filtre tendance SMA 50 + timing RSI 40 + filtre de force ADX > 20.",
      template: "combined",
      risk_profile: "conservative"
    });

    const v3 = this.createVersion(strat3.id, {
      pine_script: TEMPLATES.combined.generate({ sma_length: 50, rsi_length: 14, rsi_oversold: 40, adx_length: 14, adx_threshold: 20, stop_loss_pct: 2.0, take_profit_pct: 5.0 }),
      parameters: { sma_length: 50, rsi_length: 14, rsi_oversold: 40, adx_length: 14, adx_threshold: 20, stop_loss_pct: 2.0, take_profit_pct: 5.0 },
      explanation: "Stratégie défensive avec confirmation triple signal pour éviter les faux signaux."
    });

    const bt3Metrics = runBacktest('combined', { sma_length: 50, rsi_length: 14, rsi_oversold: 40, adx_length: 14, adx_threshold: 20, stop_loss_pct: 2.0, take_profit_pct: 5.0 }, 10000);
    this.createBacktest({
      strategy_id: strat3.id,
      version_id: v3.id,
      params: { sma_length: 50, rsi_length: 14, rsi_oversold: 40, adx_length: 14, adx_threshold: 20, stop_loss_pct: 2.0, take_profit_pct: 5.0 },
      source: "local",
      ...bt3Metrics
    });

    // Initial Report
    this.createReport(strat1.id, `# Rapport — ${strat1.name}
> Généré le ${new Date().toLocaleDateString('fr-FR')}

---

## ⚠️ Avertissement
> **Ce rapport est basé sur des simulations historiques.**
> Les performances passées ne garantissent pas les performances futures.
> Mode papier uniquement — aucun ordre réel n'est exécuté.

---

## 1. Description de la stratégie
- **Nom :** ${strat1.name}
- **Profil de risque :** ${strat1.risk_profile}
- **Template :** ${strat1.template}

${strat1.description}

---

## 2. Performances simulées
- **Capital initial :** 10 000 $
- **Capital final :** ${bt1Metrics.final_capital.toLocaleString()} $
- **Rendement :** ${bt1Metrics.return_pct > 0 ? '+' : ''}${bt1Metrics.return_pct} %
- **Win Rate :** ${bt1Metrics.win_rate} %
- **Max Drawdown :** ${bt1Metrics.max_drawdown} %
- **Sharpe Ratio :** ${bt1Metrics.sharpe_ratio}
`);
  }

  // Strategies
  listStrategies(): Strategy[] {
    return [...this.strategies].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getStrategy(id: number): Strategy | undefined {
    return this.strategies.find(s => s.id === id);
  }

  createStrategy(data: { name: string; description?: string; template?: string | null; risk_profile?: string }): Strategy {
    const now = new Date().toISOString();
    const strat: Strategy = {
      id: this.nextStratId++,
      name: data.name,
      description: data.description || '',
      template: data.template ?? null,
      risk_profile: data.risk_profile || 'moderate',
      created_at: now,
      updated_at: now,
    };
    this.strategies.push(strat);
    return strat;
  }

  deleteStrategy(id: number): boolean {
    const idx = this.strategies.findIndex(s => s.id === id);
    if (idx === -1) return false;
    this.strategies.splice(idx, 1);
    this.versions = this.versions.filter(v => v.strategy_id !== id);
    this.backtests = this.backtests.filter(b => b.strategy_id !== id);
    this.reports = this.reports.filter(r => r.strategy_id !== id);
    return true;
  }

  // Versions
  listVersions(strategyId: number): StrategyVersion[] {
    return this.versions
      .filter(v => v.strategy_id === strategyId)
      .sort((a, b) => b.version_number - a.version_number);
  }

  getVersion(strategyId: number, versionId: number): StrategyVersion | undefined {
    return this.versions.find(v => v.strategy_id === strategyId && v.id === versionId);
  }

  getCurrentVersion(strategyId: number): StrategyVersion | undefined {
    return this.versions.find(v => v.strategy_id === strategyId && v.is_current) ||
      this.listVersions(strategyId)[0];
  }

  createVersion(strategyId: number, data: { pine_script: string; parameters: Record<string, unknown>; explanation?: string }): StrategyVersion {
    // Unset other currents
    this.versions.filter(v => v.strategy_id === strategyId).forEach(v => { v.is_current = false; });

    const existing = this.listVersions(strategyId);
    const nextVer = existing.length > 0 ? existing[0].version_number + 1 : 1;
    const now = new Date().toISOString();

    const ver: StrategyVersion = {
      id: this.nextVersionId++,
      strategy_id: strategyId,
      version_number: nextVer,
      pine_script: data.pine_script,
      parameters: JSON.stringify(data.parameters || {}),
      explanation: data.explanation || '',
      is_current: true,
      created_at: now,
    };
    this.versions.push(ver);
    return ver;
  }

  // Backtests
  listBacktests(strategyId: number): BacktestRecord[] {
    return this.backtests
      .filter(b => b.strategy_id === strategyId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getBacktest(id: number): BacktestRecord | undefined {
    return this.backtests.find(b => b.id === id);
  }

  createBacktest(data: {
    strategy_id: number;
    version_id?: number | null;
    params?: Record<string, unknown>;
    initial_capital: number;
    final_capital: number;
    return_pct: number;
    num_trades: number;
    win_rate: number;
    max_drawdown: number;
    profit_factor: number;
    sharpe_ratio?: number;
    source?: string;
    equity_curve?: string;
  }): BacktestRecord {
    const bt: BacktestRecord = {
      id: this.nextBtId++,
      strategy_id: data.strategy_id,
      version_id: data.version_id ?? null,
      params: JSON.stringify(data.params || {}),
      initial_capital: data.initial_capital,
      final_capital: data.final_capital,
      return_pct: data.return_pct,
      num_trades: data.num_trades,
      win_rate: data.win_rate,
      max_drawdown: data.max_drawdown,
      profit_factor: data.profit_factor,
      sharpe_ratio: data.sharpe_ratio ?? 0,
      source: data.source || "local",
      equity_curve: data.equity_curve || "[]",
      created_at: new Date().toISOString(),
    };
    this.backtests.push(bt);
    return bt;
  }

  // Reports
  listReports(strategyId?: number): ReportRecord[] {
    if (strategyId) {
      return this.reports
        .filter(r => r.strategy_id === strategyId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return [...this.reports].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getReport(id: number): ReportRecord | undefined {
    return this.reports.find(r => r.id === id);
  }

  createReport(strategyId: number, content: string): ReportRecord {
    const r: ReportRecord = {
      id: this.nextReportId++,
      strategy_id: strategyId,
      content,
      created_at: new Date().toISOString(),
    };
    this.reports.push(r);
    return r;
  }
}

export const store = new InMemoryStore();
