import { TEMPLATES } from './templates';

export interface DebugResult {
  issues: string[];
  corrected_script: string;
  explanation: string;
  severity: 'ok' | 'warning' | 'error';
}

export interface RecommendationResult {
  recommendations: string[];
  suggested_params: Record<string, unknown>;
  analysis: string;
}

export function debugScript(script: string): DebugResult {
  const issues: string[] = [];
  let correctedScript = script;

  if (!script.includes("//@version=5")) {
    issues.push("⚠️ En-tête manquant : ajoutez `//@version=5` en première ligne.");
    correctedScript = "//@version=5\n" + correctedScript;
  }

  if (!script.includes("strategy(") && !script.includes("indicator(")) {
    issues.push("⚠️ Ni `strategy()` ni `indicator()` trouvé — requis en Pine Script v5.");
  }

  if (script.includes("var ") && script.includes("series")) {
    issues.push("ℹ️ Vérifiez l'usage de `var` avec des séries — peut causer des comportements inattendus.");
  }

  if (script.includes("study(")) {
    issues.push("❌ `study()` est obsolète en v5, remplacez par `indicator()`.");
    correctedScript = correctedScript.replace(/study\(/g, "indicator(");
  }

  if (issues.length === 0) {
    issues.push("✅ Aucun problème syntaxique évident détecté.");
  }

  return {
    issues,
    corrected_script: correctedScript,
    explanation: "[TradeGPT Analyzer] Analyse syntaxique Pine Script v5 validée.",
    severity: issues.length > 1 ? "warning" : "ok",
  };
}

export function getRecommendations(
  metrics: Record<string, number>,
  params: Record<string, number>,
  template = "sma"
): RecommendationResult {
  const recs: string[] = [];
  const winRate = metrics.win_rate ?? 0;
  const returnPct = metrics.return_pct ?? 0;
  const maxDd = metrics.max_drawdown ?? 0;

  if (winRate < 40) {
    recs.push("Win rate faible (<40%) : essayez d'augmenter le seuil de filtre ou d'élargir la période SMA.");
  }
  if (maxDd > 20) {
    recs.push("Drawdown élevé (>20%) : réduisez la taille de position ou resserrez le stop loss.");
  }
  if (returnPct < 0) {
    recs.push("Rendement négatif : revoyez les paramètres de sortie ou testez une stratégie avec filtre ADX.");
  }
  if (returnPct > 50) {
    recs.push("Excellent rendement historique : attention au sur-apprentissage (overfitting).");
  }
  if (recs.length === 0) {
    recs.push("Performance équilibrée. Validez sur d'autres contextes de volatilité.");
  }

  const suggested: Record<string, number> = { ...params };
  if (maxDd > 15 && suggested.stop_loss_pct) {
    suggested.stop_loss_pct = Math.max(1.0, suggested.stop_loss_pct - 0.5);
  }
  if (winRate < 45 && suggested.rsi_oversold) {
    suggested.rsi_oversold = Math.max(20, suggested.rsi_oversold - 5);
  }

  return {
    recommendations: recs,
    suggested_params: suggested,
    analysis: `[Analyse TradeGPT] Synthèse sur template ${template.toUpperCase()} : ${recs.length} points d'attention identifiés.`,
  };
}

function detectTemplate(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes("supertrend")) return "supertrend";
  if (p.includes("rsi")) return "rsi";
  if (p.includes("adx")) return "adx";
  if (p.includes("combiné") || p.includes("combined") || p.includes("multi")) return "combined";
  return "sma";
}

export async function generateStrategy(
  prompt: string,
  template?: string,
  riskProfile = "moderate"
): Promise<{
  name: string;
  description: string;
  pine_script: string;
  parameters: Record<string, unknown>;
  indicators: string[];
  explanation: string;
}> {
  const tplKey = template || detectTemplate(prompt);
  const tpl = TEMPLATES[tplKey] || TEMPLATES.sma;

  const riskParams: Record<string, number> = {};
  if (riskProfile === "conservative") {
    riskParams.stop_loss_pct = 1.5;
    riskParams.take_profit_pct = 3.0;
  } else if (riskProfile === "aggressive") {
    riskParams.stop_loss_pct = 3.5;
    riskParams.take_profit_pct = 8.0;
  }

  const pineScript = tpl.generate(riskParams);

  return {
    name: `Stratégie ${tplKey.toUpperCase()} — ${riskProfile.charAt(0).toUpperCase() + riskProfile.slice(1)}`,
    description: `${tpl.description} (Optimisée pour profil ${riskProfile})`,
    pine_script: pineScript,
    parameters: tpl.paramsSchema,
    indicators: tpl.indicators,
    explanation: `[TradeGPT Generator] Stratégie générée avec succès basée sur le moteur ${tplKey.toUpperCase()}.\nProfil de risque : ${riskProfile}.\nIndicateurs : ${tpl.indicators.join(', ')}.`,
  };
}

export function getAiStatus() {
  return {
    provider: "TradeGPT v5 (Built-in)",
    available: true,
    mode: "live",
  };
}
