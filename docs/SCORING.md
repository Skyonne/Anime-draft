# Méthodologie de notation

Les 720 notes du catalogue sont des évaluations éditoriales subjectives. Elles ne sont pas issues d’un databook, d’une mesure scientifique ou d’une API, et ne doivent jamais être présentées comme officielles. Chaque note a été attribuée manuellement ; aucune génération aléatoire n’intervient dans les données.

## Périmètre

Une seule entrée par personnage, Naruto et Naruto Shippuden uniquement, en privilégiant sa version maximale démontrée. Les transformations temporaires sont admises si elles sont montrées : Huitième Porte de Guy, double Mangekyō de Kakashi, pouvoirs des Six Chemins. `version` précise l’état retenu ; `evidence` indique le combat ou la capacité guidant l’évaluation. Les notes d’une même entrée visent cette version, sans ajouter artificiellement les avantages incompatibles d’autres formes. Exemple : Obito jinchūriki de Jūbi ne conserve pas l’intangibilité de Kamui.

L’Edo Tensei permet de représenter des combattants décédés. L’absence de mort définitive ou la régénération automatique du sort ne signifie pas endurance 100 : les réserves, la résistance démontrée et la capacité à continuer le combat sont estimées sans bonus illimité de réanimation. Les capacités connues de leur vivant restent pertinentes.

Les hôtes sont évalués avec leur bijū à leur maximum montré. Les bijū n’ont pas une deuxième entrée distincte pour éviter de compter deux fois le même ensemble de capacités. Sakon et Ukon restent une entrée commune, car leur combat démontré repose sur leur symbiose. Akamaru fait partie des capacités de Kiba.

## Échelle commune

| Intervalle | Interprétation |
|---|---|
| 0–19 | Aptitude presque absente |
| 20–39 | Faible |
| 40–59 | Moyenne |
| 60–74 | Compétente |
| 75–84 | Très puissante |
| 85–94 | Exceptionnelle |
| 95–100 | Légendaire |

Les différences d’un ou deux points ne sont pas des conclusions de canon. Les groupes et ordres de grandeur comptent davantage. Un ninja célèbre peut avoir une faible note dans une catégorie qu’il ne maîtrise pas : ninjutsu de Lee, force d’un spécialiste des illusions, endurance d’un combattant malade.

## Ce que mesure chaque voie

- **Force** : force du corps et amplification physique démontrée. La taille d’une explosion ou d’une marionnette n’est pas assimilée à la force musculaire de son utilisateur.
- **Vitesse** : déplacement, réaction, mobilité et téléportation employée effectivement en combat. Minato est une référence à 99 ; ce n’est pas une mesure de vitesse physique pure.
- **Ninjutsu** : puissance, diversité, portée et maîtrise des techniques, invocations et scellements. Les techniques médicales et les manipulations de chakra sont pertinentes. Le genjutsu n’a pas sa propre catégorie et n’est pas automatiquement converti en ninjutsu : Kurenai et Tayuya peuvent donc sembler sous-représentées.
- **Taijutsu** : technique martiale, précision, efficacité au contact et kenjutsu. Guy à huit portes est la référence à 100. Porter une grosse arme ne suffit pas pour obtenir une note légendaire.
- **Intelligence** : analyse tactique, plans, adaptation et décisions démontrées. L’omniscience d’un lecteur ou la seule ancienneté d’un personnage ne sont pas un critère.
- **Endurance** : réserves de chakra, résistance, régénération propre et durée du combat. Les sacrifices et techniques fatales limitent cette catégorie même lorsqu’ils donnent une force maximale exceptionnelle.

## Références de calibration

Guy : Taijutsu 100. Minato : Vitesse 99. Shikamaru : Intelligence 98. Tsunade : Force 96. Kisame : Endurance 95. Madara : Ninjutsu 99. Ces valeurs sont des repères internes, pas des données officielles. Les personnages secondaires n’héritent pas de ces notes par association avec une équipe puissante.

## Incertitudes et limites de couverture

Le catalogue initial contient 120 entrées, pas plusieurs centaines. Certaines viennent de combats de l’anime Shippuden, notamment Ameyuri ; leur contexte le signale. Les réanimés secondaires, le troisième Kazekage connu via sa marionnette, Duy et les capacités de Hagoromo comportent davantage d’incertitude. Hagoromo repose en partie sur des démonstrations narratives du passé ; il doit être réévalué si le projet adopte une règle stricte de combat direct uniquement. Les capacités des épéistes sont moins détaillées que celles des protagonistes. Aucun recensement scène par scène n’a été effectué et aucune validation de chaque note par une source officielle n’est revendiquée.

Les personnages sans assez de capacités montrées pour une évaluation utile, les doublons de forme, les figurants anonymes, les personnages de films hors périmètre et Boruto sont exclus. Le nombre d’entrées ne justifie jamais l’invention de personnages ou de statistiques prétendument officielles.

## Score et rangs

Le score est exactement la somme des six notes correspondant aux affectations. Moyenne = score / 6. Pas de bonus de village, de popularité, de rareté ou de synergie. Les rangs de `src/game/scoring.ts` sont configurables : Genin 0+, Chūnin 300+, Jōnin 390+, ANBU 450+, Kage 510+, Légende Shinobi 560+. Ce sont des catégories de jeu, pas des équivalences de puissance du canon.

Pour corriger une note, modifier le JSON et documenter le contexte dans `evidence`. Une proposition de correction devrait citer le combat concerné, comparer les voisins de l’échelle et préciser les restrictions de la forme retenue.
