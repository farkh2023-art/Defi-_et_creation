# Roadmap — TradeGPT BTC Optimizer

## MVP v1.0 (actuel)

- [x] Génération Pine Script v5 via IA (OpenAI / Anthropic / Mock)
- [x] 5 templates préconstruits (SMA, Supertrend, RSI, ADX, Combined)
- [x] Éditeur Pine Script Monaco avec versioning
- [x] Debug et correction automatique de scripts
- [x] Backtesting local (pandas + yfinance)
- [x] Optimisation par grid search
- [x] Comparaison A/B de stratégies
- [x] Génération de rapports Markdown
- [x] Interface React responsive (dark mode)
- [x] Docker Compose

## v1.1 — Améliorations UX

- [ ] Authentification utilisateur (JWT)
- [ ] Sauvegarde des configurations d'optimisation
- [ ] Export CSV des résultats d'optimisation
- [ ] Coloration syntaxique Pine Script dans Monaco
- [ ] Notifications toast pour les actions importantes

## v1.2 — Backtesting avancé

- [ ] Multi-timeframe (1h, 4h, daily)
- [ ] Import CSV de données OHLCV personnalisées
- [ ] Modélisation améliorée du slippage et frais
- [ ] Walk-forward testing
- [ ] Monte Carlo simulation

## v2.0 — Fonctionnalités avancées

- [ ] Support multi-actifs (ETH, autres crypto)
- [ ] Indicateurs supplémentaires : MACD, Bollinger, Volume Profile
- [ ] Apprentissage continu : amélioration des recommandations basée sur l'historique
- [ ] API publique documentée (OpenAPI)
- [ ] Mode SaaS multi-utilisateurs

## Non prévu (hors scope)

- Exécution d'ordres réels
- Trading haute fréquence
- Arbitrage inter-plateformes
- Modèles propriétaires entraînés
