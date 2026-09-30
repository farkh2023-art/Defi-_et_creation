# Sécurité

## Principes appliqués

- **Aucune clé API dans le code source** : toutes les clés sont lues depuis `.env`.
- **Aucune clé API côté frontend** : les appels IA sont proxifiés par le backend.
- **SQLite locale** : pas d'exposition réseau de la base de données.
- **CORS restreint** : seules les origines configurées sont acceptées.
- **Mode mock par défaut** : l'application fonctionne sans aucune clé API.

## Fichier .env

- Ajoutez `.env` à votre `.gitignore` (déjà fait).
- Ne partagez jamais votre fichier `.env`.
- Utilisez `.env.example` comme modèle sans valeurs sensibles.

## Recommandations de déploiement

- En production, utilisez HTTPS.
- Protégez l'accès à l'API avec une authentification si exposé publiquement.
- Limitez les origins CORS à votre domaine réel.
- Activez les logs et surveillez les erreurs.

## Signalement de vulnérabilités

Ouvrez une issue GitHub avec le label `security` pour signaler une faille.
