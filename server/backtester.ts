export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BacktestResult {
  initial_capital: number;
  final_capital: number;
  return_pct: number;
  num_trades: number;
  win_rate: number;
  max_drawdown: number;
  profit_factor: number;
  sharpe_ratio: number;
  equity_curve: string;
}

// Generate realistic synthetic BTC daily candles (365 bars)
export function getBtcDailyData(n = 365): OHLCV[] {
  const data: OHLCV[] = [];
  const now = new Date();
  let price = 45000.0;

  // Pseudo-random deterministic generator with fixed seed
  let seed = 42;
  function rnd() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }
  function normal() {
    const u = rnd() || 0.0001;
    const v = rnd() || 0.0001;
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    const open = price;
    const change = normal() * 0.024 + 0.0003;
    price = Math.max(1000, price * (1 + change));
    const close = price;
    const high = Math.max(open, close) * (1 + Math.abs(normal() * 0.008));
    const low = Math.min(open, close) * (1 - Math.abs(normal() * 0.008));
    const volume = Math.floor(5000000 + rnd() * 45000000);

    data.push({
      date: dateStr,
      open: round2(open),
      high: round2(high),
      low: round2(low),
      close: round2(close),
      volume
    });
  }

  return data;
}

function round2(val: number) {
  return Math.round(val * 100) / 100;
}

// Technical indicators
function sma(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j];
      }
      result.push(sum / period);
    }
  }
  return result;
}

function rsi(data: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = [null];
  if (data.length <= period) return data.map(() => null);

  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      result.push(null);
    } else {
      let avgGain = 0;
      let avgLoss = 0;
      for (let j = 0; j < period; j++) {
        avgGain += gains[i - 1 - j];
        avgLoss += losses[i - 1 - j];
      }
      avgGain /= period;
      avgLoss /= period;

      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        result.push(100 - (100 / (1 + rs)));
      }
    }
  }
  return result.slice(0, data.length);
}

function adx(candles: OHLCV[], period = 14): {
  diPlus: (number | null)[];
  diMinus: (number | null)[];
  adx: (number | null)[];
} {
  const n = candles.length;
  const tr: number[] = [candles[0].high - candles[0].low];
  const dmPlus: number[] = [0];
  const dmMinus: number[] = [0];

  for (let i = 1; i < n; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const prevC = candles[i - 1].close;
    const prevH = candles[i - 1].high;
    const prevL = candles[i - 1].low;

    const currentTR = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
    tr.push(currentTR);

    const up = h - prevH;
    const down = prevL - l;
    dmPlus.push(up > down && up > 0 ? up : 0);
    dmMinus.push(down > up && down > 0 ? down : 0);
  }

  const atr = sma(tr, period);
  const smoothedPlus = sma(dmPlus, period);
  const smoothedMinus = sma(dmMinus, period);

  const diPlus: (number | null)[] = [];
  const diMinus: (number | null)[] = [];
  const dx: (number | null)[] = [];

  for (let i = 0; i < n; i++) {
    const a = atr[i];
    const sp = smoothedPlus[i];
    const sm = smoothedMinus[i];
    if (a && sp !== null && sm !== null && a > 0) {
      const p = (100 * sp) / a;
      const m = (100 * sm) / a;
      diPlus.push(p);
      diMinus.push(m);
      const sum = p + m;
      dx.push(sum > 0 ? (100 * Math.abs(p - m)) / sum : 0);
    } else {
      diPlus.push(null);
      diMinus.push(null);
      dx.push(null);
    }
  }

  const validDx = dx.map(v => v ?? 0);
  const adxVal = sma(validDx, period);

  return { diPlus, diMinus, adx: adxVal };
}

function supertrend(candles: OHLCV[], factor = 3.0, atrPeriod = 10): number[] {
  const n = candles.length;
  const tr: number[] = [candles[0].high - candles[0].low];

  for (let i = 1; i < n; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const prevC = candles[i - 1].close;
    tr.push(Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC)));
  }

  const atr = sma(tr, atrPeriod);
  const direction: number[] = new Array(n).fill(1);

  for (let i = 1; i < n; i++) {
    const a = atr[i] ?? tr[i];
    const hl2 = (candles[i].high + candles[i].low) / 2;
    const upper = hl2 + factor * a;
    const lower = hl2 - factor * a;
    const c = candles[i].close;

    if (c > upper) {
      direction[i] = -1; // Bullish
    } else if (c < lower) {
      direction[i] = 1;  // Bearish
    } else {
      direction[i] = direction[i - 1];
    }
  }

  return direction;
}

// Signals per template
function getSignals(template: string, candles: OHLCV[], params: Record<string, number>): number[] {
  const n = candles.length;
  const closes = candles.map(c => c.close);
  const signals: number[] = new Array(n).fill(0);

  if (template === 'rsi') {
    const rsiLen = params.rsi_length ?? 14;
    const oversold = params.oversold ?? 30;
    const rsiVals = rsi(closes, rsiLen);

    for (let i = 1; i < n; i++) {
      const cur = rsiVals[i];
      const prev = rsiVals[i - 1];
      if (cur !== null && prev !== null) {
        if (cur > oversold && prev <= oversold) {
          signals[i] = 1;
        }
      }
    }
  } else if (template === 'adx') {
    const adxLen = params.adx_length ?? 14;
    const thresh = params.adx_threshold ?? 25;
    const { diPlus, diMinus, adx: adxVals } = adx(candles, adxLen);

    for (let i = 1; i < n; i++) {
      const dp = diPlus[i];
      const prevDp = diPlus[i - 1];
      const dm = diMinus[i];
      const prevDm = diMinus[i - 1];
      const a = adxVals[i];

      if (dp !== null && prevDp !== null && dm !== null && prevDm !== null && a !== null) {
        const cross = dp > dm && prevDp <= prevDm;
        if (cross && a > thresh) {
          signals[i] = 1;
        }
      }
    }
  } else if (template === 'supertrend') {
    const factor = params.factor ?? 3.0;
    const atrPer = params.atr_period ?? 10;
    const dir = supertrend(candles, factor, atrPer);

    for (let i = 1; i < n; i++) {
      if (dir[i] === -1 && dir[i - 1] === 1) {
        signals[i] = 1;
      }
    }
  } else if (template === 'combined') {
    const smaLen = params.sma_length ?? 50;
    const rsiLen = params.rsi_length ?? 14;
    const rsiOversold = params.rsi_oversold ?? 40;
    const adxLen = params.adx_length ?? 14;
    const adxThresh = params.adx_threshold ?? 20;

    const smaVals = sma(closes, smaLen);
    const rsiVals = rsi(closes, rsiLen);
    const { diPlus, diMinus, adx: adxVals } = adx(candles, adxLen);

    for (let i = 1; i < n; i++) {
      const s = smaVals[i];
      const r = rsiVals[i];
      const prevR = rsiVals[i - 1];
      const dp = diPlus[i];
      const dm = diMinus[i];
      const a = adxVals[i];

      if (s !== null && r !== null && prevR !== null && a !== null && dp !== null && dm !== null) {
        const aboveSma = closes[i] > s;
        const rsiCross = r > rsiOversold && prevR <= rsiOversold;
        const trendStrong = a > adxThresh && dp > dm;
        if (aboveSma && rsiCross && trendStrong) {
          signals[i] = 1;
        }
      }
    }
  } else {
    // Default SMA
    const fastLen = params.fast_length ?? 20;
    const slowLen = params.slow_length ?? 50;
    const fastSma = sma(closes, fastLen);
    const slowSma = sma(closes, slowLen);

    for (let i = 1; i < n; i++) {
      const f = fastSma[i];
      const pf = fastSma[i - 1];
      const s = slowSma[i];
      const ps = slowSma[i - 1];

      if (f !== null && pf !== null && s !== null && ps !== null) {
        if (f > s && pf <= ps) {
          signals[i] = 1;
        }
      }
    }
  }

  return signals;
}

export function runBacktest(
  template: string,
  params: Record<string, number> = {},
  initialCapital = 10000.0
): BacktestResult {
  const candles = getBtcDailyData(365);
  const signals = getSignals(template, candles, params);

  const stopLossPct = Number(params.stop_loss_pct ?? 2.0);
  const takeProfitPct = Number(params.take_profit_pct ?? 4.0);

  let capital = initialCapital;
  let position = 0.0;
  let entryPrice = 0.0;

  interface Trade {
    entry: number;
    exit: number;
    pnl: number;
    win: boolean;
  }
  const trades: Trade[] = [];
  const equity: number[] = [capital];

  for (let i = 1; i < candles.length; i++) {
    const price = candles[i].close;

    // Check exit conditions
    if (position > 0) {
      const gain = (price - entryPrice) / entryPrice;
      if (gain <= -stopLossPct / 100 || gain >= takeProfitPct / 100) {
        const exitValue = position * price;
        const pnl = exitValue - position * entryPrice;
        trades.push({
          entry: entryPrice,
          exit: price,
          pnl,
          win: gain > 0
        });
        capital += exitValue;
        position = 0.0;
      }
    }

    // Check buy signal
    if (position === 0 && signals[i] === 1) {
      const qty = (capital * 0.99) / price;
      position = qty;
      entryPrice = price;
      capital = 0.0;
    }

    const equityVal = capital + position * price;
    equity.push(equityVal);
  }

  // Close open position at end
  if (position > 0) {
    const lastPrice = candles[candles.length - 1].close;
    capital += position * lastPrice;
    position = 0.0;
  }
  equity[equity.length - 1] = capital;

  // Compute metrics
  const numTrades = trades.length;
  const wins = trades.filter(t => t.win);
  const winRate = numTrades > 0 ? (wins.length / numTrades) * 100 : 0.0;
  const returnPct = ((capital - initialCapital) / initialCapital) * 100;

  const grossProfit = trades.filter(t => t.pnl > 0).reduce((a, b) => a + b.pnl, 0);
  const grossLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((a, b) => a + b.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit === 0 ? 1.0 : 99.0);

  // Max drawdown
  let peak = equity[0];
  let maxDd = 0.0;
  for (const eq of equity) {
    if (eq > peak) peak = eq;
    const dd = peak > 0 ? ((peak - eq) / peak) * 100 : 0;
    if (dd > maxDd) maxDd = dd;
  }

  // Sharpe ratio
  const dailyReturns: number[] = [];
  for (let i = 1; i < equity.length; i++) {
    const ret = equity[i - 1] > 0 ? (equity[i] - equity[i - 1]) / equity[i - 1] : 0;
    dailyReturns.push(ret);
  }
  let sharpe = 0.0;
  if (dailyReturns.length > 0) {
    const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / dailyReturns.length;
    const std = Math.sqrt(variance);
    if (std > 0) {
      sharpe = (mean / std) * Math.sqrt(252);
    }
  }

  // Downsample equity curve to max 80 points
  const step = Math.max(1, Math.floor(equity.length / 80));
  const equityCurve: { date: string; value: number }[] = [];
  for (let i = 0; i < equity.length; i += step) {
    const candleIndex = Math.min(i, candles.length - 1);
    equityCurve.push({
      date: candles[candleIndex].date,
      value: round2(equity[i])
    });
  }

  return {
    initial_capital: initialCapital,
    final_capital: round2(capital),
    return_pct: round2(returnPct),
    num_trades: numTrades,
    win_rate: round2(winRate),
    max_drawdown: round2(maxDd),
    profit_factor: round2(Math.min(profitFactor, 99.0)),
    sharpe_ratio: round2(sharpe),
    equity_curve: JSON.stringify(equityCurve)
  };
}
