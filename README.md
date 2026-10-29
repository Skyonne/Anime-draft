# Naruto Stat Draft

**Installation privée :** double-cliquer `start.bat` télécharge maintenant les portraits dans `public/private-portraits/` avant d’ouvrir le jeu. Le lanceur affiche le nombre réel de fichiers récupérés ou l’erreur réseau. **Aucune publication GitHub n’est nécessaire.** Le navigateur privilégie ces fichiers locaux. Voir [PRIVATE-PORTRAITS.md](docs/PRIVATE-PORTRAITS.md).

Mini-jeu React / TypeScript / Vite, statique et en français : **120 combattants**, six choix irréversibles, score sur 600, radar hexagonal et salons privés pour 2 à 4 joueurs. Aucun backend personnel, base de données, compte ou abonnement.

## Ouvrir le site sous Windows

1. Installer Node.js LTS avec npm (Node 22.12+ recommandé, Node 26 utilisé pour les contrôles locaux).
2. **Double-cliquer sur `start.bat` dans ce dossier.** Il cherche Node, installe les dépendances si elles sont absentes, lance Vite sur **127.0.0.1 uniquement** et ouvre le navigateur.
3. Garder la fenêtre du terminal ouverte ; Ctrl+C arrête le site. Si le port 5173 est déjà utilisé, fermer l’autre serveur, ou ouvrir son adresse si c’est déjà ce projet.

Ne pas ouvrir `index.html` par double-clic : les sources React doivent passer par Vite. Aucun port de routeur ou réglage de pare-feu n’est nécessaire. Le script n’expose pas le serveur sur Internet ou le réseau local.

Lancement manuel :

```powershell
npm.cmd install
npm.cmd run dev
```

Pour vérifier la distribution de production :

```powershell
npm.cmd run build
npm.cmd run preview
```

Les scripts utilisent le chargeur de configuration Vite `runner`, qui évite les problèmes de lecture des dossiers parents rencontrés par esbuild dans l’environnement Windows restreint de développement.

## Jouer en solo

Cliquer Jouer. Choisir une statistique libre, puis verrouiller. Chaque choix est définitif ; les notes restent cachées jusqu’aux résultats. Le sixième ninja est affecté à la dernière catégorie après une courte animation. Les six notes choisies s’additionnent, sans bonus. Les nouveaux tirages sont indépendants des choix et des parties précédentes, sans doublons dans une même partie.

Le score, la moyenne, le meilleur et le moins bon axe, les six notes, les rangs S/A/B/C/D/E et le radar se révèlent progressivement. Le mouvement réduit système et le réglage d’interface sont respectés. Le partage utilise Web Share, puis la copie et enfin un résumé sélectionnable si la copie est bloquée.

La sauvegarde solo versionnée valide les données restaurées : record, compteur, dernier score, dix dernières parties et draft en cours. Une actualisation reprend les choix confirmés. Une sauvegarde invalide est ignorée. Les paramètres, le pseudo préféré et le dernier mode sont locaux. Les résultats multijoueurs ne modifient pas le record solo. Le stockage peut être bloqué par le navigateur ; le solo le signale et reste jouable. Plusieurs onglets solo ne se synchronisent pas en temps réel.

## Jouer avec des amis

- **Créer un salon** : saisir un pseudo, choisir Duel équitable ou Tirages indépendants, partager le code ou le lien.
- **Rejoindre** : ouvrir le lien d’invitation ou saisir le code de 12 caractères et son pseudo.
- Le salon affiche les connexions et statuts Prêt. Chaque joueur se déclare prêt ; l’hôte peut démarrer à partir de deux joueurs, jusqu’à quatre.
- En **Duel équitable**, tous reçoivent les mêmes six ninjas dans le même ordre. En **Tirages indépendants**, chacun reçoit un tirage distinct ; la chance influence davantage le résultat.
- Chacun avance à son rythme. Les choix adverses et les scores restent cachés. La fin personnelle affiche une attente jusqu’à la révélation commune.
- Le classement gère les égalités. Choisir un joueur pour examiner ses six affectations, puis un autre pour comparer les radars orange et cyan.
- **Rejouer ensemble** ramène tout le monde au lobby, sans statut prêt. L’hôte doit lancer la nouvelle partie.

Les connexions sont de vrais canaux **PeerJS + WebRTC** ; localStorage n’est jamais la source de vérité du salon. L’hôte vérifie les choix et recalcule les scores. Les salons disparaissent avec l’hôte. Une perte de canal tente une vraie reconnexion pendant 30 secondes ; après expiration, les drafts non terminés sont en abandon.

**Limites réseau :** PeerJS est chargé à la demande depuis un CDN, puis utilise une signalisation gratuite et des serveurs STUN publics. Aucun service TURN garanti n’est fourni. NAT restrictifs, pare-feu ou indisponibilité du service peuvent empêcher une connexion. Le multijoueur nécessite Internet. Il ne fournit pas de garantie anti-triche compétitive : les données sont publiques et l’hôte est lui-même joueur. Voir [l’architecture, le protocole et les limites](docs/MULTIPLAYER.md).

## Tester avec deux navigateurs ou appareils

1. Sur un PC, lancer `start.bat`, puis ouvrir l’URL affichée dans Chrome et Firefox, ou deux profils privés distincts.
2. Créer le salon dans le premier navigateur ; saisir son code dans le second avec un autre pseudo.
3. Vérifier que les deux listes affichent deux joueurs. Se déclarer prêt dans les deux, puis démarrer depuis l’hôte.
4. Terminer une partie dans les deux, vérifier l’attente, le classement et les radars ; lancer une revanche.
5. Pour **deux appareils**, utiliser le même **site GitHub Pages publié en HTTPS** sur les deux. Un lien 127.0.0.1 pointe toujours vers l’appareil qui l’ouvre : il ne partage pas votre serveur de développement avec un ami.
6. Tester aussi un départ pendant le draft et la fermeture de l’hôte. La duplication d’un onglet peut copier son jeton de reprise ; utiliser des profils distincts pour simuler des joueurs indépendants.

La recette détaillée est dans [MULTIPLAYER.md](docs/MULTIPLAYER.md). Les mocks de tests ne constituent pas une preuve de connectivité WebRTC réelle ; le [rapport de vérification](docs/VERIFICATION.md) distingue les deux.

## Vérifications automatisées

```powershell
npm.cmd install
npm.cmd run typecheck
npm.cmd run validate:data
npm.cmd run test -- --run
npm.cmd run build
```

Vitest couvre le moteur solo, le tirage, le score, la sauvegarde, les coordonnées du radar, les rangs, les codes, les deux modes, les refus d’admission, les snapshots, les séquences, les canaux simulés, les égalités, la reconnexion, la fermeture et le retour au lobby. Les données sont validées séparément. Les dépendances sont figées dans `package-lock.json` ; le workflow utilise `npm ci`.

## Catalogue et portraits

Les **120 personnages existants sont conservés**, sans personnage de Boruto. Les 720 notes sont des évaluations de fans, non officielles, documentées dans [SCORING.md](docs/SCORING.md). Ce catalogue initial n’est pas exhaustif ; les capacités peu montrées restent incertaines. Les rangs alphabétiques et les catégories Genin/Kage sont propres au jeu.

Les avatars locaux sont des créations abstraites originales. Aucun portrait protégé n’est importé. Les SVG ont une taille intrinsèque **400 × 500** et un ratio **4:5** ; `Portrait.tsx` centralise le cadrage, `object-fit: cover`, le chargement différé et un fallback graphique sans image cassée.

**Bilan de la revue des sources : 0 portrait tiers ajouté, 120 avatars conservés.** Les captures de wiki n’ont pas une licence générale de redistribution et les candidats trouvés n’ont pas fourni une preuve suffisante des droits requis. Cela ne signifie pas qu’aucun portrait autorisé n’existe ailleurs. La recherche, les licences annoncées et les décisions sont documentées dans [PORTRAITS.md](docs/PORTRAITS.md), avec [l’inventaire des 120 personnages](docs/PORTRAIT-COVERAGE.md).

Les futurs portraits vérifiés s’inscrivent dans **`src/data/portraits.json`**, en associant identifiant et nom canonique. Ne pas remplacer le champ `image` du catalogue : il conserve l’avatar de secours. Le script `scripts/prepare-portrait.py` prépare les fichiers autorisés en WebP 400 × 500, retire les métadonnées et ajoute crédits, preuve des droits et empreinte SHA-256. Voir la procédure complète dans [PORTRAITS.md](docs/PORTRAITS.md).

```powershell
npm.cmd run validate:portraits
npm.cmd run portraits:sync
```

La seconde commande régénère les crédits et la couverture après une modification validée du registre. Les crédits sont accessibles depuis le catalogue et inclus dans le site publié. La validation est également exécutée avant chaque build. Une validation technique ne prouve pas les droits d’une image : les preuves doivent d’abord être vérifiées manuellement.

L’affichage essaie le portrait approuvé, puis l’avatar existant, puis les initiales. Aucune image distante n’est chargée pendant le jeu. Les SVG originaux ont été minifiés sans modifier leur dessin. Le [rapport des contrôles de cette mise à jour](docs/PORTRAIT-VERIFICATION.md) distingue tests techniques, revue des sources et limites.

Pour ajouter un combattant, compléter `id`, `name`, `affiliation`, `version`, `evidence`, les six notes entières et un visuel local. Conserver les identifiants existants pour préserver les sauvegardes. Le script facultatif `python scripts/generate-avatars.py` régénère les avatars abstraits ; il ne doit pas être utilisé pour écraser des portraits autorisés sans adapter le catalogue. Python n’est pas nécessaire pour jouer ou construire.

L’étude Dattebayo et les droits sont détaillés dans [SOURCES.md](docs/SOURCES.md). Le solo n’utilise aucune API et ne télécharge aucune police externe. Il faut disposer des fichiers du site au chargement initial ; aucun service worker n’est installé.

## Publier sur GitHub Pages

Le site n’est pas automatiquement publié par la modification de ces fichiers.

1. Créer un dépôt GitHub public, par exemple `naruto-stat-draft`.
2. Depuis **ce dossier**, si aucun dépôt autonome n’existe encore :

```powershell
git init -b main
git add .
git commit -m "Build Naruto Stat Draft multiplayer"
git remote add origin https://github.com/USERNAME/naruto-stat-draft.git
git push -u origin main
```

Remplacer USERNAME et le nom du dépôt. Si un dépôt existe déjà, conserver son historique et son remote.

3. Dans GitHub, **Settings → Pages → Build and deployment → Source → GitHub Actions**.
4. Lancer le workflow **Validate and deploy to GitHub Pages** ou pousser un commit sur `main`.
5. Le workflow installe avec `npm ci`, vérifie les types, valide le catalogue, exécute les tests et construit le site avec `VITE_REMOTE_PORTRAITS=true`. Il tente aussi de récupérer les portraits dans la distribution publiée, sans ajouter ces fichiers au dépôt. Une panne de la source d’images conserve les avatars et n’empêche pas la publication ; les contrôles du jeu, eux, doivent tous réussir avant le déploiement.
6. Ouvrir l’URL indiquée par le job `deploy`. Tester un lien `?room=...` envoyé à un second appareil.

Le chemin de base vient de `GITHUB_REPOSITORY` : `/<nom-du-dépôt>/`, ou `/` pour `*.github.io`. Aucune route ne nécessite de rewrite. Pour un domaine personnalisé, construire avec `VITE_BASE_PATH=/`. Référence : [déploiement Vite](https://vite.dev/guide/static-deploy).

## Les quatre éléments à distinguer

| Élément | Rôle | Durée |
|---|---|---|
| Vite local | Préparer le code pendant le développement, sur 127.0.0.1 | Tant que le terminal reste ouvert |
| GitHub Pages | Distribuer les fichiers statiques publiés | Indépendamment de votre PC |
| PeerServer Cloud | Aider les navigateurs à établir le lien | Service externe gratuit sans garantie |
| WebRTC | Transporter le jeu entre invités et hôte | Tant que les navigateurs et leurs connexions restent actifs |

Accessibilité : navigation clavier, focus visible, lien d’évitement, dialogues natifs, annonces de statut, libellés du radar, comparaison par couleurs et pointillés, mouvement réduit. Naruto et ses personnages appartiennent à leurs ayants droit ; projet de fans sans affiliation officielle. PeerJS est sous licence MIT et Lucide sous licence ISC.
