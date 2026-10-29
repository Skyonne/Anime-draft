> **Source corrigée le 29 octobre 2026 : Tenrai remplace Jikan.** L’annonce reprise par [JikanDotNet](https://github.com/Ervie/jikan.net) indique l’arrêt du point d’accès public Jikan au 1er octobre 2026. Il n’aurait pas dû être choisi pour cette installation. Les sources actives du navigateur et du téléchargeur sont désormais centralisées dans `src/portraits/sources.json` : `https://api.tenrai.org/v1/anime/1735/characters` et `/20/characters`. Le [successeur Tenrai.Net](https://github.com/Kareadita/tenrai.net) documente la compatibilité de schéma et cette URL de base. Les anciennes mentions Jikan ci-dessous expliquent l’historique de la panne ; elles ne décrivent plus les appels actifs.
>
> Le téléchargement réel via Tenrai doit encore être vérifié depuis le réseau utilisateur : l’environnement de l’agent bloque lui-même les accès réseau. Aucune image n’est annoncée comme téléchargée sans fichier présent. **Une publication GitHub n’est pas nécessaire.**

# Portraits privés : téléchargement local et diagnostic

**GitHub n’est pas nécessaire.** Les portraits peuvent être servis par Vite depuis cet ordinateur.

## Procédure actuelle

Double-cliquer `start.bat`. Avant de lancer le site, il essaie de télécharger les références puis les fichiers image, et affiche un résultat réel : nombre de fichiers locaux et nombre d’avatars restant. S’il reconnaît le jeu déjà ouvert sur le port 5173, il ouvre cette adresse au lieu de démarrer un deuxième serveur.

Les fichiers sont enregistrés dans `public/private-portraits/`, avec un `index.json` décrivant leurs correspondances et les erreurs. Le navigateur charge cet index sur le même serveur que le jeu, puis utilise les images locales en priorité. Cela évite de dépendre du hotlinking, du cache d’URL distant ou du CORS de l’API pour afficher les fichiers déjà récupérés. Les images restent cadrées en 4:5.

Si le téléchargement réussit, le catalogue affiche le nombre de fichiers locaux chargés. Si le téléchargement échoue, la fenêtre du lanceur et l’index contiennent la cause. Le navigateur peut encore essayer la source distante, et le jeu reste jouable avec ses avatars.

Pour retenter explicitement ou compléter un cache partiel :

```powershell
npm.cmd run portraits:download
```

Puis actualiser la page ou cliquer « Actualiser les portraits » dans Les ninjas. Ce bouton recharge les références disponibles ; il ne commande pas un téléchargement Node depuis le navigateur.

Le dossier `public/private-portraits/` est ignoré par Git. Un `dist` construit sur cette machine contient toutefois les fichiers présents dans `public` : ce cache est prévu pour l’usage privé demandé, pas présenté comme un ensemble d’images librement redistribuables.

## Résultat effectivement observé dans l’environnement de l’agent

La commande réelle de téléchargement a été exécutée. Les deux sources ont échoué avec **EACCES : accès réseau interdit par l’environnement**. Résultat réel : **0 photo téléchargée, 120 avatars disponibles**. Aucun succès de téléchargement dans le navigateur utilisateur n’est revendiqué. Le lanceur exécuté par l’utilisateur hors de cet environnement restrictif pourra essayer avec son propre accès Internet et donnera son propre résultat.

Les tests passent avec un réseau simulé et des fixtures d’image ; ils vérifient les fichiers écrits, la détection des pages HTML renvoyées à la place d’images, le cache local, les erreurs explicites et l’absence de dépendance à GitHub. Ils ne prouvent pas la disponibilité réelle de Jikan ou du CDN depuis le réseau utilisateur.

---

Historique de l’affichage distant, conservé pour expliquer la séparation des droits et la configuration :

# Portraits distants pour l’installation privée

À la demande de l’utilisateur, cette installation active l’affichage des portraits Naruto disponibles via **Jikan / MyAnimeList**, même sans licence de redistribution vérifiée. Ces images ne sont pas présentées comme libres de droits. L’absence de revenu ou de publication ne constitue pas une licence ; le registre de portraits autorisés reste distinct et inchangé.

## Utilisation

1. Relancer Vite avec `start.bat` pour charger le nouveau fichier `.env.local`.
2. Ouvrir le jeu avec Internet. Les listes de personnages de Naruto Shippuden (1735) et Naruto (20) sont demandées une seule fois au navigateur.
3. Les portraits reconnus remplacent automatiquement les avatars sur l’accueil, les cartes, les résultats et le catalogue.
4. Dans **Les ninjas**, le compteur indique le nombre de références de portraits trouvées et le nombre d’avatars restant. Le bouton **Actualiser les portraits** permet de retenter le chargement si nécessaire.

Les noms sont rapprochés de leurs identifiants locaux avec correspondance exacte, inversion des noms séparés par une virgule et alias de translittération explicites. Les noms ambigus ne sont pas devinés. Par exemple, « Pain » n’est pas assimilé automatiquement à Nagato, et « A » seul ne suffit pas à choisir entre les Raikage. L’entrée groupée Sakon et Ukon est représentée par Sakon lorsqu’une correspondance est disponible.

Les images sont chargées depuis `cdn.myanimelist.net`, dans le cadre 4:5 existant. Elles ne sont pas copiées dans `public` par cette fonctionnalité. Les références sont conservées 30 jours dans `localStorage` ; les fichiers image utilisent le cache normal du navigateur. Ce cache n’est pas une garantie de disponibilité hors ligne.

Le chargement des métadonnées est mutualisé : pas de recherche API à chaque tirage. Les erreurs et limitations 429 sont gérées. Si les listes ne répondent pas, le jeu continue avec les avatars. Une image distante cassée revient à l’avatar, puis aux initiales. Les statistiques, les probabilités et le multijoueur ne dépendent pas de ces appels.

## Configuration et séparation des crédits

`VITE_PRIVATE_PORTRAITS=true` dans `.env.local` active ce mode pour cette machine. Le fichier est ignoré par Git grâce à la règle `*.local`. La variable est lue au démarrage et à la construction : le `dist` construit localement avec cette option la conserve.

Pour désactiver ce comportement, mettre la variable à `false` puis redémarrer / reconstruire. Un clone sans ce fichier, notamment le workflow GitHub Pages normal, n’active pas le chargement privé. Aucun déploiement n’est effectué dans cette tâche.

Les références privées ne sont pas ajoutées au registre `src/data/portraits.json` des médias sous licence vérifiée. La page de crédits distingue ce registre de l’affichage privé ; le catalogue donne les liens de provenance pour les portraits chargés. Aucune fausse autorisation, licence CC ou mention « tous droits acquis » n’est créée.

Documentation technique de la source : [Jikan v4](https://docs.api.jikan.moe/). La mise à disposition via cette API ne transfère pas les droits sur les images, qui restent à leurs ayants droit.

## Vérification de cette modification

Le typage et les **87 tests JavaScript** passent, dont huit tests pour la correspondance des portraits, les noms ambigus, les domaines acceptés, le cache, les pannes et la désactivation complète du chargement privé. Le build de production réussit.

Les requêtes vers l’API réelle sont bloquées dans l’environnement de l’agent. Aucun nombre de portraits effectivement téléchargés n’est donc annoncé : le compteur du catalogue donne le résultat lorsque le navigateur de l’utilisateur a pu contacter la source. Le total de 120 désigne toujours le catalogue jouable ; il ne garantit pas 120 images trouvées.
