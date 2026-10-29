# Sources, import et visuels

La revue détaillée des sources de portraits et les décisions de la dernière mise à jour sont dans [PORTRAITS.md](PORTRAITS.md). Bilan : **0 portrait tiers retenu, 120 avatars originaux conservés**. Les crédits publics sont générés dans `public/portrait-credits.html` ; l’inventaire nominatif est dans [PORTRAIT-COVERAGE.md](PORTRAIT-COVERAGE.md).

## Dattebayo

Source étudiée : <https://dattebayo-api.onrender.com/> ; documentation consultée : <https://github.com/srivarnav/dattebayo-api>.

Le README décrit des collections `characters`, `villages`, `clans`, `tailed-beasts`, `akatsuki`, entre autres, et une pagination par `page` et `limit`. Le périmètre dépasse celui de ce jeu, puisqu’une collection `kara` existe également. Il ne faut pas déduire d’une présence dans cette API l’éligibilité à Naruto/Shippuden.

Lors de la réalisation, les tentatives d’ouverture de la racine et de `/characters?limit=1` ont échoué via l’outil web. La documentation du dépôt a pu être consultée. Aucune réponse JSON exploitable n’a été vérifiée et aucune entrée n’a été importée. La disponibilité actuelle de l’API n’est donc pas garantie. Aucune supposition de statistiques fournies par l’API n’est utilisée.

Le dépôt consulté ne permet pas d’établir une autorisation de redistribution des portraits des personnages. Une licence de code ou une API gratuite ne suffirait d’ailleurs pas à accorder les droits des images de tiers. Aucun visuel de l’API, de Fandom ou de l’anime n’a été téléchargé ou intégré.

Un import futur devrait être une opération de développement facultative : récupérer des métadonnées, filtrer Boruto et les doublons, vérifier manuellement les identités et les combats, puis compléter les notes éditoriales. Les données résultantes resteraient statiques. Tout portrait tiers nécessiterait une provenance et une autorisation de redistribution explicites avant intégration.

## Avatars inclus

Les 120 SVG de `public/characters/` sont des créations abstraites originales produites par `scripts/generate-avatars.py`. Ils combinent initiales, silhouettes géométriques, couleurs et anneaux graphiques. Ils ne prétendent pas représenter fidèlement l’apparence des personnages et ne reproduisent ni planches de manga, ni captures, ni logos officiels. Les emblèmes sont géométriques et originaux.

Leurs couleurs découlent d’un hachage stable de l’identifiant et ne représentent pas le niveau du personnage. Le hachage n’a aucun effet sur les notes ou les probabilités. Les fichiers sont locaux, de petite taille, sans URL externe, script intégré ou police téléchargée. Il n’existe pas de dépendance à un fournisseur d’images.

Les icônes d’interface proviennent de Lucide React (licence ISC). Les dépendances restent soumises à leurs licences respectives. Le nom Naruto et les noms des personnages appartiennent à leurs ayants droit ; ce projet de fans ne revendique aucune affiliation officielle ni transfert de ces droits.

## Références techniques

- Vite : <https://vite.dev/guide/> et <https://vite.dev/guide/static-deploy>.
- Tailwind : <https://tailwindcss.com/docs/installation/using-vite>.
- GitHub Pages : <https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages>.
- Correction d’identité du deuxième Mizukage : Gengetsu Hōzuki, et non Genzō ; chapitre 525, répertorié dans <https://naruto.fandom.com/wiki/Gengetsu_H%C5%8Dzuki>.
