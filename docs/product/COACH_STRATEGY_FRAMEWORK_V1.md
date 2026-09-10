# Coach Strategy Framework V1 — spécification produit

Version documentaire : **V1.1**, intégrant la revue propriétaire du cadrage V1.
Statut : **document produit validé avant développement**.
Date de recherche et de vérification : 10 septembre 2026.

Référence : dépôt `Axelctrt/sport-nutrition-tracker`, `origin/develop` après
fusion de C10.1, commit `c87255c9be482a9b70dbe8d792cf44c9c24a844a`, tree
`29340841560bdb4276b464683ec6169f9f2967bf`, vérifiés après fetch.
Le checkout local C10.1 présente le même contenu que ce tree.

Ce document distingue l'**actuel vérifié**, les **décisions produit validées**
et les **spécifications futures restant à cadrer**. Il remplace le brouillon
V1 ; il ne modifie ni la roadmap ni le code. La validation produit de ce
document ne vaut **jamais autorisation d'implémentation**. Les paramètres métier,
les contrats d'application et les lots futurs nécessitent leur cadrage et leur
autorisation propres.

## 1. Résumé exécutif

**Décision validée : un Coach hybride qui propose une stratégie explicable,
mais dont chaque changement effectif est accepté par l'utilisateur.**

Le bon choix n'est pas nécessairement une nouvelle stratégie. Lorsque les
données ne permettent pas de trancher, le bon résultat est « décision
différée », avec les informations manquantes et la prochaine réévaluation.

Le socle V1 validé comporte trois stratégies : **déficit actif,
stabilisation, construction active**. Elles ne sont pas sept algorithmes
concurrents :

- Un **diet break** est un épisode temporaire de stabilisation dans un parcours
  de perte, à cadrer après le socle.
- Un **refeed** est une tactique nutritionnelle courte, pas une stratégie
  générale ni un remède au plateau.
- La **reverse diet** est une modalité de sortie progressive, sans supériorité
  suffisamment établie pour en faire un passage obligatoire.
- Le **mini-cut** est une stratégie avancée prioritaire à étudier après le
  socle : elle organise un déficit borné dans un parcours de construction.
  Elle reste différée jusqu'à validation de ses conditions propres.
- La **compétition** est un contexte spécialisé avec plusieurs phases et
  exigences de sécurité, pas un objectif de poids déguisé.

Le modèle distingue trois axes : ce que l'utilisateur veut obtenir,
l'approche actuellement acceptée et l'état observé. « Récupération dégradée »
est un signal/priorité ; ce n'est pas une phase créée automatiquement.

**Limite structurante de l'existant :** C7 associe encore directement la phase
à `loss / maintenance / gain`. C8 protège spécifiquement contre certaines
nouvelles baisses caloriques ; il n'est pas un Safety universel des stratégies.
C9 conserve une mémoire par bilan, pas un historique complet des transitions.
Une stratégie réellement adaptable nécessite donc des contrats nouveaux,
pas seulement des libellés supplémentaires dans le Hub.

Le périmètre V1 concerne les parcours généraux d'adultes, hors préparation
compétitive et situations nécessitant une prise en charge spécialisée. Les
exclusions et leur vérification devront être validées avant activation ;
l'absence d'information médicale ne constitue jamais une autorisation.

## 2. Modèle conceptuel validé

### 2.1 Définitions et frontières

| Notion | Question | Source/autorité | Exemple |
| --- | --- | --- | --- |
| Objectif utilisateur | Quelle intention long terme poursuit-on ? | Choix explicite du profil, jamais déduit du comportement | Construction |
| Stratégie | Quelle approche Coach est actuellement proposée et acceptée ? | Proposition structurée, puis acceptation ; avant acceptation, elle reste proposée | Construction active |
| Phase actuelle | Quel épisode temporel appartenant à cette stratégie est actif ? | Épisode accepté, avec identité et contexte ; pas un diagnostic | Épisode de construction actuel |
| État Coach | Que montrent les données disponibles ? | Analyse déterministe C1/C3/C4 | Signaux contradictoires, récupération dégradée |
| Décision | Quelle action proposer aujourd'hui ? | Autorité intégrée C4/C5 | Revoir la récupération, maintenir, proposer une transition |
| Explication | Pourquoi cette décision et quelles limites ? | Projection des raisons structurées | Pourquoi ne pas accentuer le déficit |
| Mémoire | Qu'a-t-on réellement décidé et appliqué ? | Événements explicites, contexte et résultat distingués | Proposition acceptée, effet appliqué à telle version du plan |

**Invariants de hiérarchie :**

- Une stratégie n'est pas une phase.
- Une phase ne remplace pas l'objectif.
- Une proposition n'est jamais une phase active tant qu'elle n'est pas acceptée.
- La décision est l'action proposée aujourd'hui après analyse ; elle peut
  maintenir l'approche actuelle sans changer la stratégie ni ouvrir une phase.

Exemple de distinction, sans autoriser le mini-cut dans le socle :

| Notion | Situation actuelle de l'exemple | Évolution éventuelle, différée et après acceptation |
| --- | --- | --- |
| Objectif | Construction | Construction, inchangé |
| Stratégie | Construction active | Mini-cut |
| Phase | Épisode de construction actuel | Épisode correctif temporaire |

Tant que le mini-cut est seulement proposé, la stratégie et la phase actives
de l'exemple restent celles de construction. Après acceptation, le nouvel
épisode appartient à la stratégie Mini-cut ; il ne devient pas l'objectif
long terme de l'utilisateur.

Le modèle demandé est utile, mais ne doit pas devenir une chaîne où la phase
« cause » seule la décision. Safety, qualité des données et état observé
contraignent la décision à chaque réévaluation :

```text
Objectif choisi + stratégie/phase acceptées + données qualifiées
                              |
               Safety + qualité + analyse existante
                              |
                    Décision unique C4/C5
                      /               \
           Explication seule       Proposition éventuelle
                                           |
                                Validation explicite
                                           |
                              Revalidation + application
                                           |
                                  Mémoire factuelle
                                           |
                                   Réévaluation
```

**Simplicité :** la stratégie nomme l'approche ; la phase nomme son épisode
temporel, par exemple « Construction active » et « Épisode de construction
actuel ». Elle ajoute une identité d'épisode et un prochain rendez-vous, pas
une seconde taxonomie de microphases. Aucun calendrier automatique de cycles.

### 2.2 Contrats futurs, sans implémentation

Le futur contrat de stratégie doit porter : objectif de référence et sa
version, type de stratégie, finalité, effets autorisés, critères de revue,
version des règles et niveau d'appui scientifique.

Une phase acceptée doit référencer : son identité, la stratégie, la décision
d'acceptation, le plan effectivement appliqué, sa date d'effet et sa prochaine
revue. La proposition et la phase active sont deux objets conceptuels distincts.
Une proposition affichée n'est jamais une phase commencée.

La proposition expose : situation actuelle, stratégie proposée, raisons et
preuves sources, inconnues, facteurs bloquants, changements exacts du plan,
date d'effet, conditions d'invalidation et version de l'état attendu.

Le snapshot de lecture reste non persisté. Seuls des événements métier
explicitement définis justifient une écriture. Recharger `/coach` n'en crée pas.

### 2.3 Point bloquant à résoudre avant toute activation

Aujourd'hui, la phase C7 est une projection du profil. Passer temporairement
en stabilisation tout en conservant un objectif de perte exige de séparer
**intention long terme** et **contexte du plan courant**.

Il est interdit de résoudre cela en changeant discrètement `profile.goal`, ou
en affichant « Stabilisation » tandis que le plan reste traité comme un déficit.
Un adaptateur métier devra définir explicitement comment les services existants
produisent le plan accepté, sans changer leurs formules, versions ou arrondis.
S'il faut modifier un contrat de calcul, une validation métier dédiée sera
nécessaire. Tant que cette cohérence n'est pas prouvée, une proposition de
transition est **non applicable**, même si son explication est disponible.

## 3. Objectifs supportés

| Objectif étudié | Sens produit | Situation actuelle | Position V1 |
| --- | --- | --- | --- |
| Perte | Réduire la masse grasse en préservant les capacités utiles | `loss`, objectif de poids existant | Réutiliser ce choix sans promettre une mesure directe de graisse perdue |
| Maintien | Conserver une situation corporelle et des habitudes soutenables | `maintenance` | Conserver comme objectif de premier niveau, pas seulement comme pause |
| Construction | Développer la masse musculaire et les capacités associées | `gain`, objectif de prise de poids | Réutiliser, sans assimiler toute prise de poids à du muscle |
| Recomposition | Améliorer la composition corporelle, sans direction pondérale unique obligatoire | Aucun objectif dédié ; `possibleRecomposition` existe comme état Coach | Reconnaître le besoin, mais différer un nouvel objectif exécutable ; ne pas le convertir silencieusement en `maintenance` |
| Compétition | Préparer une échéance et des exigences propres à une discipline | C11 planifié, non livré | Contexte spécialisé différé, sélection explicite et cadre dédié |

La recomposition est physiologiquement possible : l'essai de Longland et al.
chez 40 jeunes hommes, sur quatre semaines d'exercice intense et d'alimentation
contrôlée, observe un gain de masse maigre et une perte de graisse dans le
groupe à apport protéique supérieur. Cela ne démontre ni un résultat garanti
chez tous les pratiquants ni la validité d'un détecteur basé sur poids/tour de
taille. Le protocole ne devient pas une prescription SportPilot.
[Essai randomisé de Longland et al., 2016](https://pubmed.ncbi.nlm.nih.gov/26817506/).

**Décision validée :** aucun objectif exécutable de recomposition dans le socle
V1. La recomposition peut être reconnue comme un état observé ou une évolution
possible, mais ne doit pas devenir une promesse produit tant qu'un contrat de
succès mesurable n'existe pas. « État observé » désigne ici une qualification
prudente des signaux existants, pas la preuve d'un changement de composition.

Sont exclus : la « détection de recomposition automatique », l'affirmation
d'un gain musculaire et la conversion silencieuse vers `maintenance`.

Ne pas ajouter deux valeurs de profil uniquement
pour remplir un menu. Recomposition nécessite son propre contrat de succès et
d'observation ; compétition nécessite un cadre spécialisé. En attendant,
l'utilisateur conserve son objectif actuel et reçoit les limites explicites
du produit. Le Coach peut reconnaître une évolution compatible avec une
recomposition, sans affirmer avoir mesuré du muscle gagné.

## 4. Stratégies supportées

### 4.1 Lecture scientifique

Les niveaux ci-dessous sont une synthèse de conception, **pas une cotation
GRADE formelle**. Recherche ciblée d'essais originaux et de positions officielles,
non revue systématique exhaustive. Certains résultats ont été consultés via
leurs résumés indexés ; aucune prétention d'analyse exhaustive des données
individuelles. Absence de preuve de supériorité ne signifie pas preuve
d'inefficacité ou d'équivalence.

Deux principes ont un appui solide : une perte de graisse durable implique un
déficit énergétique ; l'entraînement de résistance est un levier du développement
musculaire. Cela ne valide pas une vitesse universelle, un surplus universel ou
les formules de l'application. Les mesures de composition corporelle ont elles
aussi leurs limites.
[Position ISSN sur alimentation et composition corporelle, 2017](https://link.springer.com/article/10.1186/s12970-017-0174-y),
[position ACSM actualisée sur l'entraînement de résistance, 2026](https://pubmed.ncbi.nlm.nih.gov/41843416/).

Les critères d'entrée/sortie ci-dessous forment le **cadre produit**. Leurs
paramètres opérationnels devront être explicités et validés dans les fiches
de règles avant implémentation ; ce ne sont pas des seuils cliniques
directement déduits de ces publications.

### 4.2 Déficit actif — socle V1

- **Rôle/objectif :** conduire le parcours de perte, pas maximiser sa vitesse.
- **Utilisation :** objectif de perte explicite, plan cohérent, données
  interprétables et absence de veto applicable.
- **Entrée :** choix initial compatible ou transition acceptée ; objectif
  confirmé, qualité suffisante, contexte Safety disponible. Un plateau seul
  ne justifie ni entrée ni intensification.
- **Sortie/revue :** objectif atteint ou modifié par l'utilisateur ; demande de
  pause ; préoccupations de récupération ou trajectoire excessive ; difficultés
  répétées qui rendent le plan inadapté. Ces signaux ouvrent une revue, pas une
  modification automatique.
- **Risques :** restriction excessive, fatigue, rigidité alimentaire, perte de
  masse maigre, fausse réaction aux variations courtes.
- **Preuve :** forte pour le principe énergétique ; plus contextuelle pour la
  vitesse appropriée. Chez 24 athlètes, Garthe et al. ont comparé deux rythmes
  de perte et observé des résultats de masse maigre plus favorables dans le
  groupe lent ; cela ne fournit pas un seuil universel pour les utilisateurs.
  [Essai de Garthe et al., 2011](https://pubmed.ncbi.nlm.nih.gov/21558571/).
- **Compatibilité :** élevée avec `loss`, mais transition depuis une autre
  stratégie conditionnée au contrat de plan et au veto Safety.

### 4.3 Stabilisation — socle V1

- **Rôle/objectif :** viser la stabilité du plan et de la trajectoire, sans
  exiger un poids identique chaque matin ni promettre une « réparation ».
- **Utilisation :** objectif de maintien ; sortie de perte ; choix explicite de
  suspendre une progression pondérale. Une récupération préoccupante motive
  une revue, pas une certification que la stabilisation suffit.
- **Entrée :** objectif compatible ou pause souhaitée ; bilan expliquant
  pourquoi la progression ne doit pas être poursuivie telle quelle ; plan
  de maintien validable par les services métier.
- **Sortie/revue :** nouvelle intention confirmée, données suffisantes,
  réévaluation des préoccupations. Pas de fin automatique après un délai fixe.
- **Risques :** maintenir par erreur un apport encore insuffisant, interpréter
  une variation hydrique comme un échec, transformer une pause en obligation.
- **Preuve :** cohérente avec le bilan énergétique ; pas de preuve d'une durée
  de stabilisation obligatoire ou d'un « reset métabolique » standard.
  [Position ISSN, limites et bilan énergétique](https://link.springer.com/article/10.1186/s12970-017-0174-y).
- **Compatibilité :** élevée pour `maintenance` ; nouvelle séparation
  objectif/plan indispensable pour une stabilisation pendant `loss` ou `gain`.

### 4.4 Construction active — socle V1

- **Rôle/objectif :** soutenir la progression musculaire avec un entraînement
  cohérent, pas piloter uniquement la hausse du poids.
- **Utilisation :** objectif `gain`, pratique et disponibilité d'entraînement
  connues, plan existant adapté et accepté.
- **Entrée :** intention confirmée ; activité réelle et récupération examinées.
  L'absence de progression sur une séance ne justifie pas plus de calories.
- **Sortie/revue :** objectif modifié ; prise excessive qualifiée ; trajectoire
  corporelle et performance discordantes sur données comparables ; souhait de
  stabilisation. Pas de mini-cut automatique.
- **Risques :** confondre poids et muscle, excès de surplus, poursuite malgré
  blessure, modification calorique pour compenser un problème d'entraînement.
- **Preuve :** solide pour le rôle de l'entraînement, plus limitée pour le
  surplus optimal. Un essai de huit semaines, 17 participants ayant terminé,
  comparant maintien et deux surplus chez des pratiquants entraînés, relie
  surtout les gains pondéraux rapides à l'augmentation des plis cutanés ;
  les bénéfices musculaires/force ne sont pas uniformes. Ni « surplus maximal »
  ni valeur précise applicable à tous n'en découle.
  [Helms et al., 2023](https://link.springer.com/article/10.1186/s40798-023-00651-y).
- **Compatibilité :** bonne avec `gain` et les observations C3 ; aucun nouveau
  programme ou surplus chiffré n'est validé ici.

### 4.5 Reverse diet — ne pas retenir comme stratégie v1

- **Rôle/objectif :** remonter progressivement les apports après restriction ;
  distinguer cette préférence comportementale d'une nécessité physiologique.
- **Utilisation envisageable :** accompagnement individualisé d'une sortie de
  régime ; pas une réponse générique à un plateau.
- **Entrée :** fin du déficit, demande explicite et justification ; jamais
  déduite d'un supposé « métabolisme cassé ».
- **Sortie :** plan de maintien approprié atteint, préférence changée ou
  préoccupations exigeant une autre prise en charge. Aucun rituel de paliers.
- **Risques :** prolonger une restriction problématique, créer une peur de
  manger davantage, imposer un suivi inutilement complexe.
- **Preuve :** limitée. Une analyse préliminaire publiée en supplément en 2025
  compare trois sorties de régime chez 49 adultes entraînés ; aucune différence
  statistiquement significative de reprise pondérale n'est rapportée. Ce petit
  résultat ne démontre ni supériorité ni équivalence des méthodes.
  [Analyse préliminaire sur la reverse diet, 2025](https://www.tandfonline.com/doi/abs/10.1080/15502783.2025.2550185).
- **Compatibilité :** faible pour une fonction prescriptive ; information
  explicative possible, protocole différé. Ne pas créer de paliers automatiques
  ou modifier les formules pour simuler une restauration métabolique.

### 4.6 Refeed et diet break — deux objets différents

**Diet break : épisode de stabilisation, option ultérieure.**

- **Rôle/objectif :** interruption planifiée du déficit, potentiellement utile
  pour sa soutenabilité ; ne pas promettre une meilleure fonte de graisse.
- **Utilisation/entrée :** souhait explicite de pause, contraintes ou charge
  ressentie documentées ; plan de maintien et rendez-vous de revue acceptés.
- **Sortie :** revue du souhait de reprendre, de la tolérance et de Safety ;
  aucune reprise du déficit par simple expiration du calendrier.
- **Risques :** allongement du parcours, confusion avec une alimentation sans
  cadre, stress devant une variation de poids, persistance d'un problème que
  la pause ne traite pas.
- **Preuve :** bénéfice de supériorité non établi. L'essai ICECAP, chez 61
  adultes entraînés, ne trouve pas de meilleure perte de graisse ou rétention
  de masse maigre avec les pauses planifiées qu'avec le déficit continu.
  Les calendriers totaux diffèrent : ne pas comparer seulement les semaines
  de restriction comme s'il s'agissait de la même durée de parcours.
  [Peos et al., ICECAP, 2021](https://pubmed.ncbi.nlm.nih.gov/33587549/).
- **Compatibilité :** bonne comme réutilisation future de stabilisation, après
  contrat objectif/plan et règles de sortie ; inutile d'ajouter une quatrième
  stratégie de base.

**Refeed : tactique courte, hors socle.**

- **Rôle/objectif :** répartition temporaire des apports, souvent glucidiques,
  au sein d'un plan ; pas une phase de vie Coach.
- **Utilisation/entrée :** besoin individualisé lié à l'entraînement et plan
  explicite ; ni fatigue isolée ni pesée haute ne suffisent.
- **Sortie :** fin de la tactique convenue, avec réévaluation si difficulté ;
  aucune compensation restrictive imposée ensuite par le Coach.
- **Risques :** cycles restriction/compensation, complexité, dérive des macros,
  fausse promesse d'accélération métabolique.
- **Preuve :** limitée et dépendante du protocole. Un petit essai de sept
  semaines chez 27 pratiquants rapporte une meilleure préservation de masse
  non grasse avec deux jours de refeed glucidique ; cela ne valide pas toutes
  les formes de refeed ni leur nécessité. Masse non grasse et muscle ne sont
  pas synonymes.
  [Campbell et al., 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7739314/).
- **Compatibilité :** faible sans nouveau contrat nutritionnel ; ne pas
  modifier les macros ou faire passer ce protocole dans l'acceptation C5.

### 4.7 Mini-cut — stratégie avancée prioritaire à étudier, différée

**Priorité produit validée :** étudier le mini-cut après le socle, car il répond
au cas fréquent d'une phase de construction dont la trajectoire corporelle
devient incompatible avec l'objectif initial. Cette priorité d'étude ne vaut
ni inclusion dans le socle V1 ni autorisation de développement.

- **Rôle/objectif :** stratégie corrective temporaire de déficit dans un
  parcours de construction. Sa phase est l'épisode correctif borné ; elle
  préserve l'intention long terme et les garde-fous de la doctrine future du
  MASTER PLAN. Pas de perte accélérée illimitée sous un autre nom.
- **Utilisation/entrée :** demande ou proposition contextualisée, trajectoire
  confirmée, critères d'arrêt convenus, intention de construction conservée.
  Aucun déclenchement par pourcentage de graisse estimé ou inconfort visuel seul.
- **Sortie :** critère accepté atteint, limite d'épisode atteinte ou besoin de
  revue protectrice ; retour en construction uniquement après confirmation.
  Si le besoin devient durable, requalifier explicitement le parcours.
- **Risques :** alternance chronique prise/restriction, dérive vers un crash
  diet, calendrier prioritaire sur la récupération.
- **Preuve :** le déficit a une base solide ; la supériorité du « mini-cut »
  comme séquençage particulier n'est pas établie par les sources examinées.
  Les essais généraux de perte ne prouvent pas cette doctrine de cycles.
- **Compatibilité :** stratégie avancée pouvant réutiliser les contrats de
  déficit, avec son propre épisode temporel. Elle reste uniquement proposée
  avant validation utilisateur, bornée et sans seuil automatique non validé.
  **Aucune durée, vitesse ou valeur de seuil n'est nouvellement validée ici.**

### 4.8 Préparation compétition — cadre spécialisé différé

- **Rôle/objectif :** servir une échéance sportive déclarée et une discipline,
  avec accompagnement et récupération post-compétition prévus.
- **Entrée :** adulte, demande explicite, cadre et suivi adaptés ; le profil
  `loss` ne signifie jamais « athlète en préparation ».
- **Sortie :** échéance, interruption souhaitée ou revue de sécurité ; la
  récupération post-show ne doit pas être omise. Son existence ne vaut pas
  autorisation d'appliquer automatiquement un plan.
- **Risques :** disponibilité énergétique problématique, atteintes à la santé
  et aux performances, comportements alimentaires à risque, pression de date.
- **Preuve :** les risques sont documentés ; cela ne valide pas un protocole
  universel. Hulmi et al. ont suivi 27 compétitrices et 23 témoins : la
  préparation s'accompagne de modifications hormonales, dont la récupération
  n'est pas uniforme après plusieurs mois. C'est une étude de population
  spécifique, non une règle individuelle de durée de récupération.
  [Hulmi et al., 2017](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2016.00689/full).
- **Compatibilité :** relever de C11, pas du moteur général v1. Exclure
  déshydratation agressive, diurétiques, manipulations dangereuses des
  électrolytes et pharmacologie/PED. Aucune automatisation de peak week.

## 5. Matrice décisionnelle

Cette matrice prescrit **le type de réponse du Coach**, pas une dose calorique.
« Proposer » implique tous les garde-fous et l'acceptation de la section 7.
« Favorable » ne suffit jamais à lui seul. Les lignes différées ne deviennent
pas exécutables parce qu'elles figurent dans le tableau.

| Objectif | Stratégie envisagée | Signaux favorables | Signaux défavorables ou inconnus | Action Coach |
| --- | --- | --- | --- | --- |
| Perte | Déficit actif, poursuite | Trajectoire qualifiée cohérente, récupération tolérable, suivi interprétable | Perte excessive, veto Safety, mauvaise qualité, contexte aigu | Maintenir si compatible ; sinon priorité protection/collecte, aucune intensification |
| Perte | Ajustement dans le déficit existant | Plateau déjà qualifié par C1/C4, alimentation comparable, activité et entraînement examinés | Eau possible, adhérence incertaine, activité diminuée, récupération préoccupante | Réutiliser la décision C4 ; pas de changement de stratégie pour contourner ses blocages |
| Perte | Stabilisation | Souhait de pause/sortie, objectif atteint confirmé, difficultés persistantes documentées | Maintien non calculable, Safety non disponible, situation spécialisée | Proposer une revue puis une transition applicable seulement si le plan est cohérent ; sinon différer |
| Perte | Diet break, différé | Pause souhaitée, plan borné et prochain bilan | Promesse de relance métabolique, reprise imposée d'avance | Expliquer l'option future ; aucune programmation automatique |
| Maintien | Stabilisation | Intention stable, données compatibles avec le maintien | Dérive qualifiée, données insuffisantes, changement d'intention | Maintenir ou demander revue/clarification, pas imposer perte ou prise |
| Construction | Construction active | Intention explicite, entraînement effectif, trajectoire et récupération compatibles | Prise excessive qualifiée, performance non comparable, blessure | Maintenir ou revoir le domaine limitant avec C4 ; pas augmenter le surplus sur une séance |
| Construction | Stabilisation | Souhait de pause, trajectoire à réévaluer, difficultés répétées | Approche proposée sur une pesée ou sans objectif confirmé | Proposer une revue ; effet éventuel soumis au contrat de plan |
| Construction | Mini-cut, différé et prioritaire à étudier après le socle | Trajectoire corporelle confirmée incompatible avec l'objectif initial, épisode explicitement borné | Alternances répétées, restriction agressive, absence de sortie, veto | Ne pas activer en V1 ; étude prioritaire puis cadrage propre, proposition et acceptation obligatoires |
| Recomposition | Stabilisation ou construction contrôlée, futur | Résistance régulière, observations corporelles/performance convergentes, intention clarifiée | Poids seul, promesse de muscle mesuré, succès non défini | Expliquer les limites ; aucun mapping automatique vers `maintenance` ou `gain` |
| Recomposition | Déficit, futur | Priorité de perte choisie explicitement après clarification | Objectifs simultanés incompatibles ou non hiérarchisés | Faire choisir l'intention prioritaire ; pas de nouveau calcul « recomposition » |
| Sortie de perte, tout objectif | Reverse diet, différée | Préférence explicite et accompagnement individualisé | Restriction prolongée, justification métabolique spéculative | Ne pas recommander un protocole standard ; discuter la sortie sans imposer de paliers |
| Tout objectif général | Refeed, hors socle | Contexte sportif individualisé, contrat nutritionnel dédié | Fatigue isolée, compensation, dépassement des macros autorisées | Ne pas en faire une décision C4 standard |
| Compétition | Préparation puis récupération, C11 | Intention/discipline/échéance déclarées et cadre spécialisé | Mineur, risques, objectifs irréalistes, absence de suivi | Expliquer le hors-périmètre v1 ; jamais convertir en déficit plus agressif |
| Tous | Aucune nouvelle stratégie | Données absentes, contradictoires ou proposition obsolète | Toute tentative d'inférer une certitude | Différer, expliquer ce qui manque ; ne pas fabriquer de phase |

### Ordre déterministe des arbitrages

1. Vérifier identité de l'espace, objectif et cohérence du plan de référence.
2. Évaluer Safety disponible et garde-fous applicables. Un veto ne peut pas
   être compensé par de « bons » signaux ailleurs.
3. Vérifier qualité, fraîcheur et comparabilité des signaux nécessaires.
4. Réutiliser la priorité C4 : ne pas corriger l'alimentation pour masquer une
   récupération, une activité ou un entraînement non qualifiés.
5. Examiner seulement les stratégies autorisées compatibles avec l'intention.
6. Préférer la continuité d'une stratégie encore compatible à une transition
   sans bénéfice explicable. Si plusieurs options restent plausibles, exprimer
   l'incertitude et demander la préférence, sans faux classement numérique.
7. Produire une seule action principale et ses raisons. Aucune mutation à ce stade.

Il n'existe pas de score global « 72 % prêt pour un mini-cut ». Les règles
utilisent des conditions explicites et des facteurs bloquants traçables.

## 6. Signaux utilisés

### 6.1 Signaux utilisables pour un futur socle V1

La V1 réutilise exclusivement les signaux déjà existants et qualifiés :

- **Corps :** tendance de poids et mesures existantes qualifiées, dont le tour
  de taille lorsqu'il est disponible.
- **Performance :** progression, stagnation et régression déjà qualifiées
  par C3 sur des expositions comparables.
- **Récupération et contexte d'adhérence :** fatigue, douleur/blessure,
  adhérence et autres signaux déjà existants. L'adhérence reste une observation
  de suivi, pas une mesure physiologique de récupération ; aucune nouvelle
  fusion de scores n'est introduite par ce regroupement de présentation.
- **Safety :** règles C8 existantes, avec leur périmètre réel et leurs limites.

L'objectif, le plan et les mémoires sont des contextes structurés, pas de
nouveaux signaux physiologiques. La liste ci-dessous précise la réutilisation
de ces sources ; elle n'autorise aucune collecte ou estimation supplémentaire.

| Domaine | Source actuelle utilisable | Usage autorisé | Ce qu'il ne prouve pas |
| --- | --- | --- | --- |
| Intention | Objectif du profil | Compatibilité des stratégies | Motivation, échéance ou compétition non déclarées |
| Poids/tour de taille | Mesures qualifiées et tendances C1 | Direction et cohérence de trajectoire | Masse musculaire gagnée ou graisse perdue exactement |
| Alimentation | Journées complètes/comparables, adhérence et écarts C4/C5 | Interprétabilité du suivi et du candidat existant | Dépense énergétique vraie ou métabolisme « bloqué » |
| Activité | Réel/attendu et activité planifiée existants | Explication d'une divergence, priorité activité | Calories à compenser automatiquement |
| Résistance | Expositions comparables C3, progression/stagnation/dégradation | Contexte de performance | Hypertrophie certaine, diagnostic de surentraînement |
| Récupération | Signaux réellement rapportés et état C1 | Tolérance et priorité de revue | Cause médicale d'une fatigue |
| Contexte aigu/âge | Données structurées disponibles pour C8 | Veto et explication existants | Dépistage clinique complet ou autorisation médicale |
| Décisions passées | Mémoires C9 réellement disponibles | Ce qui a été proposé/accepté/refusé | Efficacité causale d'une stratégie ou historique absent |

Les provenances C0/C0.2 restent déterminantes : une initialisation de profil,
un fallback ou une donnée legacy inconnue ne deviennent pas des observations
confirmées. Une valeur subjective n'est pas déduite de l'absence de check-in.
Le verdict du jour C2 n'est pas calculé sans son check-in.

### 6.2 Signaux différés

Ne pas introduire sans contrat spécifique validé :

- de nouveaux scores composites ;
- une estimation automatique de masse grasse ;
- une interprétation médicale ;
- de nouveaux questionnaires complexes.

Ces éléments n'alimentent pas le futur socle V1 par défaut. Une préférence
nouvelle peut être discutée explicitement, mais sa collecte structurée, sa
persistance ou son utilisation comme signal demandent leur propre contrat.
Un signal absent n'est jamais remplacé par une estimation inventée.

### 6.3 Combiner sans compter deux fois

Pour proposer une adaptation à partir des observations, demander une tendance
longitudinale qualifiée dans le domaine principal **et** un contexte corroborant
indépendant, avec les contrôles de qualité pertinents. Une demande volontaire
de changement d'objectif n'exige pas que le Coach « prouve » cette préférence,
mais son application conserve les gardes de sécurité et de cohérence.

Deux indicateurs dérivés des mêmes pesées ne sont pas deux preuves indépendantes.
Faim, énergie et readiness peuvent alimenter un même domaine de récupération :
on ne les recompte pas pour forcer une transition.

Les fenêtres et critères C1/C3/C4 déjà implémentés sont réutilisés tels quels.
Par exemple, une série non comparable ne devient pas artificiellement une
stagnation C3. Le framework n'ajoute pas un nouveau seuil de plateau concurrent.

**Exception de protection :** un signal aigu qualifié peut suffire à un veto,
comme dans C8. Exiger plusieurs jours avant de respecter ce veto serait une
régression. Un veto empêche une action ; il ne diagnostique pas une maladie et
ne crée pas automatiquement une nouvelle phase.

### 6.4 Incertitude, temps et fraîcheur

- Données insuffisantes : dire lesquelles manquent, sans conclure « tout va bien ».
- Signaux discordants : conserver les interprétations possibles ; éviter de
  convertir `possibleRecomposition` en certitude ou un plateau en déficit requis.
- Réutiliser les niveaux de confiance existants, pas créer une probabilité
  d'efficacité. L'explication distingue fait, inférence et inconnue.
- Une journée sans saisie ne vaut ni zéro consommation ni adhérence parfaite.
- Un nouvel épisode doit être évalué sur une fenêtre attribuable à son plan ;
  ne pas traiter un bilan majoritairement antérieur comme son résultat.
- La prochaine revue réutilise le rendez-vous C4/C5 pertinent. Les délais
  spécifiques d'une stratégie future doivent être validés, jamais inventés
  par l'interface.

Pour éviter les allers-retours, ne pas traiter plusieurs bilans glissants
portant presque sur les mêmes données comme des confirmations indépendantes.
Réutiliser une proposition encore valide plutôt que la recréer à chaque
ouverture. Un refus ou report ne doit être remis en discussion que sur demande
ou évolution pertinente explicitée ; aucune temporisation ne retarde un veto
de sécurité. Les fenêtres propres aux nouveaux épisodes seront définies dans
les fiches de règles, pas remplacées par un délai arbitraire global.

### 6.5 Fiche de règle versionnée — prérequis obligatoire

Avant toute implémentation, chaque stratégie concernée doit disposer de sa
fiche de règle versionnée. Chaque règle distincte d'une même stratégie reçoit
également une identité/version explicite ; la fiche ne peut pas être remplacée
par une condition dispersée dans le code.

```text
Nom :
Version :
Objectif concerné :
Stratégie :
Signaux requis :
Fenêtre d'observation :
Conditions d'entrée :
Conditions de sortie :
Exclusions :
Niveau de preuve :
Effets autorisés :
Effets interdits :
Explication utilisateur attendue :
```

Les signaux requis précisent provenance, qualité, comparabilité, minimum de
données et fraîcheur. Le niveau de preuve référence les sources et distingue
preuve scientifique et choix produit. La fiche identifie les règles existantes
réutilisées et les éventuels paramètres nouveaux nécessitant validation métier.
Les exclusions et les effets interdits rendent explicite la priorité Safety.

Une valeur absente n'est pas laissée au choix du développeur. Un champ non
applicable doit être justifié ; aucun seuil n'est inventé pour remplir la fiche.
**Une règle incomplète ne peut pas produire une transition applicable.**
Pour le premier lot de contrats/lecture, les fiches bornent la projection à
des effets autorisés de lecture seule : aucun changement de plan ni aucune
transition ne peut être activé par ce lot.

## 7. Règles de transition

### 7.1 Invariants

1. Aucun changement effectif par lecture, navigation, échéance, synchronisation
   ou simple disparition d'un signal préoccupant.
2. L'utilisateur conserve l'autorité sur son objectif. Le Coach ne le réécrit
   pas pour rendre une stratégie techniquement compatible.
3. Toute transition explique ses effets exacts et distingue ceux qui ne
   changent pas. Accepter un titre n'autorise pas un ajustement caché.
4. Une proposition ne peut outrepasser C8 ni le périmètre métier validé.
5. Un changement de calories/macros exige à la fois un mécanisme approuvé par
   le propriétaire et l'acceptation individuelle ; ce sont deux autorisations
   différentes.
6. Le plan, la phase et la mémoire ne doivent jamais raconter trois états
   incompatibles. Application partielle = échec à traiter, pas transition réussie.

### 7.2 Cycle recommandé

**Évaluer → proposer → accepter/refuser/différer → revalider → appliquer →
mémoriser → réévaluer.**

Au clic d'acceptation, relire l'objectif, le plan, la décision, les données
nécessaires et Safety actuelle. Si la proposition n'est plus valable, ne rien
appliquer ; expliquer le changement et demander une nouvelle confirmation.

La future commande d'application doit lier atomiquement, dans l'espace local,
la version attendue du plan, son effet métier, la phase et la trace d'acceptation.
Le rejeu de la même commande doit être idempotent. C'est une exigence à prouver,
pas une propriété déjà garantie pour des stratégies inexistantes.

Une proposition peut être refusée, différée, bloquée ou rendue obsolète.
Ces statuts ne sont pas des phases. Refuser ne change pas le plan ; différer
ne vaut pas consentement et ne doit pas déclencher des relances insistantes.
La lecture répétée ne produit pas de nouvelles mémoires.

Une date de fin de pause ou de mini-cut futur déclenche au plus une **revue
à effectuer**. Elle ne réactive pas un déficit ou une construction en silence.
Une demande d'arrêt utilisateur peut ouvrir immédiatement cette revue, sans
attendre la fin d'une fenêtre statistique.

### 7.3 Safety : protection sans fausse promesse

Actuellement, C8 distingue `clear`, `caution`, `doNotIntensify`. Son blocage vise
une nouvelle baisse calorique ; une perte excessive seule la bloque aussi,
même en `caution`. Il ne faut ni élargir ce contrat silencieusement ni laisser
une « nouvelle stratégie » devenir un contournement.

Recommandation future : qualifier chaque effet proposé et appliquer ses gardes
avant activation. Les effets non couverts, notamment une intensification de
l'entraînement, restent non applicables sans contrat spécifique. Une absence
de Safety calculable interdit une nouvelle adaptation automatique ou un bouton
d'application fondé sur une évaluation manquante ; elle n'invente pas un veto
clinique ni un signal rassurant.

Bloquer une proposition est une action du système ; modifier le plan actif
reste une action acceptée. En présence de préoccupations, « aucun changement
automatique » ne doit pas être formulé comme « continue ce régime sans risque ».
Afficher la priorité protectrice et, lorsque pertinent, recommander un avis
professionnel. Le statut `clear` n'est pas une autorisation médicale.

Le consensus IOC REDs décrit des conséquences sanitaires et de performance
d'une disponibilité énergétique problématique, chez les femmes et les hommes.
Son outil clinique ne doit pas être transformé en diagnostic grand public
à partir des quelques signaux SportPilot.
[Consensus IOC REDs, 2023](https://doi.org/10.1136/bjsports-2023-106994).

### 7.4 Hors ligne et multi-appareils

L'analyse et l'explication restent locales. L'acceptation hors ligne s'appuie
sur l'état local connu et doit le signaler ; elle ne peut garantir qu'un autre
appareil n'a pas accepté simultanément un autre plan.

Le futur protocole doit conserver l'identité de la décision et son parent de
plan attendu. Une date murale ne suffit jamais à arbitrer deux acceptations.
Ne pas réutiliser automatiquement le CAS Goals ou le bundle C9 sans étude du
domaine et preuve de compatibilité.

Recommandation produit en cas de conflit irréconciliable : préserver les deux
intentions, afficher un état de résolution nécessaire et bloquer les nouvelles
adaptations liées au plan ambigu ; ne pas bloquer le journal quotidien ou les
données indépendantes. Ne pas annoncer une convergence mondiale tant qu'elle
n'est pas établie. Le plan local conservé doit rester explicite.

La stratégie du compte A ne doit jamais apparaître dans le compte B ni dans
l'espace invité. Les contextes quotidiens sensibles gardent leur partage
explicite existant ; le framework ne peut garantir une Safety identique sur
deux appareils dont les informations autorisées diffèrent.

## 8. Interaction utilisateur

### 8.1 Choix du modèle

| Modèle | Intérêt | Limite | Décision produit |
| --- | --- | --- | --- |
| Totalement automatique | Peu d'interactions | Contredit le consentement et surestime les données | Rejeté |
| L'utilisateur choisit tout | Contrôle maximal apparent | Lui délègue les arbitrages techniques et expose trop d'options | Ne pas en faire le parcours principal |
| Hybride | Proposition motivée, choix éclairé, protection structurée | Nécessite une vraie revalidation et un écran d'effets | Retenu |

L'utilisateur choisit son objectif, décrit ses préférences et peut demander
une pause ou une réévaluation. Le Coach propose une option compatible ou
explique pourquoi il ne peut pas trancher. L'utilisateur accepte ou refuse les
changements exacts. Une préférence n'autorise pas un protocole hors périmètre
et ne neutralise pas un veto.

### 8.2 Parcours mobile-first

Dans le Hub, conserver une lecture courte :

- **Objectif actuel** : intention utilisateur.
- **Stratégie active** : approche réellement acceptée, distincte de la
  proposition en attente.
- **Phase actuelle** : épisode temporel appartenant à cette stratégie. Les
  deux libellés peuvent partager une carte, mais pas être confondus.
- **Priorité Coach** : décision unique C4/C5, avec Safety visible lorsqu'applicable.
- **Prochain bilan** : date/condition existantes et limites éventuelles.
- **Comprendre cette décision** : couche C10.1, détails à la demande.

Une proposition ouvre une vue présentant : « actuellement », « proposé »,
raisons, inconnues, effets Nutrition/Activité/Entraînement, éléments inchangés,
date d'effet et prochaine revue. Boutons distincts « Accepter ce changement »,
« Refuser » et « Pas maintenant ». Aucun bouton d'acceptation si la proposition
est obsolète, incomplète ou bloquée.

Exemple futur : « Objectif : perte de graisse. Proposition : stabilisation.
Ton objectif reste inchangé. Voici le plan proposé et les raisons de la pause. »
L'écran doit afficher le plan exact ; il ne calcule pas lui-même les valeurs.

Préserver Performance Glass, navigation primaire, cibles tactiles, focus
clavier, contrastes et libellés accessibles. Aucun statut porté uniquement
par une couleur. États chargement/erreur/vide/hors ligne explicites. Pas de
chat, nouvelle IA, gamification de la restriction ou pression à accepter.

### 8.3 Scénarios de référence à transformer en tests

| Situation | Résultat produit attendu |
| --- | --- |
| Perte, une pesée haute après plusieurs jours compatibles | Pas de changement de stratégie fondé sur ce seul point |
| Plateau qualifié mais activité inférieure à l'attendu | Priorité C4 existante ; pas de baisse via une stratégie concurrente |
| Fatigue durable et performance dégradée | Safety/priorité protectrice ; pas de nouvelle intensification ni phase inventée |
| Utilisateur en perte demande une pause | Revue puis proposition de stabilisation si applicable ; objectif inchangé, validation requise |
| Nouvelle blessure après affichage d'une proposition restrictive | Revalidation au clic ; proposition invalide non appliquée |
| Construction, poids stable et performance en progression | Pas de mini-cut ni hausse automatique ; interprétation conditionnelle |
| Recomposition supposée sans données suffisantes | Incertitude explicite, aucune affirmation de muscle gagné |
| Retour dans le Hub après reload | Même phase acceptée, aucune décision/mémoire supplémentaire |
| Deux acceptations concurrentes hors ligne | Intentions préservées, ambiguïté visible, aucun arbitrage par horloge |
| Date de fin de pause atteinte | Revue attendue, aucun retour automatique au déficit |

## 9. Risques et limites

### 9.1 Intégration à l'existant vérifié

| Brique | Actuel vérifié | Intégration recommandée | Régression à éviter |
| --- | --- | --- | --- |
| C7 | Mapping pur objectif → trois phases | Compatibilité legacy explicite puis épisode accepté distinct | Transformer un ancien libellé en transition historique fictive |
| C4/C5 | Analyse intégrée, action principale, candidat et revalidation au clic | Stratégie comme contexte et éventuelle proposition de cette autorité unique | Second moteur qui prescrit malgré un blocage C4 |
| C8 | Safety read-only, blocage ciblé des baisses caloriques | Garde des effets, extension séparément validée si nécessaire | Assimiler `clear` à une autorisation ou contourner le veto par un changement de nom |
| C9 | Mémoire compacte identifiée par bilan, snapshot de décision | Référencer décision/phase/version de plan réelles | Confondre mémoire hebdomadaire et journal exhaustif des transitions |
| C10.1 | Explication déterministe de décision, Safety et comparaison structurée à la mémoire | Expliquer les raisons du resolver, sans en inventer | Faire du texte un moteur ou affirmer qu'une stratégie a causé un résultat |

Points concrets issus de la lecture :

- À la première ouverture après une future migration, conserver la projection
  C7 legacy avec son origine explicite. Ne pas inventer une date de début,
  une acceptation ou un historique de stratégie. La première adoption du
  nouveau contrat devra être explicite, y compris si elle ne change aucune
  valeur du plan.
- L'acceptation C5 revalide l'analyse et son admissibilité avant la commande
  d'acceptation. Elle porte un ajustement nutritionnel existant, pas une
  transaction de changement de stratégie/programme.
- C4 peut distinguer une priorité de récupération d'une action de revue de
  cible. Ne pas déduire que toute suggestion protectrice possède déjà un
  parcours d'application C5.
- La mémoire C9 possède un identifiant déterministe par bilan et des statuts
  `maintained / accepted / rejected / blocked`. Une nouvelle machine à états
  de stratégie ne doit pas surcharger silencieusement ces significations.
- Le champ C9 `observedOutcome` existe, mais sa qualification automatique est
  différée. Le framework n'autorise aucun apprentissage de seuils à partir
  d'effets supposés.
- C10.1 compare notamment action, état, confiance et Safety ; le tri des
  mémoires utilise leurs dates. Ce n'est pas un mécanisme causal d'arbitrage
  des futures transitions concurrentes.

Références locales de l'audit :
[règles produit](PRODUCT_RULES.md),
[MASTER PLAN](../roadmap/POST_V1_MASTER_PLAN.md),
[phase C7](../../src/domain/coach/coachPhase.ts),
[décision intégrée](../../src/domain/coach/integratedCoachDecision.ts),
[acceptation C5](../../src/application/weekly-review/weeklyReviewService.ts),
[Safety](../../src/domain/coach/coachSafety.ts),
[mémoire](../../src/domain/coach/coachMemory.ts),
[explication](../../src/domain/coach/coachExplanation.ts),
[signaux qualifiés](../../src/domain/coach/coachSignalEvidence.ts),
[données et synchronisation](../architecture/DATA_AND_SYNC.md),
[confidentialité](../security/SECURITY_AND_PRIVACY.md).

### 9.2 Limites scientifiques et de sécurité

- Les essais courts sur adultes entraînés ne représentent pas tous les âges,
  niveaux sportifs, états de santé ou contextes alimentaires.
- Les études mesurent des résultats moyens ; elles ne valident pas directement
  une condition logicielle d'entrée/sortie pour un individu.
- Poids, tour de taille, masse maigre et performance ne sont pas interchangeables.
- Aucun score actuel ne suffit à dépister un trouble alimentaire, un REDs ou
  une contre-indication. Grossesse/allaitement, situations médicales et
  antécédents pertinents nécessitent un cadrage spécialisé, sans diagnostic par
  l'application ni collecte médicale nouvelle implicite.
- Le socle doit éviter les promesses « relancer le métabolisme », « optimiser
  les hormones », « garantir la recomposition » et les délais universels.
- Un historique incomplet ne permet pas de déduire une succession de phases.
  Un résultat postérieur ne prouve pas qu'une décision l'a causé.

### 9.3 Risques techniques et garde-fous de livraison

Le principal risque est une incohérence entre objectif du profil, stratégie,
ajustements cumulés et daily targets. Le suivant est une double application
après retry, restauration ou conflit multi-appareils. Les protections demandées
sont : contrats versionnés, parent de plan explicite, idempotence, application
locale atomique et tests de concurrence ; aucune migration décidée dans ce
document.

La nouvelle persistance éventuelle devra traiter ensemble isolation,
sauvegarde/restauration, compatibilité legacy, suppression et synchronisation.
Conserver les vieux snapshots tels qu'ils ont été réellement enregistrés ;
ne pas reconstruire de transitions à partir des dates ou libellés C7/C9.
Une suppression de compte reste prioritaire sur la conservation d'un audit.

Le framework ne reçoit aucun accès supplémentaire aux photos, aux données
sociales ou à un fournisseur externe. Aucun secret, schéma cloud, mécanisme de
sync ou consentement n'est modifié par ce cadrage.

## 10. Préparation de la suite technique

### 10.1 Premier lot uniquement : contrats et projection en lecture seule

Le premier lot technique à cadrer ne doit pas viser un moteur complet. Son
périmètre est limité aux **contrats domaine, à la projection de lecture, à la
compatibilité C7, à l'intégration de lecture C4/C5/C8/C9/C10.1 et aux tests de
non-régression**. Son exécution demande une autorisation propriétaire distincte.

Les fiches versionnées de la section 6.5 sont un prérequis, y compris pour
expliciter les limites du socle de lecture. Elles ne confèrent aucun droit
d'appliquer une stratégie.

| Volet du premier lot | Résultat attendu | Limite impérative |
| --- | --- | --- |
| Contrats domaine | Objectif, stratégie, phase et décision distincts, états inconnus explicites | Aucun nouvel objectif exécutable, aucun moteur de transition |
| Projection lecture | Snapshot déterministe des données déjà disponibles | Aucune persistance, aucune création de phase ou de décision à l'ouverture |
| Compatibilité C7 | Conserver la projection legacy et en expliciter l'origine | Aucun épisode daté ou consentement reconstruit depuis le profil |
| Intégration C4/C5 | Réutiliser état, décision, plan et prochaine revue existants | Aucune modification du moteur, du candidat ou de l'acceptation |
| Intégration C8 | Exposer les règles et limites Safety existantes | Aucun nouveau seuil, aucun contournement, aucune extension silencieuse |
| Intégration C9 | Lire les mémoires réelles et leurs limites | Aucune nouvelle mémoire, aucun résultat observé ou historique inventé |
| Intégration C10.1 | Réutiliser l'explication structurée existante | Aucune nouvelle décision, aucun système IA |
| Tests de non-régression | Vérifier pureté, données manquantes, hiérarchie et compatibilité C7–C10.1 | Prouver l'absence d'effets sur les plans et les parcours existants |

**Exclusions du premier lot :** aucun changement de calories, macros, objectif
ou programme ; aucune automatisation de stratégie ; aucune commande de
transition ou d'activation ; aucune nouvelle persistance, migration, évolution
de sync ou de backup ; aucun nouveau système IA. Les calculs existants restent
inchangés. Les flux d'acceptation déjà livrés continuent à fonctionner sans
modification de leurs règles.

Les tests devront notamment couvrir les trois objectifs existants, l'objectif
absent, la distinction stratégie/épisode, l'absence de phase active inventée,
la lecture des contextes C4/C5/C8/C9/C10.1, les données insuffisantes et
l'absence d'écriture ou de mutation des entrées. Aucune ouverture/relecture ne
doit créer de mémoire ni déclencher un changement de plan. Les contrôles de
non-régression démontrent que les candidats C4, les gardes C8 et l'acceptation
C5 conservent leur comportement.

### 10.2 Au-delà : sujets à cadrer, pas un moteur à développer maintenant

Les sections précédentes décrivent les invariants des futures transitions,
pas leur inclusion dans le premier lot. Restent soumis à cadrage séparé :
les conditions décisionnelles nouvelles, le contrat objectif/plan, les effets
applicables, leur acceptation revalidée, la continuité multi-appareils et
l'éventuelle évaluation des résultats. Aucun bouton d'application nouveau ne
doit précéder la validation de ces contrats.

Le mini-cut est la **stratégie avancée prioritaire à étudier après le socle**,
sans seuil automatique non validé, toujours bornée, proposée puis acceptée.
Il reste différé. Recomposition exécutable, diet breaks, reverse diet
prescriptive, refeeds et compétition restent également hors socle ; aucun de
ces sujets n'est une dépendance du premier lot de lecture.

La roadmap C7/C8/C9/C10/C11 n'est pas renumérotée. Aucun lot « C8
recommandations » n'est créé. C10.2 n'est ni requis ni autorisé ici, et le cadre
spécialisé compétition reste celui de C11.

### 10.3 Portée de la validation produit

Sont validés : le modèle hybride, la hiérarchie Objectif / Stratégie / Phase /
Décision, le socle à trois stratégies, la limite des signaux V1, l'absence de
recomposition exécutable ou promise, la priorité d'étude du mini-cut différé,
les fiches de règles obligatoires et le premier lot limité à la lecture.

Restent à définir et à valider avant les développements concernés : les
paramètres nouveaux des fiches, les exclusions détaillées, les contrats
métier d'application et les garanties de continuité. La validation de cette
spécification ne remplace ni ces décisions ni une autorisation d'implémentation.

Conclusion : **la valeur de la v1 vient de décisions plus lisibles et mieux
contextualisées, pas du nombre de stratégies proposées.** L'adaptativité est
la capacité à réévaluer et proposer correctement ; elle ne signifie jamais
changer automatiquement le plan de l'utilisateur.
