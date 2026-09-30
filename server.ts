import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

import {
  ALL_TEMPLATES,
  getTemplateSchema,
  getTemplatePineScript
} from './server/templates';
import { runBacktest } from './server/backtester';
import { runOptimization } from './server/optimizer';
import {
  store
} from './server/store';
import {
  getEtoroStatus,
  getEtoroPortfolio,
  getEtoroPositions,
  analyzeEtoro
} from './server/etoro';
import {
  debugScript,
  getRecommendations,
  generateStrategy,
  getAiStatus
} from './server/ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

app.use(express.json({ limit: '10mb' }));

// -------------------------------------------------------------
// Health & Root
// -------------------------------------------------------------
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    ai_provider: "TradeGPT v5",
    ai_available: true,
    mode: "paper_trading_only",
  });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: "healthy" });
});

// -------------------------------------------------------------
// Strategies & Templates
// -------------------------------------------------------------
app.get('/api/strategies/templates', (_req: Request, res: Response) => {
  res.json({ templates: ALL_TEMPLATES });
});

app.get('/api/strategies/templates/:key', (req: Request, res: Response) => {
  try {
    const schema = getTemplateSchema(req.params.key);
    res.json(schema);
  } catch (err: unknown) {
    res.status(404).json({ error: String((err as Error).message || err) });
  }
});

app.post('/api/strategies/templates/:key/generate', (req: Request, res: Response) => {
  try {
    const key = req.params.key;
    const params = req.body || {};
    const pine = getTemplatePineScript(key, params);
    const schema = getTemplateSchema(key);
    res.json({ pine_script: pine, template: key, ...schema });
  } catch (err: unknown) {
    res.status(404).json({ error: String((err as Error).message || err) });
  }
});

app.post('/api/strategies/generate', async (req: Request, res: Response) => {
  try {
    const { prompt, template, risk_profile } = req.body || {};
    const gen = await generateStrategy(prompt || "Bitcoin trading strategy", template, risk_profile);

    const strat = store.createStrategy({
      name: gen.name,
      description: gen.description,
      template: template || null,
      risk_profile: risk_profile || "moderate",
    });

    const ver = store.createVersion(strat.id, {
      pine_script: gen.pine_script,
      parameters: gen.parameters,
      explanation: gen.explanation,
    });

    res.json({
      strategy_id: strat.id,
      name: strat.name,
      description: strat.description,
      pine_script: ver.pine_script,
      parameters: gen.parameters,
      explanation: ver.explanation,
      indicators: gen.indicators,
      warning: "Simulation uniquement — aucun ordre réel n'est exécuté.",
    });
  } catch (err: unknown) {
    res.status(500).json({ error: String((err as Error).message || err) });
  }
});

app.get('/api/strategies', (_req: Request, res: Response) => {
  const items = store.listStrategies();
  res.json({ items, total: items.length });
});

app.get('/api/strategies/:id', (req: Request, res: Response) => {
  const strat = store.getStrategy(Number(req.params.id));
  if (!strat) return res.status(404).json({ error: "Stratégie introuvable" });
  res.json(strat);
});

app.delete('/api/strategies/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const success = store.deleteStrategy(id);
  if (!success) return res.status(404).json({ error: "Stratégie introuvable" });
  res.json({ deleted: id });
});

app.get('/api/strategies/:id/versions', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  res.json(store.listVersions(id));
});

app.post('/api/strategies/:id/versions', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const strat = store.getStrategy(id);
  if (!strat) return res.status(404).json({ error: "Stratégie introuvable" });

  const { pine_script, parameters, explanation } = req.body || {};
  const ver = store.createVersion(id, {
    pine_script: pine_script || '',
    parameters: parameters || {},
    explanation: explanation || '',
  });
  res.json(ver);
});

app.get('/api/strategies/:id/versions/:vid', (req: Request, res: Response) => {
  const stratId = Number(req.params.id);
  const verId = Number(req.params.vid);
  const ver = store.getVersion(stratId, verId);
  if (!ver) return res.status(404).json({ error: "Version introuvable" });
  res.json(ver);
});

// -------------------------------------------------------------
// Pine / AI Routes
// -------------------------------------------------------------
app.get('/api/pine/status', (_req: Request, res: Response) => {
  res.json(getAiStatus());
});

app.post('/api/pine/debug', (req: Request, res: Response) => {
  const { script } = req.body || {};
  const result = debugScript(script || '');
  res.json(result);
});

app.post('/api/pine/recommend', (req: Request, res: Response) => {
  const { metrics, params, template } = req.body || {};
  const result = getRecommendations(metrics || {}, params || {}, template || 'sma');
  res.json(result);
});

// -------------------------------------------------------------
// Backtests
// -------------------------------------------------------------
app.post('/api/backtests/run', (req: Request, res: Response) => {
  try {
    const { strategy_id, version_id, template, params, initial_capital } = req.body || {};
    const metrics = runBacktest(template || 'sma', params || {}, initial_capital || 10000);

    const bt = store.createBacktest({
      strategy_id: Number(strategy_id),
      version_id: version_id ? Number(version_id) : null,
      params: params || {},
      source: "local",
      ...metrics,
    });
    res.json(bt);
  } catch (err: unknown) {
    res.status(500).json({ error: String((err as Error).message || err) });
  }
});

app.post('/api/backtests/import', (req: Request, res: Response) => {
  try {
    const {
      strategy_id,
      initial_capital,
      final_capital,
      return_pct,
      num_trades,
      win_rate,
      max_drawdown,
      profit_factor,
    } = req.body || {};

    const bt = store.createBacktest({
      strategy_id: Number(strategy_id),
      initial_capital: Number(initial_capital || 10000),
      final_capital: Number(final_capital || 10000),
      return_pct: Number(return_pct || 0),
      num_trades: Number(num_trades || 0),
      win_rate: Number(win_rate || 0),
      max_drawdown: Number(max_drawdown || 0),
      profit_factor: Number(profit_factor || 1),
      source: "tradingview_import",
      equity_curve: "[]",
    });
    res.json(bt);
  } catch (err: unknown) {
    res.status(500).json({ error: String((err as Error).message || err) });
  }
});

app.get('/api/backtests/strategy/:id', (req: Request, res: Response) => {
  const stratId = Number(req.params.id);
  res.json(store.listBacktests(stratId));
});

app.get('/api/backtests/:id', (req: Request, res: Response) => {
  const bt = store.getBacktest(Number(req.params.id));
  if (!bt) return res.status(404).json({ error: "Backtest introuvable" });
  res.json(bt);
});

app.post('/api/backtests/compare', (req: Request, res: Response) => {
  try {
    const {
      strategy_id_a,
      strategy_id_b,
      template,
      params_a,
      params_b,
      initial_capital,
    } = req.body || {};

    const tpl = template || 'sma';
    const initCap = Number(initial_capital || 10000);
    const metricsA = runBacktest(tpl, params_a || {}, initCap);
    const metricsB = runBacktest(tpl, params_b || {}, initCap);

    const scoreA = metricsA.return_pct * 0.4 + metricsA.win_rate * 0.3 - metricsA.max_drawdown * 0.3;
    const scoreB = metricsB.return_pct * 0.4 + metricsB.win_rate * 0.3 - metricsB.max_drawdown * 0.3;

    const winner = scoreA >= scoreB ? "A" : "B";
    const justification = `Variante ${winner} recommandée : rendement ${metricsA.return_pct > 0 ? '+' : ''}${metricsA.return_pct} % vs ${metricsB.return_pct > 0 ? '+' : ''}${metricsB.return_pct} %, win rate ${metricsA.win_rate} % vs ${metricsB.win_rate} %, drawdown max ${metricsA.max_drawdown} % vs ${metricsB.max_drawdown} %.`;

    res.json({
      strategy_a: {
        strategy_id: Number(strategy_id_a),
        params: params_a,
        metrics: metricsA,
      },
      strategy_b: {
        strategy_id: Number(strategy_id_b),
        params: params_b,
        metrics: metricsB,
      },
      winner,
      justification,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: String((err as Error).message || err) });
  }
});

// -------------------------------------------------------------
// Optimization
// -------------------------------------------------------------
app.post('/api/optimization/run', (req: Request, res: Response) => {
  try {
    const {
      template,
      param_ranges,
      initial_capital,
      max_combinations,
    } = req.body || {};

    const maxCombos = Math.min(Number(max_combinations || 100), 500);
    const results = runOptimization(
      template || 'sma',
      param_ranges || {},
      Number(initial_capital || 10000),
      maxCombos
    );

    res.json({
      template: template || 'sma',
      results,
      total_tested: maxCombos,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: String((err as Error).message || err) });
  }
});

// -------------------------------------------------------------
// Reports
// -------------------------------------------------------------
app.post('/api/reports/generate', (req: Request, res: Response) => {
  try {
    const { strategy_id, backtest_id } = req.body || {};
    const strat = store.getStrategy(Number(strategy_id));
    if (!strat) return res.status(404).json({ error: "Stratégie introuvable" });

    const ver = store.getCurrentVersion(strat.id);
    const bt = backtest_id
      ? store.getBacktest(Number(backtest_id))
      : store.listBacktests(strat.id)[0];

    let paramsObj: Record<string, unknown> = {};
    if (ver) {
      try { paramsObj = JSON.parse(ver.parameters); } catch { /* ignore */ }
    }

    const reportContent = [
      `# Rapport d'analyse — ${strat.name}`,
      `> Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`,
      "",
      "---",
      "",
      "## ⚠️ Avertissement",
      "> **Ce rapport est basé sur des simulations historiques.**",
      "> Les performances passées ne garantissent pas les performances futures.",
      "> Ce document ne constitue **pas** un conseil financier.",
      "> **Mode simulation uniquement — aucun ordre réel n'est exécuté.**",
      "",
      "---",
      "",
      "## 1. Description de la stratégie",
      `- **Nom :** ${strat.name}`,
      `- **Profil de risque :** ${strat.risk_profile}`,
      `- **Template :** ${strat.template || 'Généré par IA'}`,
      `- **Création :** ${new Date(strat.created_at).toLocaleDateString('fr-FR')}`,
      "",
      strat.description || "_Aucune description renseignée._",
      "",
      "---",
      "",
      "## 2. Pine Script v5",
      "```pine",
      ver ? ver.pine_script : "// Script indisponible",
      "```",
      "",
      "---",
      "",
      "## 3. Paramètres de simulation",
    ];

    if (Object.keys(paramsObj).length > 0) {
      reportContent.push("| Paramètre | Valeur |");
      reportContent.push("|-----------|--------|");
      for (const [k, v] of Object.entries(paramsObj)) {
        reportContent.push(`| \`${k}\` | ${v} |`);
      }
    } else {
      reportContent.push("_Paramètres par défaut appliqués._");
    }

    reportContent.push("", "---", "", "## 4. Résultats du Backtest", "");
    if (bt) {
      reportContent.push("| Métrique | Valeur |");
      reportContent.push("|----------|--------|");
      reportContent.push(`| Capital initial | ${bt.initial_capital.toLocaleString()} $ |`);
      reportContent.push(`| Capital final   | ${bt.final_capital.toLocaleString()} $ |`);
      reportContent.push(`| Rendement net   | **${bt.return_pct > 0 ? '+' : ''}${bt.return_pct} %** |`);
      reportContent.push(`| Total trades    | ${bt.num_trades} |`);
      reportContent.push(`| Win rate        | ${bt.win_rate} % |`);
      reportContent.push(`| Drawdown max    | ${bt.max_drawdown} % |`);
      reportContent.push(`| Profit Factor   | ${bt.profit_factor} |`);
      reportContent.push(`| Ratio de Sharpe | ${bt.sharpe_ratio} |`);
      reportContent.push(`| Source          | ${bt.source} |`);
    } else {
      reportContent.push("_Aucun backtest enregistré pour cette stratégie._");
    }

    reportContent.push(
      "",
      "---",
      "",
      "## 5. Recommandations TradeGPT",
      "- Testez la stratégie sur plusieurs périodes de volatilité (marché haussier, baissier, latéral).",
      "- Évitez la sur-optimisation des paramètres sur de petites séries temporelles.",
      "- Conservez une exposition modérée (maximum 5 à 15 % du portefeuille par trade).",
      "- Intégrez un filtre de tendance globale (ADX ou volume) pour éliminer les faux signaux.",
      "",
      "---",
      "",
      "*Rapport généré automatiquement par TradeGPT BTC Optimizer — simulation uniquement.*"
    );

    const report = store.createReport(strat.id, reportContent.join("\n"));
    res.json(report);
  } catch (err: unknown) {
    res.status(500).json({ error: String((err as Error).message || err) });
  }
});

app.get('/api/reports', (_req: Request, res: Response) => {
  res.json(store.listReports());
});

app.get('/api/reports/strategy/:id', (req: Request, res: Response) => {
  const stratId = Number(req.params.id);
  res.json(store.listReports(stratId));
});

app.get('/api/reports/:id', (req: Request, res: Response) => {
  const report = store.getReport(Number(req.params.id));
  if (!report) return res.status(404).json({ error: "Rapport introuvable" });
  res.json(report);
});

app.get('/api/reports/:id/download', (req: Request, res: Response) => {
  const report = store.getReport(Number(req.params.id));
  if (!report) return res.status(404).json({ error: "Rapport introuvable" });

  const filename = `rapport_strategie_${report.strategy_id}_${report.id}.md`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.send(report.content);
});

// -------------------------------------------------------------
// eToro Integration (Read-Only)
// -------------------------------------------------------------
app.get('/api/etoro/status', (_req: Request, res: Response) => {
  res.json(getEtoroStatus());
});

app.get('/api/etoro/portfolio', (_req: Request, res: Response) => {
  res.json(getEtoroPortfolio());
});

app.get('/api/etoro/positions', (_req: Request, res: Response) => {
  const positions = getEtoroPositions();
  res.json({ positions, count: positions.length });
});

app.post('/api/etoro/analyze', (_req: Request, res: Response) => {
  res.json(analyzeEtoro());
});

// -------------------------------------------------------------
// Frontend Integration (Vite Middleware in Dev / Static in Prod)
// -------------------------------------------------------------
async function setupFrontend() {
  const isProd = process.env.NODE_ENV === 'production';
  const distPath = path.resolve(__dirname, 'dist');

  if (isProd && fs.existsSync(distPath)) {
    console.log('[Server] Serving production static bundle from dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    console.log('[Server] Initializing Vite middleware in dev mode');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.use(vite.middlewares);

    app.get('*', async (req: Request, res: Response, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  }
}

setupFrontend().then(() => {
  app.listen(PORT, HOST, () => {
    console.log(`TradeGPT BTC Optimizer running on http://${HOST}:${PORT}`);
  });
}).catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
