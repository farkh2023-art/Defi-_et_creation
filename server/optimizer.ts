import { runBacktest, BacktestResult } from './backtester';

export interface ParamRange {
  min: number;
  max: number;
  step?: number;
}

export interface OptimizationResultItem extends BacktestResult {
  params: Record<string, number>;
}

function buildRange(spec: ParamRange): number[] {
  const start = Number(spec.min);
  const stop = Number(spec.max);
  const step = Number(spec.step ?? 1);
  const result: number[] = [];
  let v = start;
  while (v <= stop) {
    result.push(Math.round(v * 1000) / 1000);
    v += step;
  }
  return result.length > 0 ? result : [start];
}

function cartesianProduct(arrays: number[][]): number[][] {
  return arrays.reduce<number[][]>(
    (acc, curr) => acc.flatMap(a => curr.map(b => [...a, b])),
    [[]]
  );
}

export function runOptimization(
  template: string,
  paramRanges: Record<string, ParamRange>,
  initialCapital = 10000.0,
  maxCombinations = 100
): OptimizationResultItem[] {
  const paramNames = Object.keys(paramRanges);
  const paramValues = paramNames.map(name => buildRange(paramRanges[name]));

  let allCombos = cartesianProduct(paramValues);

  if (allCombos.length > maxCombinations) {
    // Deterministic sampling
    const stride = allCombos.length / maxCombinations;
    const sampled: number[][] = [];
    for (let i = 0; i < maxCombinations; i++) {
      sampled.push(allCombos[Math.floor(i * stride)]);
    }
    allCombos = sampled;
  }

  const results: OptimizationResultItem[] = [];

  for (const combo of allCombos) {
    const params: Record<string, number> = {};
    paramNames.forEach((name, idx) => {
      params[name] = combo[idx];
    });

    try {
      const metrics = runBacktest(template, params, initialCapital);
      results.push({
        params,
        ...metrics
      });
    } catch {
      // Ignore errors in combos
    }
  }

  results.sort((a, b) => b.return_pct - a.return_pct);
  return results.slice(0, 10);
}
