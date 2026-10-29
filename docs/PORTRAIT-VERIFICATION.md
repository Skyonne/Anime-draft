# Vérification de la mise à jour des portraits

## Résultat exact

- Catalogue analysé : **120 identifiants et noms canoniques**.
- Véritables portraits tiers intégrés : **0**.
- Avatars graphiques conservés : **120**.
- Source individuelle retenue pour publication : **aucune** ; il n’existe donc aucun crédit tiers fictif ni portrait téléchargé sans autorisation vérifiée.

Les motifs et limites de la recherche sont détaillés dans [PORTRAITS.md](PORTRAITS.md). Le candidat Wikimedia portant une licence CC BY-SA a été distingué des captures non libres : sa licence est compatible en principe, mais la portée de la déclaration sur les éléments de la franchise n’a pas été établie. Ce résultat n’est pas une affirmation qu’aucun portrait autorisé n’existe ailleurs.

## Contrôles exécutés

| Commande ou contrôle | Résultat |
|---|---|
| `npm run typecheck` | Réussi |
| `npm run validate:data` | Réussi : catalogue et registre des portraits |
| `npm run test -- --run` | **79 tests réussis**, 7 fichiers, 0 échec |
| `python -m unittest discover -s scripts -p test_prepare_portrait.py` | **3 tests réussis**, sur images synthétiques uniquement |
| `npm run build` | Réussi, crédits publics inclus dans `dist` |
| Build avec `--base /naruto-stat-draft/` | Réussi, ressources et crédits inclus sous ce préfixe |
| Inspection XML des avatars | **120 SVG valides**, dimensions 400 × 500, moins de 5 Ko chacun |
| Contrôle d’intégrité du périmètre | **16 fichiers** de catalogue, moteur et multijoueur strictement identiques au début de la tâche, vérifiés par SHA-256 |

Les 11 nouveaux tests JavaScript couvrent notamment la correspondance stricte id/nom, le fallback ordonné portrait puis avatar, les chemins GitHub Pages, les crédits, l’échappement des textes, les autorisations incomplètes, les licences inconnues, les doublons, les dimensions et le format WebP. Les tests existants continuent de passer.

Les tests Python vérifient la conversion WebP 400 × 500 et le retrait de métadonnées, la conservation de la transparence et le refus d’animations. Aucun portrait tiers n’a été utilisé pour les tests. Les métadonnées factices des fixtures JavaScript ne sont jamais inscrites dans le registre de production.

## Optimisation et présentation

Les avatars originaux ont été minifiés sans modifier leur géométrie : poids cumulé **217 918 → 214 798 octets**, soit **3 120 octets économisés**. Le générateur produit désormais directement ce format. Les portraits autorisés futurs disposent d’un outil local de recadrage et de conversion WebP avec une limite de 120 000 octets. Aucun WebP de personnage n’est ajouté dans cette livraison.

L’affichage garde `object-fit: cover`, le ratio 4:5, le cadrage individuel et le chargement différé. Une défaillance d’image passe au visuel suivant et le changement de personnage réinitialise cette défaillance. Les crédits publics sont accessibles depuis le catalogue.

## Limites

Le build local a été vérifié, y compris avec le sous-chemin de déploiement. Le site n’a pas été publié. Aucun test graphique supplémentaire dans un navigateur n’est revendiqué dans cette tâche ; les restrictions Chrome de la session précédente demeurent documentées dans `VERIFICATION.md`. Les validations de droits contrôlent les métadonnées renseignées ; elles ne remplacent pas la lecture et la vérification humaines des permissions.

Les règles, statistiques, tirages, scores, sauvegardes et protocoles multijoueurs n’ont pas été modifiés. Le catalogue JSON conserve exactement son contenu initial.
