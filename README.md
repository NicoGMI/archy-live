# Archy Live - dashboard + carte de village en temps réel

Une app web statique (Vite + React + Three.js) qui montre l'activité d'un assistant ou d'une équipe :
- **Carte** (vue par défaut) : un village, une maison par univers (projet, place fixe), un personnage qui marche = tâche en cours, un PNJ "..." = en attente, ✕ = bloqué, ⏱ = programmé, coche = terminé. Au centre, le bureau du boss : les personnages font des allers-retours maison <> bureau. Touche une maison ou un personnage pour le détail.
- **Dashboard** (`#dash` ou bouton en haut à droite) : compteurs, avancement par univers, tâches à décider, journal horodaté.

Les deux vues lisent les mêmes données, rafraîchies toutes les 20 s (en pause quand l'onglet est caché).

## Démarrer
```
npm install
cp public/data/archy-status.example.json public/data/archy-status.json   # tes données (ignorées par git)
npm run dev        # http://localhost:5173
npm test           # tests de la CLI
npm run build      # produit dist/
```
Le vrai fichier `public/data/archy-status.json` n'est jamais versionné (voir `.gitignore`) : seul l'exemple l'est.

## Les données : `public/data/archy-status.json`
- `universes` : tes projets. `{ "id": "site", "name": "Mon Site", "emoji": "🌐", "color": "#f59e0b" }`. Une maison par univers qui a au moins une tâche. 8 places sur la carte, dans l'ordre de la liste (les suivants sont signalés par un badge "+N univers non affichés").
- `tasks` : `{ "id", "universe", "title", "status", "note", "startedAt", "doneAt", "scheduledAt" }`. Statuts : `active`, `waiting`, `scheduled`, `blocked`, `queued`, `done`. Les 6 premières tâches (actives d'abord) ont une fenêtre sur leur maison.
- `log` : `{ "at", "task", "text" }`. Le plus récent d'abord, 300 entrées max. Dates en ISO 8601 avec fuseau.

### CLI (écriture atomique, verrou, validation)
```
bin/archy start <id> <univers> "Titre" ["note"]
bin/archy note <id> "note"
bin/archy done <id> ["note"]
bin/archy wait <id> [<univers> "Titre"] "ce qu'on attend"
bin/archy block <id> "raison"
bin/archy sched <id> <univers> "Titre" <date ISO> ["note"]
bin/archy queue <id> <univers> "Titre" ["note"]
bin/archy archive [jours]      # retire les tâches terminées depuis plus de N jours (7 par défaut)
bin/archy help
```
(`sh bin/archy ...` si le bit exécutable manque.) Un assistant ou un script peut l'appeler tel quel.

### Personnaliser
- Titre, fuseau horaire, langue, formulations ("Attend le boss"), rythme de rafraîchissement : `src/config.js`.
- Ambiance de la carte (ciel, lumière, couleurs) : début de l'effet dans `src/MapView.jsx`.

## Héberger gratuitement sur Cloudflare Pages (optionnel)
Tout est dans le plan gratuit. Ne saisis jamais de secret dans le dépôt.

1. **Projet Pages** : compte Cloudflare, jeton API *Pages: Edit*, puis
   `export CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=...` (ou fichiers `~/.cf_token`, `~/.cf_account`, hors dépôt),
   `npx wrangler pages project create archy-live --production-branch main`, puis `bin/publish` (option `--dry` pour tester).
   Le nom du projet est lu dans `.publish-project` s'il existe.
2. **Mot de passe** : `functions/_middleware.js` protège tout le site avec le secret Pages `ARCHY_PASSWORD` (Settings > Variables and secrets > Secret, puis redéployer). Sans secret : le site répond 503. Supprime `functions/` pour un site public.
3. **Données en direct, sans redéployer** (recommandé) : un endpoint `/api/status` stocké dans un KV.
   - Dashboard Cloudflare > Workers KV > créer un namespace (ex. `archy-live-status`).
   - Pages > ton projet > Settings > Bindings > KV namespace : variable `ARCHY`, ce namespace.
   - Ajoute un secret `ARCHY_WRITE_TOKEN` (une longue valeur aléatoire) et redéploie (`bin/publish`).
   - Côté machine qui exécute la CLI : `echo https://ton-projet.pages.dev > .publish-url` et mets le même jeton dans `~/.archy_write_token` (ou la variable `ARCHY_WRITE_TOKEN`).
   - `touch .publish-enabled` : chaque `bin/archy ...` envoie alors les données en ~1 s (`bin/publish-data`). Sans endpoint configuré, `bin/publish-data` retombe sur un redéploiement complet.
   - Limites du plan gratuit (au moment de l'écriture) : 1 000 écritures KV et 100 000 lectures par jour, 100 000 requêtes Functions par jour. Un onglet ouvert toute la journée fait environ 4 300 requêtes. Dépasser une limite fait échouer les appels, sans facturation.
   - Délai : une mise à jour est visible en général sous 30 s (propagation KV jusqu'à ~1 min, plus le rafraîchissement de 20 s).
   - Sans KV, l'app lit simplement `/data/archy-status.json` (redéploiement nécessaire pour changer les données).
