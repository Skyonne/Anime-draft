# Rapport de vérification — mise à jour v2

## Contrôles réussis

Environnement : Windows, Node.js **26.13.0**, npm **11.20.0**, TypeScript du projet et Vitest **3.2.7**. Les outils existent dans `C:\Program Files\nodejs` ; le PATH des commandes de cette session a été complété. Le lanceur Windows recherche aussi ce dossier lorsqu’il manque au PATH.

| Contrôle exécuté | Résultat |
|---|---|
| `npm install --offline --no-audit --no-fund` | Réussi, dépendances existantes et lockfile v2 synchronisés |
| `npm run typecheck` | Réussi, application complète et tests |
| `npm run validate:data` | Réussi : 120 personnages, 720 notes et 120 chemins locaux valides |
| `npm run test -- --run` | **68 tests réussis**, 5 fichiers, 0 échec |
| `npm run build` | Réussi, distribution statique créée dans `dist` |
| Build supplémentaire avec `--base /naruto-stat-draft/` | Réussi, distribution séparée dans `.runtime/dist-subpath` |
| `start.bat --check` | Réussi : Node, npm et dépendances détectés, sans ouvrir de navigateur |
| Analyse XML des 120 SVG | Réussie ; dimensions intrinsèques 400 × 500, viewBox 480 × 600, ratio 4:5 |
| Prévisualisation Vite sur 127.0.0.1:5174 | Démarrée ; réponse HTTP 200 de la page |

La tentative initiale `npm install peerjs@^1.5.5` a échoué avec EACCES sur l’accès réseau au registre npm. Le client PeerJS est donc chargé à la demande depuis une distribution CDN versionnée ; aucune fausse bibliothèque locale n’a été créée. Le solo se construit et joue sans ce chargement. L’installation npm finale a réussi hors ligne avec les dépendances déjà présentes.

Le validateur a été migré de `scripts/validate-characters.ts` vers `scripts/validate-characters.mjs`. Le lanceur `tsx` échouait dans ce sandbox Windows sur `os.userInfo` ; le validateur Node natif est maintenant exécuté avec succès, sans dépendance de transpilation.

## Détail des tests réellement lancés avec Vitest

- **20 tests moteur et stockage solo** : six tirages distincts sur 1 000 parties, six candidats exactement, rejet du biais modulo, choix irréversibles, double validation, dernier placement, somme et plafond de 600, partage, restauration invalide, reprise, compteur idempotent et historique.
- **16 tests radar** : seuils S/A/B/C/D/E, valeurs invalides, coordonnées des axes, polygone à six sommets, rendu des deux séries, pointillés et valeurs non révélées avant leur étape.
- **19 tests salons et protocole** : codes et liens GitHub Pages, roster, capacité, lancement à 2/3/4, mode équitable, appels indépendants au générateur, changements de mode, choix illégaux, classement, égalités, abandon, reprise authentifiée par jeton, expiration, retour au lobby, fermeture et messages mal formés ou scores falsifiés.
- **9 tests du vrai contrôleur de transport avec des ports PeerJS simulés injectés** : admission, synchronisation, match complet, attente, révélation, revanche, refus, séquences dupliquées, anciens gameId, fermeture explicite, nouveau canal après coupure, arrêt des retries à la disparition de l’hôte et nettoyage de React StrictMode.
- **4 tests de rendu React** : notes absentes du draft, score exact et six rangs en résultats, accès solo/multi, dimensions et cadrage des portraits et échappement des textes.

Les tests de transport font circuler les messages dans des canaux simulés. **Ils ne prouvent pas une connexion WebRTC réelle.** Le rendu React est testé en HTML statique, pas par un navigateur graphique.

## Limites de recette navigateur et réseau

Une recette automatisée a été préparée et tentée avec Chrome installé, via le protocole DevTools, sur profils de test isolés dans `.runtime`. Chrome n’a pas réussi à initialiser un moteur de rendu dans l’environnement restreint : erreurs de processus GPU / permissions Windows, puis délai dépassé sur `Runtime.enable`. L’essai avec rendu GPU dans le processus n’a pas résolu l’initialisation du renderer. Aucun parcours desktop/mobile complet ni capture validée n’est revendiqué.

Le serveur de développement a aussi rencontré une restriction native d’esbuild dans le sandbox lors de l’optimisation des dépendances. Cela n’a pas empêché les tests Vitest ni la compilation Rollup de production. La prévisualisation de `dist` a démarré et retourné HTTP 200. Le fonctionnement visuel de `start.bat` hors sandbox reste à confirmer sur le poste utilisateur ; ses prérequis et sa commande locale ont été vérifiés.

**Aucune partie entre deux véritables navigateurs via PeerJS Cloud n’a pu être validée ici.** Les services CDN/signalisation externes et la traversée NAT restent à tester dans un navigateur disposant d’un accès réseau normal. La fonctionnalité est implémentée avec le vrai client PeerJS et des canaux WebRTC, mais sa connectivité réelle n’est pas certifiée par ces tests.

Le site n’est pas publié sur GitHub Pages et aucun dépôt distant n’a été créé ou modifié. Le workflow de déploiement comprend installation déterministe, types, données, tests et build avant publication.

## Recette à terminer sur le poste utilisateur

1. Double-cliquer `start.bat`, ouvrir le jeu et tester le solo en largeur mobile puis desktop.
2. Vérifier une reprise après deux choix, le sixième choix automatique, le total, les six rangs et le radar ; actualiser les résultats sans augmenter le compteur.
3. Tester une image manquante et vérifier le fallback et le ratio de carte 4:5.
4. Ouvrir Chrome et Firefox / profils privés indépendants, créer puis rejoindre le même salon, se déclarer prêts et terminer un duel.
5. Vérifier l’attente de l’autre joueur, la révélation commune, les égalités, la comparaison des radars et le retour collectif au lobby.
6. Tester un départ, une perte de canal suivie d’un retour, puis une fermeture de l’hôte. Refaire en tirages indépendants.
7. Publier, puis tester une invitation HTTPS GitHub Pages sur deux appareils, éventuellement deux réseaux différents. Une adresse localhost ne partage pas le serveur entre appareils.

La procédure complète et les limites de NAT, de signalisation, de reprise et d’anti-triche sont dans [MULTIPLAYER.md](MULTIPLAYER.md).
