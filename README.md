# Archy Live - dashboard + carte de village en temps réel

Une app web statique (Vite + React + Three.js) qui montre l'activité d'un assistant ou d'une équipe :
- **Carte** (vue par défaut) : un village, une maison par "univers" (projet), un personnage qui marche = tâche en cours, un PNJ "..." = en attente de toi, ⏱ = programmé, coche = terminé. Au centre, le bureau du boss : les personnages font des allers-retours maison <> bureau. Touche une maison ou un personnage pour ouvrir le détail.
- **Dashboard** (`#dash` ou bouton en haut à droite) : compteurs, avancement par univers, tâches à décider, journal horodaté.
Les deux lisent le même fichier, rechargé toutes les 5 s (pas de rebuild nécessaire).

## Démarrer
(Si `bin/archy` ou `bin/publish` ne se lancent pas : `chmod +x bin/*`.)

```
npm install
npm run dev        # http://localhost:5173
npm run build      # produit dist/
```

## Adapter à ton usage : un seul fichier, `public/data/archy-status.json`
- `universes` : tes projets. `{ "id": "site", "name": "Mon Site", "emoji": "🌐", "color": "#f59e0b" }`. Une maison est créée pour chaque univers qui a au moins une tâche (8 maisons max, voir `SLOTS` dans `src/MapView.jsx`).
- `tasks` : `{ "id", "universe", "title", "status", "note", "startedAt", "doneAt", "scheduledAt" }`.
  Statuts : `active` (point vert + personnage qui marche), `waiting` (attend ta réponse), `scheduled` (date dans `scheduledAt`), `blocked`, `queued`, `done` (coche + horodatage `doneAt`).
- `log` : `{ "at", "task", "text" }`, les plus récents d'abord ou dans l'ordre, affichés dans le Dashboard. Dates en ISO 8601 avec fuseau (ex. `2026-01-15T10:00:00+01:00`).

### Mettre à jour en ligne de commande (écriture atomique + validation)
```
bin/archy start <id> <univers> "Titre" "note"
bin/archy note <id> "note"
bin/archy done <id> "note"
bin/archy wait <id> <univers> "Titre" "ce qu'on attend"
bin/archy block <id> "raison"
bin/archy sched <id> <univers> "Titre" 2026-01-16T18:00:00+01:00 "note"
bin/archy queue <id> <univers> "Titre"
```
Ton assistant ou tes scripts peuvent appeler ces commandes (ou éditer le JSON directement).

### Personnaliser
- Textes ("Attend le boss", légende, etc.) : `src/shared.jsx`, `src/Dashboard.jsx`, `src/MapView.jsx`.
- Ambiance de la carte (ciel, lumière, couleurs) : début de `useEffect` dans `src/MapView.jsx` (dégradé du ciel, `HemisphereLight`, `DirectionalLight`, couleurs du terrain).
- Plaque du bureau central : cherche `'ARCHY'` dans `src/MapView.jsx`.

## Héberger (optionnel, gratuit sur Cloudflare Pages)
1. Compte Cloudflare gratuit, jeton API avec la permission *Pages: Edit*.
2. `export CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=...` (ne jamais les mettre dans le dépôt), puis `bin/publish` (option `--dry` pour tester). Le nom du projet est dans `.publish-project` (créer le fichier, sinon `archy-live`) : `npx wrangler pages project create <nom>` une première fois.
3. Protection par mot de passe : `functions/_middleware.js` demande un mot de passe lu dans le secret `ARCHY_PASSWORD` du projet Pages (Settings > Variables and secrets > Secret), puis redéployer. Sans ce secret, le site répond 503 (rien n'est exposé). Supprime le dossier `functions/` si tu veux un site public.
4. Auto-publication : `touch .publish-enabled` => chaque `bin/archy ...` republie. 
