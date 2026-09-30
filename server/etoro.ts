export interface EtoroPosition {
  symbol: string;
  name: string;
  weight_pct: number;
  performance_pct: number;
  invested: number;
  current_value: number;
  buy_price: number | null;
  sell_price: number | null;
  is_crypto: boolean;
}

export interface EtoroPortfolio {
  total_value: number;
  cash: number;
  invested: number;
  performance_pct: number;
  btc_exposure_pct: number;
  concentration_score: number;
  currency: string;
  positions: EtoroPosition[];
}

export interface EtoroAnalysis {
  btc_exposure_pct: number;
  concentration_score: number;
  recommendations: string[];
  risk_level: string;
  summary: string;
  disclaimer: string;
}

export interface EtoroStatus {
  enabled: boolean;
  mode: string;
  connected: boolean;
  allow_real_orders: boolean;
  mock: boolean;
}

const MOCK_POSITIONS: EtoroPosition[] = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    weight_pct: 36.4,
    performance_pct: 24.7,
    invested: 3500.0,
    current_value: 4362.5,
    buy_price: 45000.0,
    sell_price: 56100.0,
    is_crypto: true,
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    weight_pct: 19.5,
    performance_pct: 11.3,
    invested: 2100.0,
    current_value: 2336.5,
    buy_price: 2800.0,
    sell_price: 3116.0,
    is_crypto: true,
  },
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    weight_pct: 15.0,
    performance_pct: 5.8,
    invested: 1700.0,
    current_value: 1798.8,
    buy_price: 175.0,
    sell_price: 185.2,
    is_crypto: false,
  },
  {
    symbol: "GOLD",
    name: "Gold ETF",
    weight_pct: 8.2,
    performance_pct: -1.4,
    invested: 1000.0,
    current_value: 986.0,
    buy_price: null,
    sell_price: null,
    is_crypto: false,
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corp.",
    weight_pct: 14.2,
    performance_pct: 42.1,
    invested: 1200.0,
    current_value: 1705.2,
    buy_price: 480.0,
    sell_price: 682.1,
    is_crypto: false,
  },
];

const MOCK_TOTAL = 12000.0;
const MOCK_CASH = 811.0;

function btcExposure(positions: EtoroPosition[]): number {
  const sum = positions.filter(p => p.symbol === "BTC").reduce((a, b) => a + b.weight_pct, 0);
  return Math.round(sum * 100) / 100;
}

function concentrationScore(positions: EtoroPosition[]): number {
  if (positions.length === 0) return 0;
  const weights = positions.map(p => p.weight_pct / 100);
  const hhi = weights.reduce((acc, w) => acc + w * w, 0);
  const minHhi = 1.0 / positions.length;
  if (minHhi >= 1.0) return 100.0;
  return Math.round(((hhi - minHhi) / (1.0 - minHhi)) * 1000) / 10;
}

export function getEtoroStatus(): EtoroStatus {
  return {
    enabled: true,
    mode: "read_only",
    connected: true,
    allow_real_orders: false,
    mock: true,
  };
}

export function getEtoroPortfolio(): EtoroPortfolio {
  const invested = MOCK_POSITIONS.reduce((a, b) => a + b.invested, 0);
  const current = MOCK_POSITIONS.reduce((a, b) => a + b.current_value, 0);
  const perf = invested > 0 ? Math.round(((current - invested) / invested) * 10000) / 100 : 0;

  return {
    total_value: MOCK_TOTAL,
    cash: MOCK_CASH,
    invested: Math.round(invested * 100) / 100,
    performance_pct: perf,
    btc_exposure_pct: btcExposure(MOCK_POSITIONS),
    concentration_score: concentrationScore(MOCK_POSITIONS),
    currency: "USD",
    positions: MOCK_POSITIONS,
  };
}

export function getEtoroPositions(): EtoroPosition[] {
  return MOCK_POSITIONS;
}

export function analyzeEtoro(): EtoroAnalysis {
  const portfolio = getEtoroPortfolio();
  const btc = portfolio.btc_exposure_pct;
  const conc = portfolio.concentration_score;
  const recs: string[] = [];

  if (btc > 40) {
    recs.push(`Exposition BTC élevée (${btc.toFixed(1)} %) — envisagez une diversification.`);
  } else if (btc < 10) {
    recs.push(`Exposition BTC faible (${btc.toFixed(1)} %) — peu alignée avec une stratégie BTC Optimizer.`);
  } else {
    recs.push(`Exposition BTC acceptable (${btc.toFixed(1)} %) — dans la fourchette cible (10–40 %).`);
  }

  if (conc > 60) {
    recs.push("Concentration élevée : le portefeuille manque de diversification.");
  } else if (conc < 30) {
    recs.push("Bonne diversification entre actifs.");
  }

  if (portfolio.performance_pct < 0) {
    recs.push("Performance globale négative — revoyez les positions perdantes.");
  } else if (portfolio.performance_pct > 20) {
    recs.push("Performance solide — envisagez de sécuriser une partie des gains.");
  }

  const cashRatio = portfolio.total_value > 0 ? portfolio.cash / portfolio.total_value : 0;
  if (cashRatio > 0.3) {
    recs.push(`Cash élevé (${(cashRatio * 100).toFixed(0)} %) — opportunité de déploiement progressif.`);
  }

  const risk = (btc > 50 || conc > 70) ? "élevé" : (btc > 25 || conc > 40) ? "modéré" : "faible";
  const summary = `Portefeuille de ${portfolio.total_value.toLocaleString()} $ avec ${portfolio.positions.length} positions. Exposition BTC : ${btc.toFixed(1)} %. Score de concentration : ${conc.toFixed(0)}/100. Niveau de risque estimé : ${risk}.`;

  return {
    btc_exposure_pct: btc,
    concentration_score: conc,
    recommendations: recs,
    risk_level: risk,
    summary,
    disclaimer: "Analyse automatique basée sur les données du portefeuille. Pas un conseil financier.",
  };
}
