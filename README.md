# Archy City - le village vivant de ton assistant

Une app web statique (Vite + React + PlayCanvas) qui montre l'activité d'un assistant ou d'une équipe :

- **Village** (vue par défaut) : une île, une place centrale et le bureau du boss, une maison par univers avec sa silhouette propre. On comprend d'un coup d'œil ce qui avance, ce qui attend et ce qui bloque, on touche une maison ou un habitant pour le détail, et on peut s'y promener.
- **Dashboard** (`#dash`) : la version sobre. Compteurs, à décider, en cours, programmé, journal.

Les deux vues lisent les mêmes données, rafraîchies toutes les 20 s (en pause quand l'onglet est caché).

## Lire le village

Règle d'or : **chaque personnage est une vraie tâche, chaque animation dit quelque chose**. Il n'y a aucun figurant.

| Statut | Dans le village |
| --- | --- |
| En cours | L'habitant fait la navette maison ⇄ bureau du boss, colis à la main. Il marche plus lentement si la tâche n'a pas de nouvelles depuis longtemps. La cheminée fume, la fenêtre est chaude. |
| Attend le boss | Il fait la queue devant le perron du bureau, un papier à la main. La file se voit de loin : c'est ta pile de décisions. |
| Bloqué | Il reste devant sa porte, mains sur les hanches, derrière une barrière rouge, avec des braises sur la façade. |
| Programmé | Il attend assis sur le banc de sa maison et se lève dans la dernière heure. |
| En file | Pas d'habitant : une caisse de plus devant la maison. |
| Terminé | Il rentre, fête ça sous les confettis et le feu d'artifice, puis un fanion s'ajoute au mât (doré pendant 24 h). |

Et aussi :
- **Archy**, le petit robot-lanterne, se tient là où il a agi en dernier d'après le journal.
- **La lumière suit l'heure réelle** (fuseau de `src/config.js`) : la nuit, seules les maisons où quelque chose avance restent éclairées. Le bouton d'heure permet de forcer une ambiance.
- **Les fenêtres sont des tâches**, colorées par statut. L'horloge de la mairie donne l'heure vraie, le dôme de NGMI tourne quand NGMI travaille.
- Ce qui n'est pas une tâche relève de la nature : vent, marée, goélands, voilier, lucioles, le chat de la place.

## Jouer

- **Regarder** : un doigt ou le clic déplace le village, deux doigts ou le clic droit le font pivoter, la molette et le pincement zooment.
- **Ouvrir une maison** : elle se déplie en maison de poupée, une pièce par type de travail.
- **Se balader** : tu incarnes Nico (ZQSD, flèches, joystick, ou clic au sol). La **Tournée du boss** te guide vers les habitants bloqués ou en attente ; parle-leur pour lire ce qu'ils attendent, marquer une tâche importante ou demander son annulation. Rien n'est modifié tant que tu n'appuies pas sur ces actions.

Laissé sans intervention, le village se regarde tout seul : la caméra dérive doucement et va voir les tâches qui se terminent ou se bloquent.

## Démarrer
```
npm install
cp public/data/archy-status.example.json public/data/archy-status.json   # tes données (ignorées par git)
npm run demo-data  # ou : un village complet de démonstration, titres fictifs
npm run dev        # http://localhost:5173
npm test           # tests de la CLI
npm run build      # produit dist/
```
Le vrai fichier `public/data/archy-status.json` n'est jamais versionné (voir `.gitignore`) : seul l'exemple l'est.

## Les données : `public/data/archy-status.json`
- `universes` : tes projets. `{ "id": "site", "name": "Mon Site", "emoji": "🌐", "color": "#f59e0b" }`. Les univers connus ont leur bâtiment dédié (`src/village/plan.js`) ; un nouvel univers qui a au moins une tâche s'installe dans un cottage à sa couleur, sur l'une des 8 parcelles libres (les suivants sont signalés et restent visibles dans le dashboard).
- `tasks` : `{ "id", "universe", "title", "status", "note", "startedAt", "doneAt", "scheduledAt" }`. Statuts : `active`, `waiting`, `scheduled`, `blocked`, `queued`, `done`. Les tâches les plus urgentes occupent les fenêtres de façade.
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
- Ambiances d'une journée (ciel, soleil, mer) : `src/village/daylight.js`.
- Plan du village, parcelles, rues : `src/village/plan.js`. Silhouette des bâtiments : `src/village/buildings.js`.
- Options d'URL utiles : `?hour=19` force une heure, `?quality=low|high` force le niveau graphique, `?debug` expose `window.__village`. Liens directs : `#u=<univers>` ouvre une maison, `#t=<tâche>` va voir un habitant.

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

## Architecture du village

Tout est procédural : aucun modèle 3D ni image à charger, hormis les logos des écoles.

- `src/MapView.jsx` : l'interface React (HUD, panneaux, étiquettes, balade). Elle ne touche pas au moteur, seulement à son API.
- `src/village/engine.js` : boucle de jeu, sélection, marche, entrées. Reçoit des intentions, émet des événements.
- `src/village/sim.js` : traduit les tâches en comportements. Pur et testé (`test/village.test.mjs`), sans moteur.
- `src/village/plan.js`, `terrain.js`, `ground.js`, `scenery.js`, `buildings.js`, `interior.js`, `characters.js`, `fx.js`, `camera.js`, `render.js`, `daylight.js`, `story.js`, `meshkit.js`.

La vue `#pilot` (campus Three.js) reste un essai isolé ; `three` n'est chargé que pour elle.

## Commandes de la CLI

```
bin/archy universe <id> "Nom" <emoji> <couleur> [quartier]
bin/archy move <tache> <maison>
bin/archy room <tache> <piece>
bin/archy alert <maison> "texte" [icone]
bin/archy alert-clear <maison>
bin/archy stats youtube '<json>'
bin/archy-actions [pending|all|ack ID...]
```

Les alertes sont horodatées et affichées au-dessus de la maison puis dans son détail. Les statistiques YouTube affichent l'heure du relevé, pas un compteur en temps réel. Format : `{subscribers, views28d, latest: {title, views, likes}, top: {title, views}, at}`.

Les commandes configurées pour publier relisent `/api/status` avec le jeton avant de modifier les données. Une lecture échouée bloque l'écriture. Le fichier de données privées n'est jamais versionné. Les accès personnels sont protégés par le mot de passe du site.
