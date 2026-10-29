# Multijoueur PeerJS / WebRTC

## Architecture et disponibilité

Le site est entièrement statique. GitHub Pages distribue HTML, CSS, JavaScript et avatars. Il ne gère pas les salons, ne stocke aucun pseudo et ne reçoit aucun choix du jeu.

Le client **PeerJS 1.5.5** est chargé uniquement à la création ou à la connexion à un salon, depuis jsDelivr, puis un miroir unpkg en cas d’échec. Le solo n’en a pas besoin et ne contacte aucun CDN. Ce chargement versionné évite d’exiger une installation npm supplémentaire dans l’environnement de travail dont le réseau est restreint. Un échec de chargement produit une erreur explicite ; il n’existe pas de faux mode réseau de secours.

Pour héberger aussi le client PeerJS localement : récupérer une copie autorisée de `dist/peerjs.min.js` dans le paquet officiel `peerjs@1.5.5`, conserver sa licence MIT dans `public/vendor/`, puis construire avec `VITE_PEERJS_LOCAL=true`. Le chargeur essaie alors `public/vendor/peerjs.min.js` avant les CDN. Ne pas créer un fichier vide pour masquer une erreur. La version locale est facultative et n’est pas incluse dans cette livraison.

Le service gratuit PeerServer Cloud assure la **signalisation** : il permet aux navigateurs de se trouver et d’échanger les informations initiales de connexion. Il n’est pas un backend de jeu personnel. Il n’offre pas de garantie de disponibilité. L’hôte devient ensuite le coordinateur des parties sur des **canaux de données WebRTC** en étoile : chaque invité est connecté à l’hôte. Les invités n’ont pas besoin d’être connectés directement entre eux.

Deux serveurs STUN publics sont configurés pour aider à déterminer les adresses réseau. Aucun relais TURN, abonnement, serveur personnel ou clé secrète n’est fourni. Certains NAT symétriques, réseaux d’entreprise, VPN et pare-feu empêchent une liaison directe. Le service PeerJS a annoncé la fin de son offre gratuite TURN ; le jeu ne promet donc pas une connexion universelle. Une connexion réussie entre deux onglets sur un réseau donné ne prouve pas la connectivité entre deux réseaux différents.

Références primaires : [PeerJS](https://peerjs.com/), [API DataConnection](https://peerjs.com/client/api/data-connection), [FAQ NAT](https://peerjs.com/client/faq), [arrêt du TURN gratuit](https://github.com/orgs/peers/discussions/1172).

## Identité du salon

Le code contient 12 caractères tirés uniformément parmi 32 symboles non ambigus, soit 60 bits d’espace de recherche. Les tirets sont de présentation : `ABCD-EFGH-JKMN` correspond au vrai Peer ID `naruto-stat-draft-v2-ABCDEFGHJKMN`. Aucun répertoire de salons n’est interrogé. Le code et le lien sont des invitations privées ; ne pas les publier si vous voulez garder le salon privé.

Les liens utilisent exclusivement le paramètre `?room=...` à la racine du site et conservent son sous-chemin GitHub Pages. Aucun rewrite serveur n’est requis. Un lien en `http://127.0.0.1:5173/` ne fonctionne que sur l’appareil qui l’ouvre ; pour deux appareils, partager le lien du site publié.

Chaque participant possède un identifiant stable et un jeton aléatoire de reprise. Ce jeton éphémère est conservé dans `sessionStorage`, dans l’onglet invité, pas dans une base de données ni dans `localStorage`. L’hôte garde l’association en mémoire. Une reconnexion crée réellement un nouveau canal PeerJS et fournit ce jeton ; une actualisation invitée peut également reprendre la place si le même onglet rejoint à temps. Une identité déjà connectée est refusée pour empêcher deux canaux contrôlant une même place. Pour tester plusieurs joueurs, utiliser des navigateurs, profils ou fenêtres privées distincts ; la duplication d’un onglet peut copier son `sessionStorage`.

Un pseudo est limité à 24 caractères, nettoyé des contrôles et rendu par React comme du texte. Aucun HTML entrant n’est injecté. Les pseudos sont visibles des participants mais ne sont pas diffusés dans un catalogue public.

## Protocole v1

Chaque message contient `v`, `seq` et `gameId`. Les tailles sont limitées à 24 576 octets UTF-8. Les types, valeurs, identifiants, decks, états, positions de classement et scores reçus sont validés avant utilisation. Les messages inconnus ou mal formés sont refusés. Une connexion envoie au maximum 30 messages par seconde ; les canaux non authentifiés sont bornés et expirent après huit secondes.

Invité → hôte :

| Type | Fonction |
|---|---|
| `hello` | Pseudo, empreinte du catalogue et jeton ; demande d’admission ou de reprise |
| `ready` | Changement de statut prêt au lobby |
| `pick` | Statistique et personnage courant attendu ; aucun score fourni |
| `rematch` | Retour collectif au lobby après les résultats |
| `leave` | Départ volontaire |
| `pong` | Confirmation de vie du canal |

Hôte → invité :

| Type | Fonction |
|---|---|
| `snapshot` | Acceptation, roster, mode, phase, progression et draft du destinataire seulement |
| `reject` | Salon complet, commencé, fermé, identité invalide ou catalogue différent |
| `error` | Commande refusée sans mutation du match |
| `ping` | Vérification périodique du canal |
| `closed` | Fermeture explicite du salon |

Les snapshots représentent création/admission, changements du lobby, lancement, distribution personnelle, progression, révélation et classement final. Avant la révélation, le roster ne contient aucun choix détaillé ni score adverse. Les tirages sont faits au lancement et ne dépendent d’aucune catégorie choisie. En mode équitable, tous les decks sont identiques. En mode indépendant, un nouveau tirage sans remise est effectué pour chaque joueur ; les decks de joueurs différents peuvent partager certains personnages.

Les séquences croissent par connexion et les doublons sont ignorés. Un ancien `gameId` ne peut pas modifier une nouvelle partie ou son lobby. L’hôte associe chaque canal à l’identité admise : un invité ne choisit pas son identifiant de joueur dans une commande. Chaque choix est vérifié avec le personnage attendu et les catégories déjà occupées. Le dernier choix reste automatique côté interface après une pause ; la commande doit néanmoins satisfaire les mêmes règles de validation côté hôte.

La révélation attend que chaque participant ait terminé ou soit déclaré en abandon. Les scores sont recalculés depuis le catalogue local ; les égalités reçoivent la même position, par exemple 1, 1, 3. Les abandons n’ont pas de score et suivent les joueurs classés. Un joueur ayant déjà terminé conserve son résultat même s’il perd sa connexion ensuite. Le bouton Rejouer ensemble de n’importe quel participant ramène tout le salon au lobby et réinitialise les statuts prêts ; seul l’hôte lance la partie suivante.

## Déconnexions

- Un départ explicite au lobby libère immédiatement la place.
- Une perte de canal réserve la place jusqu’à 30 secondes après détection côté hôte. Le joueur apparaît en reconnexion et n’est plus prêt.
- Les pings circulent toutes les quatre secondes ; un canal silencieux est considéré perdu après environ quinze secondes. Les onglets suspendus longtemps par un téléphone peuvent donc être déclarés déconnectés.
- L’invité tente un nouveau canal toutes les quelques secondes, avec le même jeton. Les choix autoritaires de l’hôte sont restaurés lors du snapshot d’acceptation.
- Après expiration, un joueur non terminé est en abandon. Cela permet aux autres de terminer la partie. Au lobby, la place est libérée.
- En cas de départ de l’hôte, le salon est fermé. Si son navigateur disparaît brutalement, les invités l’apprennent après détection et expiration de la tentative de retour. Il n’existe ni migration d’hôte ni persistance de salon après fermeture de son navigateur.
- Une coupure de signalisation ne détruit pas nécessairement les canaux P2P existants ; une tentative de reconnexion à PeerServer est effectuée. Un message explique que les nouveaux invités peuvent être bloqués pendant cette coupure.

## Limites de confiance

Les données sont publiques et les navigateurs sont sous le contrôle des joueurs. Un utilisateur technique peut consulter les notes et le deck reçu dans le code ou la mémoire ; l’hôte connaît les decks et coordonne les messages. Il peut modifier son client. Les validations évitent des erreurs et certaines commandes illégales ; elles ne fournissent pas une sécurité compétitive comparable à un serveur indépendant faisant autorité.

Les tests réseau injectent des canaux simulés dans le vrai contrôleur de transport. Ils vérifient le protocole et les transitions, pas l’établissement réel de WebRTC, le service externe ou les NAT. Voir `VERIFICATION.md` pour les contrôles effectivement exécutés.

## Recette avec deux navigateurs ou appareils

1. Sur un ordinateur : lancer `start.bat`, puis ouvrir l’URL affichée dans Chrome et Firefox, ou dans deux profils privés indépendants.
2. Dans le premier navigateur, Multijoueur → Créer un salon, choisir un pseudo et copier le code.
3. Dans l’autre, Multijoueur → Rejoindre un salon, choisir un autre pseudo et saisir le code. Attendre que chacun voie deux joueurs connectés.
4. Cocher Je suis prêt dans chaque navigateur. L’hôte lance le duel équitable. Vérifier que le premier ninja et l’ordre des suivants sont identiques.
5. Choisir des catégories différentes. Terminer un navigateur avant l’autre : aucune note adverse ne doit apparaître pendant l’attente.
6. Terminer l’autre draft, vérifier classement, égalités, six cartes, rangs et comparaison de radars. Cliquer Rejouer ensemble et vérifier que tout le monde est « Pas prêt ».
7. Refaire une partie en mode indépendant. Les personnages peuvent se recouper entre joueurs mais ne doivent jamais se répéter dans un même deck.
8. Tester le retour dans les 30 secondes après une perte de canal, puis un départ explicite, un cinquième joueur refusé, une arrivée après lancement refusée et une fermeture de l’hôte.
9. Pour **deux appareils**, ouvrir le **même site GitHub Pages en HTTPS** sur les deux ; le serveur local reste sur 127.0.0.1, sans exposition LAN ou Internet. Tester si possible sur deux réseaux différents. Un échec sur NAT restrictif est une limite possible, pas une invitation à modifier le routeur ou le pare-feu.
