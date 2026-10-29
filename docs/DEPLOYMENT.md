# Publication GitHub Pages

## État de préparation

Le projet possède un dépôt Git local sur `main`, des tests et un workflow GitHub Pages. Les derniers contrôles passent : types, catalogue, **94 tests**, build avec le sous-chemin `/naruto-stat-draft/` et portraits activés pour la distribution publiée. Aucun dépôt distant n’est encore associé et aucun site n’est déclaré publié dans cette livraison.

Le workflow récupère les images disponibles dans son dossier de construction puis les inclut dans `dist`. Ces images ne sont pas ajoutées aux sources Git et aucune licence libre n’est revendiquée. Si la source est momentanément indisponible, le jeu conserve ses avatars. `VITE_REMOTE_PORTRAITS=true` active aussi le chargement des références pour les utilisateurs de la version publiée, indépendamment du `.env.local` du développeur.

## Publier avec GitHub Desktop

GitHub Desktop est déjà installé sur ce poste. Après connexion à votre compte :

1. **File → Add local repository…**, puis sélectionner `C:\Users\bapti\Documents\Programmation\Prog Web\anime-shaft`.
2. Cliquer **Publish repository**. Nom proposé : `naruto-stat-draft`. Pour GitHub Pages gratuit sur GitHub Free, utiliser un dépôt public : décocher **Keep this code private**. Publier les sources.
3. Cliquer **View on GitHub**, puis **Settings → Pages → Build and deployment → Source → GitHub Actions**.
4. Ouvrir **Actions → Validate and deploy to GitHub Pages → Run workflow → main**. Si le premier lancement avait échoué avant l’activation de Pages, le relancer maintenant.
5. Attendre le succès du job `deploy`. Son environnement `github-pages` fournit l’URL réelle. Ne pas déduire une publication réussie du seul nom du dépôt.

Le workflow calcule automatiquement le sous-chemin à partir du nom du dépôt. Il fonctionne également si le dépôt s’appelle `anime-shaft` plutôt que `naruto-stat-draft`. Le fichier `.env.local`, les caches, `node_modules`, `dist` et les photos locales privées sont ignorés par Git.

Une publication directe depuis l’assistant nécessite un accès GitHub connecté autorisant les opérations nécessaires sur le dépôt choisi. Aucun jeton, mot de passe ou code de récupération ne doit être collé dans la conversation.

## Multijoueur et hébergement

GitHub Pages distribue les fichiers, pas les messages de jeu. Les joueurs contactent PeerJS pour la signalisation, puis l’hôte et les invités échangent via WebRTC. L’hôte doit donc garder son navigateur ouvert.

Le multijoueur peut aussi être essayé sans publication : chaque participant lance la même version du jeu sur son ordinateur et rejoint le même code. Un lien `127.0.0.1` n’ouvre cependant pas l’ordinateur de l’hôte chez un ami. Une URL publique évite à chacun de devoir installer le projet.

Une fois le site publié, ouvrir son URL HTTPS sur deux appareils, créer un salon sur le premier et rejoindre son code sur le second. La signalisation, les CDN, les pare-feu et les NAT peuvent encore empêcher WebRTC ; la publication ne garantit pas à elle seule la connectivité. Aucune recette avec deux connexions WebRTC réelles n’est revendiquée par les tests simulés.

Références : [GitHub Pages et workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [PeerJS et signalisation](https://peerjs.com/client/faq).
