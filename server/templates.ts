export interface ParamSchemaField {
  type: 'int' | 'float';
  default: number;
  min: number;
  max: number;
  step?: number;
  label: string;
}

export interface TemplateDefinition {
  key: string;
  name: string;
  indicators: string[];
  description: string;
  paramsSchema: Record<string, ParamSchemaField>;
  generate: (params: Record<string, number>) => string;
}

export const TEMPLATES: Record<string, TemplateDefinition> = {
  sma: {
    key: "sma",
    name: "SMA Cross Strategy",
    indicators: ["SMA"],
    description: "Stratégie de croisement de moyennes mobiles simples. Achat quand la SMA rapide croise au-dessus de la SMA lente, vente en cas de croisement inverse.",
    paramsSchema: {
      fast_length: { type: "int", default: 20, min: 1, max: 200, label: "Période SMA rapide" },
      slow_length: { type: "int", default: 50, min: 1, max: 500, label: "Période SMA lente" },
      stop_loss_pct: { type: "float", default: 2.0, min: 0.1, max: 20.0, step: 0.1, label: "Stop Loss %" },
      take_profit_pct: { type: "float", default: 4.0, min: 0.1, max: 50.0, step: 0.1, label: "Take Profit %" }
    },
    generate: (p = {}) => {
      const fast_length = p.fast_length ?? 20;
      const slow_length = p.slow_length ?? 50;
      const stop_loss = p.stop_loss_pct ?? 2.0;
      const take_profit = p.take_profit_pct ?? 4.0;
      const qty_pct = p.qty_pct ?? 10.0;

      return `//@version=5
// ============================================================
// SMA Cross Strategy — TradeGPT BTC Optimizer
// SIMULATION UNIQUEMENT — Pas un conseil financier
// ============================================================
strategy("SMA Cross Strategy", overlay=true,
         default_qty_type=strategy.percent_of_equity,
         default_qty_value=${qty_pct},
         initial_capital=10000,
         commission_type=strategy.commission.percent,
         commission_value=0.1)

// ---- Paramètres ----
fast_length = input.int(${fast_length}, "Période SMA rapide", minval=1, maxval=200, group="Indicateurs")
slow_length = input.int(${slow_length}, "Période SMA lente",  minval=1, maxval=500, group="Indicateurs")
stop_loss   = input.float(${stop_loss}, "Stop Loss %",    minval=0.1, maxval=20.0, step=0.1, group="Gestion du risque")
take_profit = input.float(${take_profit}, "Take Profit %", minval=0.1, maxval=50.0, step=0.1, group="Gestion du risque")

// ---- Indicateurs ----
fast_sma = ta.sma(close, fast_length)
slow_sma = ta.sma(close, slow_length)

// ---- Signaux ----
long_signal  = ta.crossover(fast_sma, slow_sma)
close_signal = ta.crossunder(fast_sma, slow_sma)

// ---- Entrées / Sorties ----
if long_signal
    strategy.entry("Long", strategy.long, comment="SMA Cross ↑")
    strategy.exit("Exit Long", "Long",
                  stop  = strategy.position_avg_price * (1 - stop_loss / 100),
                  limit = strategy.position_avg_price * (1 + take_profit / 100))

if close_signal
    strategy.close("Long", comment="SMA Cross ↓")

// ---- Affichage ----
plot(fast_sma, "SMA Rapide", color=color.new(color.blue,   0), linewidth=2)
plot(slow_sma, "SMA Lente",  color=color.new(color.orange, 0), linewidth=2)

bgcolor(long_signal  ? color.new(color.green, 90) : na, title="Signal achat")
bgcolor(close_signal ? color.new(color.red,   90) : na, title="Signal vente")

// ---- Alertes ----
alertcondition(long_signal,  "SMA — Achat",  "SMA Cross: Signal d'achat détecté")
alertcondition(close_signal, "SMA — Vente",  "SMA Cross: Signal de vente détecté")
`;
    }
  },

  rsi: {
    key: "rsi",
    name: "RSI Reversal Strategy",
    indicators: ["RSI"],
    description: "Stratégie de retournement RSI. Achat quand le RSI sort de la zone de survente, fermeture en zone de surachat.",
    paramsSchema: {
      rsi_length: { type: "int", default: 14, min: 1, max: 100, label: "Période RSI" },
      oversold: { type: "int", default: 30, min: 10, max: 50, label: "Niveau survente" },
      overbought: { type: "int", default: 70, min: 50, max: 90, label: "Niveau surachat" },
      stop_loss_pct: { type: "float", default: 3.0, min: 0.1, max: 20.0, step: 0.1, label: "Stop Loss %" },
      take_profit_pct: { type: "float", default: 5.0, min: 0.1, max: 50.0, step: 0.1, label: "Take Profit %" }
    },
    generate: (p = {}) => {
      const rsi_length = p.rsi_length ?? 14;
      const oversold = p.oversold ?? 30;
      const overbought = p.overbought ?? 70;
      const stop_loss = p.stop_loss_pct ?? 3.0;
      const take_profit = p.take_profit_pct ?? 5.0;
      const qty_pct = p.qty_pct ?? 10.0;

      return `//@version=5
// ============================================================
// RSI Reversal Strategy — TradeGPT BTC Optimizer
// SIMULATION UNIQUEMENT — Pas un conseil financier
// ============================================================
strategy("RSI Reversal Strategy", overlay=false,
         default_qty_type=strategy.percent_of_equity,
         default_qty_value=${qty_pct},
         initial_capital=10000,
         commission_type=strategy.commission.percent,
         commission_value=0.1)

// ---- Paramètres ----
rsi_length  = input.int(${rsi_length},  "Période RSI",       minval=1, maxval=100, group="RSI")
oversold    = input.int(${oversold},    "Niveau survente",   minval=1, maxval=50,  group="RSI")
overbought  = input.int(${overbought},  "Niveau surachat",   minval=50, maxval=99, group="RSI")
stop_loss   = input.float(${stop_loss},   "Stop Loss %",   minval=0.1, maxval=20.0, step=0.1, group="Gestion du risque")
take_profit = input.float(${take_profit}, "Take Profit %", minval=0.1, maxval=50.0, step=0.1, group="Gestion du risque")

// ---- RSI ----
rsi = ta.rsi(close, rsi_length)

// ---- Signaux ----
long_signal  = ta.crossover(rsi, oversold)
close_signal = ta.crossunder(rsi, overbought)

// ---- Entrées / Sorties ----
if long_signal
    strategy.entry("Long", strategy.long, comment="RSI survente ↑")
    strategy.exit("Exit Long", "Long",
                  stop  = strategy.position_avg_price * (1 - stop_loss / 100),
                  limit = strategy.position_avg_price * (1 + take_profit / 100))

if close_signal
    strategy.close("Long", comment="RSI surachat ↓")

// ---- Affichage ----
hline(oversold,    "Survente",  color=color.green, linestyle=hline.style_dashed)
hline(overbought,  "Surachat",  color=color.red,   linestyle=hline.style_dashed)
hline(50,          "Neutre",    color=color.gray,  linestyle=hline.style_dotted)

rsi_color = rsi < oversold ? color.green : rsi > overbought ? color.red : color.purple
plot(rsi, "RSI", color=rsi_color, linewidth=2)

// ---- Alertes ----
alertcondition(long_signal,  "RSI — Achat", "RSI: Sortie de zone survente — Signal d'achat")
alertcondition(close_signal, "RSI — Vente", "RSI: Entrée en zone surachat — Signal de vente")
`;
    }
  },

  adx: {
    key: "adx",
    name: "ADX Trend Filter Strategy",
    indicators: ["ADX", "DI+", "DI-"],
    description: "Stratégie utilisant l'ADX comme filtre de tendance. Les trades ne sont pris qu'en tendance forte (ADX > seuil), avec croisement DI+ / DI- pour le timing.",
    paramsSchema: {
      adx_length: { type: "int", default: 14, min: 1, max: 50, label: "Période ADX" },
      di_length: { type: "int", default: 14, min: 1, max: 50, label: "Période DI" },
      adx_threshold: { type: "int", default: 25, min: 10, max: 60, label: "Seuil ADX (force de tendance)" },
      stop_loss_pct: { type: "float", default: 2.5, min: 0.1, max: 20.0, step: 0.1, label: "Stop Loss %" },
      take_profit_pct: { type: "float", default: 5.0, min: 0.1, max: 50.0, step: 0.1, label: "Take Profit %" }
    },
    generate: (p = {}) => {
      const adx_length = p.adx_length ?? 14;
      const di_length = p.di_length ?? 14;
      const adx_threshold = p.adx_threshold ?? 25;
      const stop_loss = p.stop_loss_pct ?? 2.5;
      const take_profit = p.take_profit_pct ?? 5.0;
      const qty_pct = p.qty_pct ?? 10.0;

      return `//@version=5
// ============================================================
// ADX Trend Filter Strategy — TradeGPT BTC Optimizer
// SIMULATION UNIQUEMENT — Pas un conseil financier
// ============================================================
strategy("ADX Trend Filter Strategy", overlay=true,
         default_qty_type=strategy.percent_of_equity,
         default_qty_value=${qty_pct},
         initial_capital=10000,
         commission_type=strategy.commission.percent,
         commission_value=0.1)

// ---- Paramètres ----
adx_length    = input.int(${adx_length},    "Période ADX",       minval=1, maxval=50,  group="ADX")
di_length     = input.int(${di_length},     "Période DI",        minval=1, maxval=50,  group="ADX")
adx_threshold = input.int(${adx_threshold}, "Seuil ADX (force)", minval=10, maxval=60, group="ADX")
stop_loss     = input.float(${stop_loss},   "Stop Loss %",   minval=0.1, maxval=20.0, step=0.1, group="Gestion du risque")
take_profit   = input.float(${take_profit}, "Take Profit %", minval=0.1, maxval=50.0, step=0.1, group="Gestion du risque")

// ---- ADX + DI ----
[diplus, diminus, adx] = ta.dmi(di_length, adx_length)

// ---- Signaux ----
trend_strong = adx > adx_threshold
long_signal  = trend_strong and ta.crossover(diplus, diminus)
close_signal = ta.crossunder(diplus, diminus)

// ---- Entrées / Sorties ----
if long_signal
    strategy.entry("Long", strategy.long, comment="ADX ↑")
    strategy.exit("Exit Long", "Long",
                  stop  = strategy.position_avg_price * (1 - stop_loss / 100),
                  limit = strategy.position_avg_price * (1 + take_profit / 100))

if close_signal
    strategy.close("Long", comment="DI- > DI+")

// ---- Affichage ----
plot(diplus,  "+DI", color=color.green, linewidth=1)
plot(diminus, "-DI", color=color.red,   linewidth=1)
hline(adx_threshold, "Seuil ADX", color=color.gray, linestyle=hline.style_dashed)

// ---- Alertes ----
alertcondition(long_signal,  "ADX — Achat", "ADX: Tendance forte + DI+ > DI-")
alertcondition(close_signal, "ADX — Vente", "ADX: DI- repasse au-dessus de DI+")
`;
    }
  },

  supertrend: {
    key: "supertrend",
    name: "Supertrend Strategy",
    indicators: ["ATR", "Supertrend"],
    description: "Stratégie basée sur l'indicateur Supertrend. Suit la tendance et génère des signaux d'achat lorsque le prix passe au-dessus de la ligne Supertrend.",
    paramsSchema: {
      atr_period: { type: "int", default: 10, min: 1, max: 50, label: "Période ATR" },
      factor: { type: "float", default: 3.0, min: 0.5, max: 10.0, step: 0.1, label: "Facteur multiplicateur" },
      stop_loss_pct: { type: "float", default: 2.0, min: 0.1, max: 20.0, step: 0.1, label: "Stop Loss %" },
      take_profit_pct: { type: "float", default: 6.0, min: 0.1, max: 50.0, step: 0.1, label: "Take Profit %" }
    },
    generate: (p = {}) => {
      const atr_period = p.atr_period ?? 10;
      const factor = p.factor ?? 3.0;
      const stop_loss = p.stop_loss_pct ?? 2.0;
      const take_profit = p.take_profit_pct ?? 6.0;
      const qty_pct = p.qty_pct ?? 10.0;

      return `//@version=5
// ============================================================
// Supertrend Strategy — TradeGPT BTC Optimizer
// SIMULATION UNIQUEMENT — Pas un conseil financier
// ============================================================
strategy("Supertrend Strategy", overlay=true,
         default_qty_type=strategy.percent_of_equity,
         default_qty_value=${qty_pct},
         initial_capital=10000,
         commission_type=strategy.commission.percent,
         commission_value=0.1)

// ---- Paramètres ----
atr_period  = input.int(${atr_period}, "Période ATR",    minval=1, maxval=50,   group="Supertrend")
factor      = input.float(${factor},   "Facteur",        minval=0.5, maxval=10.0, step=0.1, group="Supertrend")
stop_loss   = input.float(${stop_loss},  "Stop Loss %",  minval=0.1, maxval=20.0, step=0.1, group="Gestion du risque")
take_profit = input.float(${take_profit}, "Take Profit %", minval=0.1, maxval=50.0, step=0.1, group="Gestion du risque")

// ---- Supertrend ----
[supertrend, direction] = ta.supertrend(factor, atr_period)

// ---- Signaux ----
long_signal  = direction < 0 and direction[1] >= 0
close_signal = direction > 0 and direction[1] <= 0

// ---- Entrées / Sorties ----
if long_signal
    strategy.entry("Long", strategy.long, comment="ST ↑")
    strategy.exit("Exit Long", "Long",
                  stop  = strategy.position_avg_price * (1 - stop_loss / 100),
                  limit = strategy.position_avg_price * (1 + take_profit / 100))

if close_signal
    strategy.close("Long", comment="ST ↓")

// ---- Affichage ----
st_color = direction < 0 ? color.new(color.green, 0) : color.new(color.red, 0)
plot(supertrend, "Supertrend", color=st_color, linewidth=2)

bgcolor(long_signal  ? color.new(color.green, 90) : na)
bgcolor(close_signal ? color.new(color.red,   90) : na)

// ---- Alertes ----
alertcondition(long_signal,  "ST — Achat", "Supertrend: Signal d'achat")
alertcondition(close_signal, "ST — Vente", "Supertrend: Signal de vente")
`;
    }
  },

  combined: {
    key: "combined",
    name: "SMA + RSI + ADX Combined",
    indicators: ["SMA", "RSI", "ADX"],
    description: "Stratégie combinée multi-indicateurs. Utilise SMA comme filtre de tendance, RSI pour le timing d'entrée et ADX pour confirmer la force de la tendance avant de prendre position.",
    paramsSchema: {
      sma_length: { type: "int", default: 50, min: 5, max: 500, label: "Période SMA" },
      rsi_length: { type: "int", default: 14, min: 1, max: 100, label: "Période RSI" },
      rsi_oversold: { type: "int", default: 40, min: 10, max: 50, label: "RSI Survente" },
      rsi_overbought: { type: "int", default: 60, min: 50, max: 90, label: "RSI Surachat" },
      adx_length: { type: "int", default: 14, min: 1, max: 50, label: "Période ADX" },
      adx_threshold: { type: "int", default: 20, min: 10, max: 60, label: "Seuil ADX" },
      stop_loss_pct: { type: "float", default: 2.0, min: 0.1, max: 20.0, step: 0.1, label: "Stop Loss %" },
      take_profit_pct: { type: "float", default: 5.0, min: 0.1, max: 50.0, step: 0.1, label: "Take Profit %" }
    },
    generate: (p = {}) => {
      const sma_length = p.sma_length ?? 50;
      const rsi_length = p.rsi_length ?? 14;
      const rsi_oversold = p.rsi_oversold ?? 40;
      const rsi_overbought = p.rsi_overbought ?? 60;
      const adx_length = p.adx_length ?? 14;
      const adx_threshold = p.adx_threshold ?? 20;
      const stop_loss = p.stop_loss_pct ?? 2.0;
      const take_profit = p.take_profit_pct ?? 5.0;
      const qty_pct = p.qty_pct ?? 10.0;

      return `//@version=5
// ============================================================
// SMA + RSI + ADX Combined Strategy — TradeGPT BTC Optimizer
// SIMULATION UNIQUEMENT — Pas un conseil financier
// ============================================================
strategy("SMA + RSI + ADX Combined", overlay=true,
         default_qty_type=strategy.percent_of_equity,
         default_qty_value=${qty_pct},
         initial_capital=10000,
         commission_type=strategy.commission.percent,
         commission_value=0.1)

// ---- Paramètres SMA ----
sma_length      = input.int(${sma_length},      "Période SMA",       minval=1,  maxval=500, group="SMA")

// ---- Paramètres RSI ----
rsi_length      = input.int(${rsi_length},      "Période RSI",       minval=1,  maxval=100, group="RSI")
rsi_oversold    = input.int(${rsi_oversold},    "RSI — Survente",    minval=10, maxval=50,  group="RSI")
rsi_overbought  = input.int(${rsi_overbought},  "RSI — Surachat",    minval=50, maxval=90,  group="RSI")

// ---- Paramètres ADX ----
adx_length      = input.int(${adx_length},      "Période ADX",       minval=1,  maxval=50,  group="ADX")
adx_threshold   = input.int(${adx_threshold},   "Seuil ADX",         minval=10, maxval=60,  group="ADX")

// ---- Gestion du risque ----
stop_loss       = input.float(${stop_loss},   "Stop Loss %",    minval=0.1, maxval=20.0, step=0.1, group="Risque")
take_profit     = input.float(${take_profit}, "Take Profit %",  minval=0.1, maxval=50.0, step=0.1, group="Risque")

// ---- Calcul des indicateurs ----
sma             = ta.sma(close, sma_length)
rsi             = ta.rsi(close, rsi_length)
[diplus, diminus, adx] = ta.dmi(adx_length, adx_length)

// ---- Filtres et conditions ----
above_sma       = close > sma
rsi_ok          = rsi < rsi_overbought
trend_strong    = adx > adx_threshold and diplus > diminus

// ---- Signaux ----
long_signal     = above_sma and ta.crossover(rsi, rsi_oversold) and trend_strong
close_signal    = ta.crossunder(rsi, rsi_overbought) or (not above_sma and strategy.position_size > 0)

// ---- Entrées / Sorties ----
if long_signal
    strategy.entry("Long", strategy.long, comment="SMA+RSI+ADX ↑")
    strategy.exit("Exit Long", "Long",
                  stop  = strategy.position_avg_price * (1 - stop_loss / 100),
                  limit = strategy.position_avg_price * (1 + take_profit / 100))

if close_signal
    strategy.close("Long", comment="Signal de vente combiné")

// ---- Affichage ----
plot(sma, "SMA " + str.tostring(sma_length), color=color.new(color.orange, 0), linewidth=2)
bgcolor(trend_strong ? color.new(color.blue, 92) : na, title="Tendance forte")
bgcolor(long_signal  ? color.new(color.green, 80) : na, title="Signal achat")
bgcolor(close_signal ? color.new(color.red,   80) : na, title="Signal vente")

// ---- Alertes ----
alertcondition(long_signal,  "Combiné — Achat", "SMA+RSI+ADX: Signal d'achat multi-indicateurs")
alertcondition(close_signal, "Combiné — Vente", "SMA+RSI+ADX: Signal de vente multi-indicateurs")
`;
    }
  }
};

export const ALL_TEMPLATES = Object.values(TEMPLATES).map(t => ({
  key: t.key,
  name: t.name,
  indicators: t.indicators,
  description: t.description
}));

export function getTemplateSchema(key: string) {
  const tpl = TEMPLATES[key];
  if (!tpl) throw new Error(`Template inconnu : ${key}`);
  return {
    key: tpl.key,
    params_schema: tpl.paramsSchema,
    indicators: tpl.indicators,
    description: tpl.description
  };
}

export function getTemplatePineScript(key: string, params: Record<string, number> = {}): string {
  const tpl = TEMPLATES[key];
  if (!tpl) throw new Error(`Template inconnu : ${key}`);
  return tpl.generate(params);
}
