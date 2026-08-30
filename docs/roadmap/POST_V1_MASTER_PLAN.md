# SportPilot — Master Plan post-V1

Ce document est la roadmap canonique post-V1 de SportPilot. Il décrit les lots
validés, leur ordre logique, leurs dépendances et leurs garde-fous. Il ne vaut
jamais autorisation implicite d'implémentation, de fusion, de Preview, de
release ou de production.

## Source de vérité

- dépôt : `Axelctrt/sport-nutrition-tracker` ;
- branche de développement : `develop` ;
- base au moment de création de ce document :
  `d63f37374da9b02ffc44fbe9b019068fe768f318` ;
- version stable préparée : `1.0.0` ;
- toujours revérifier le HEAD réel de `develop` avant chaque lot ;
- les anciennes conversations, SHA historiques et documents versionnés ne
  remplacent jamais l'inspection du dépôt réel.

## Doctrine d'exécution

1. Un lot = une branche dédiée + une PR dédiée vers `develop` sauf décision
   explicite contraire.
2. Avant chaque lot : fetch, vérification du HEAD, lecture de `AGENTS.md`, du
   présent document et des fichiers/tests réellement concernés.
3. Aucun élargissement de périmètre silencieux.
4. Toute recommandation UX hors périmètre reste séparée.
5. Toute formule calorique, macro, règle d'arrondi ou objectif nutritionnel
   métier nécessite un cadrage dédié et une validation propriétaire explicite.
6. Les thèmes validés ne sont pas modifiés sans validation explicite.
7. Toute extension IA nécessite validation explicite ; le Coach ne dépend pas
   d'une IA générative.
8. Aucune fusion, Preview, release, tag ou production sans autorisation
   explicite du propriétaire.
9. Les lots de données doivent préserver la continuité et l'isolation invité /
   profil local / compte cloud.
10. Les changements Coach doivent rester déterministes, explicables,
    testables, local-first et hors ligne.

## Priorité globale

Décision propriétaire du 16 août 2026 : le chantier **P0 — Continuité de
compte et synchronisation multi-appareils fiable** devient le premier chantier
post-V1 et précède SportPilot Coach.

Ordre de priorité :

1. **P0 — Continuité compte / multi-device** ;
2. **SportPilot Coach C0 -> C1 -> ... -> C11** ;
3. les autres lots déjà validés/cadrés selon leurs dépendances et les arbitrages
   du propriétaire.

Cette décision remplace toute formulation antérieure plaçant Coach avant la
continuité de compte. Elle ne modifie pas les garde-fous de données ni les
autorisations de fusion, release ou production.

---

# Programme P0 — Continuité de compte et multi-device

Base de cadrage initiale : `3bb1866dcef76e800653c15a08b787c29f7f9011`.
Le HEAD réel de `develop` reste à revérifier avant chaque patch.

Contrat produit :

> Lorsqu'un utilisateur utilise le même compte SportPilot sur plusieurs
> appareils, les données synchronisables de ce compte doivent converger
> automatiquement dans le fonctionnement nominal, sans que l'utilisateur ait
> à comprendre la différence entre authentification, analyse, restauration et
> synchronisation.

Scénario nominal minimal :

`A crée une séance -> la donnée atteint le cloud -> B récupère cette séance à
l'ouverture, au retour au premier plan ou au retour réseau`.

Doctrine :

- préserver le local-first et le fonctionnement hors ligne ;
- préserver l'isolation invité / compte A / compte B et la propriété cloud ;
- préserver les tombstones, l'idempotence et les agrégats Strength complets ;
- automatiser uniquement une convergence démontrée sûre ;
- ne jamais transformer un conflit ambigu, une provenance inconnue ou une
  identité incertaine en écriture destructive automatique ;
- conserver les mécanismes manuels de diagnostic, récupération et arbitrage ;
- ne jamais remplacer silencieusement un espace local non vide ;
- ne jamais vider le cloud pour restaurer un appareil.

Séquence d'exécution :

- **S0 — Reproduction et contrats** : confirmer le chemin A -> cloud -> B,
  caractériser les limites d'`analyze`, des baselines logiques et du parcours
  nouvel appareil, puis verrouiller le défaut par des tests sans modifier le
  comportement ;
- **S1 — Convergence distante sûre** : récupérer automatiquement les
  changements cloud non ambigus au démarrage, au foreground et au retour
  réseau, sans synchroniser un conflit ambigu ;
- **S2 — Upload local sûr** : compléter le chemin modification locale ->
  debounce -> upload lorsque la baseline permet de démontrer l'absence de
  conflit ;
- **S3 — Nouvel appareil / reprise de compte** : favoriser la restauration des
  données cloud d'un compte existant, sans écraser un espace local non vide et
  en conservant l'import invité explicite ;
- **S4 — UX de synchronisation** : distinguer compte connecté, données à jour
  et action requise avec un vocabulaire utilisateur ;
- **S5 — Preuves de continuité** : couvrir A -> B, agrégats Strength complets,
  offline/online, foreground, suppressions, changements de compte,
  invité/A/B, expiration de session, restauration et idempotence.

Les lots Coach restent gelés pendant l'exécution de ce P0 sauf décision
propriétaire explicite contraire.

---

# Programme A — SportPilot Coach

Objectif : transformer SportPilot d'un tracker complet en système de coaching
adaptatif, explicable et longitudinal pour la musculation et la progression
physique.

Le cœur du Coach suit la boucle :

`données -> qualité -> signaux -> état -> décision -> explication -> plan -> acceptation -> mémoire -> réévaluation`.

Le Coach Engine reste déterministe. Une IA conversationnelle éventuelle ne peut
être qu'une couche de formulation et d'explication.

## C0 — Intégrité des signaux Coach

Priorité : critique, prérequis de tout le programme Coach.

Objectifs :

- un poids de référence/fallback ne doit jamais devenir silencieusement une
  nouvelle pesée réelle ;
- distinguer les mesures réellement fournies par l'utilisateur des valeurs de
  confort/préremplies ;
- éviter que des valeurs subjectives par défaut (`normal`, `average`, etc.)
  soient interprétées comme observations confirmées ;
- documenter la provenance et la confiance des signaux exploités par le Coach.

Hors périmètre : Coach du jour, nouvelles formules, IA, page Coach.

## C1 — Coach State Foundation

Créer les états structurés et la confiance du Coach à partir des signaux
existants.

Sortie attendue :

- `state` ;
- `confidence` ;
- `reasons` ;
- `blockingFactors` ;
- `priority` ;
- `recommendedAction` ;
- `nextReview`.

États de départ : données insuffisantes, suivi alimentaire insuffisant,
progression conforme, variation temporaire probable, recomposition probable,
signaux contradictoires, plateau probable, cible trop haute/basse, perte/gain
trop rapide, activité inférieure aux attentes, récupération dégradée.

`Aucun changement` est une vraie décision de coaching.

## C2 — Coach du jour

Après le check-in, fournir une lecture utile sans sur-réagir à une journée
isolée.

Exemples :

- plan maintenu ;
- récupération à surveiller ;
- variation temporaire probable ;
- données insuffisantes.

UX cible : carte Coach visible sur l'Accueil ; toast léger pour l'enregistrement
simple ; carte contextuelle pour une information utile ; modal/bottom sheet
réservé aux alertes importantes.

Aucun changement calorique déclenché par une seule journée.

## C3 — Strength Performance Engine

Exploiter la richesse des données de musculation déjà stockées :

- séries, répétitions, charges et RPE ;
- performances à charge comparable ;
- meilleur set / estimation de performance ;
- séries prévues vs réalisées ;
- progression, stagnation et dégradation ;
- séances manquées ;
- exposition/volume par exercice et, après validation de méthode, par groupe
  musculaire.

La logique de progression existante doit être réutilisée plutôt que remplacée.
La formule de comptage des séries directes/indirectes par muscle n'est pas
validée par ce document et nécessite un cadrage dédié.

## C4 — Décisions intégrées Nutrition x Training x Recovery

Croiser composition corporelle, adhérence, activité, récupération et
performance avant toute décision.

Hiérarchie :

1. qualité des données ;
2. sécurité/récupération ;
3. adhérence ;
4. activité réelle ;
5. performance ;
6. poids/tour de taille ;
7. nécessité réelle de changer ;
8. plus petit changement raisonnable.

Règles doctrinales :

- vérifier l'adhérence avant d'accuser les calories ;
- vérifier l'activité avant de toucher aux calories ;
- reconnaître le bruit hydrique/contexte ;
- intégrer la performance ;
- la récupération peut bloquer une restriction supplémentaire ;
- éviter de modifier plusieurs leviers à la fois sans nécessité ;
- toute modification durable proposée reste explicitement acceptée par
  l'utilisateur.

## C5 — Bilan du Coach

Transformer le bilan hebdomadaire en synthèse de coaching :

`Diagnostic -> Confiance -> Pourquoi -> Décision -> Plan -> Réévaluation`.

Le bilan doit couvrir au minimum :

- tendance de poids et tour de taille ;
- adhérence nutritionnelle ;
- activité ;
- récupération ;
- performance musculaire ;
- décision du Coach ;
- plan de la période suivante ;
- date/condition de prochaine réévaluation.

## C6 — Plan Coach et page `/coach`

Créer une destination dédiée contenant :

- verdict du jour ;
- phase actuelle ;
- plan nutrition/activité/entraînement ;
- priorités ;
- dernier bilan ;
- prochain bilan ;
- points surveillés ;
- historique des décisions lorsque disponible.

Navigation mobile : conserver initialement les quatre hubs
`Accueil / Nutrition / Sport / Progression`. Le Coach est une couche transverse,
pas un cinquième hub obligatoire. Accès depuis l'Accueil, Progression et la
navigation secondaire. Un changement futur de navigation nécessite une
validation UX dédiée.

## C7 — Phases de coaching

Le C7 initial livre un MVP à trois phases, résolues exclusivement depuis
l'objectif utilisateur existant :

- `loss` → « Déficit actif » ;
- `maintenance` → « Stabilisation » ;
- `gain` → « Construction ».

Cette projection est en lecture seule. Le MVP ne gère ni transitions
automatiques, ni historique des phases, ni critères d'entrée ou de sortie
dynamiques, ni cycles, ni périodisation.

### Phases avancées différées

Le mini-cut, la recomposition, la récupération / consolidation et des phases
stratégiques plus fines restent des conceptions futures, **non implémentées et
hors du C7 MVP actuel**. Elles ne constituent pas de nouveaux lots numérotés et
nécessiteront chacune un cadrage ainsi qu'une validation produit spécifiques.

#### Doctrine future — mini-cut (non implémentée)

Phase courte et planifiée de perte de graisse, généralement insérée dans une
prise de muscle, avec sortie prévue dès le départ et retour attendu vers la
prise de muscle.

Doctrine :

- pas de crash diet ;
- durée et critères de sortie explicites ;
- surveillance renforcée de récupération et performance ;
- pas de répétition permanente bulk/mini-cut ;
- convertir vers une vraie phase de perte de graisse si la durée/objectif
  dépasse le cadre d'un mini-cut.

Aucune nouvelle vitesse de perte, formule calorique ou borne macro n'est
validée ici.

## C8 — Safety Layer

Créer des garde-fous permettant au Coach de refuser d'intensifier une stratégie
lorsque plusieurs signaux convergent :

- perte excessive ;
- récupération durablement dégradée ;
- faim élevée persistante ;
- énergie basse ;
- performance en baisse ;
- maladie ;
- douleur/blessure ;
- cluster compatible avec faible disponibilité énergétique problématique.

Le Coach ne pose pas de diagnostic médical.

Périmètre initial recommandé pour le coaching autonome de composition
corporelle complet : 18+.

## C9 — Coach Memory

Mémoriser les décisions structurées :

- date ;
- phase ;
- état et confiance ;
- décision ;
- raisons ;
- changement ;
- date d'effet ;
- prochaine revue ;
- résultat observé.

La mémoire doit suivre les règles locales/cloud d'isolation et de continuité.

## C10 — IA conversationnelle conditionnelle

L'IA n'est développée que si son coût peut être garanti **strictement à 0 EUR**,
sans risque de dépassement, bascule payante ou débit automatique.

Si cette garantie n'existe pas : le lot est abandonné sans perte fonctionnelle
pour le Coach.

Rôle autorisé d'une IA éventuelle :

- expliquer ;
- reformuler ;
- répondre aux questions sur une décision déjà structurée ;
- contextualiser les données déjà sélectionnées par SportPilot.

Interdits :

- décider seule d'une modification de calories/macros ;
- changer seule un programme ;
- outrepasser le Coach Engine ;
- diagnostiquer une pathologie.

## C11 — Mode Coaching Compétition

Dernier grand lot Coach, 18+, spécialisé.

Sous-phases :

- préparation ;
- approche compétition ;
- peak week ;
- jour J ;
- récupération post-compétition.

Le mode compétition doit intégrer la récupération post-show comme phase
obligatoire.

Hors périmètre sans nouvelle décision spécifique :

- diurétiques ;
- déshydratation agressive ;
- manipulations dangereuses d'électrolytes ;
- PED/pharmacologie.

### Checkpoint Coach

Après C6, effectuer un checkpoint produit/UX avant C7-C11. Le propriétaire doit
pouvoir juger l'identité Coach réelle avant d'ajouter les phases avancées.

---

# Programme B — Suppression, continuité et confidentialité

Ces lots sont déjà cadrés et ne doivent pas être réaudités sans raison démontrée.

## D1 — Suppression locale exhaustive

- suppression locale fiable et exhaustive ;
- guest reset incluant photos/assets/Corbeille ;
- suppression compte local hors ligne ;
- isolation guest/local/cloud ;
- gestion des erreurs et reprises ;
- Dexie v12 préservée sauf migration additive explicitement requise.

Exclut la restauration/Corbeille post-suppression.

## D2 — UX sauvegarde et suppression

- sauvegarde recommandée mais non précondition destructive ;
- CTA sauvegarde et suppression séparés ;
- parcours mobile share/download ;
- confirmation adaptée ;
- suppression globale avec confirmation forte ;
- suppression locale avec confirmation simple.

## D3 — Effacer partout cloud

- pull forcé ;
- suppression ;
- push ;
- pull de vérification ;
- journal de saga persistante ;
- retries/idempotence ;
- quiescence ;
- protection A -> B ;
- preuve multi-device.

Dépend de D1.

## D4 — Confidentialité

- page `En bref` ;
- contrôles et six sections repliables ;
- services externes explicités ;
- copy mobile-first et véridique ;
- cohérence avec les comportements réels de données et d'IA.

À exécuter après D1-D3.

## D5 — Badges

- notification groupée multi-badge ;
- états pending/revealed durables ;
- convergence compte ;
- compatibilité legacy ;
- aucune confusion entre notification locale et vérité métier.

---

# Programme C — Photo Nutrition

## P1 — Contexte journal fiable

Lot déjà cadré :

- date/repas explicites et fiables ;
- aucun fallback silencieux UTC/snack ;
- états VALID/MISSING/INVALID ;
- gate de contexte inline ;
- contrôles natifs date/select ;
- canonicalisation de query avant dirty ;
- contexte figé pendant l'analyse ;
- validation avant création produit ;
- feedback save/cancel ;
- correction ciblée MealFoodSelector.

Aucune modification des formules nutritionnelles.

## P2 — Diagnostic Photo AI Preview (#103)

- diagnostiquer l'indisponibilité IA en Preview à partir des logs/variables ;
- distinguer configuration, quota/provider et code ;
- aucun changement de provider ou périmètre IA sans validation ;
- aucun secret exposé.

---

# Programme D — Gouvernance GitHub et dépendances

## G1 — Guardrails GitHub

Lot déjà cadré :

- rulesets `main` et `develop` ;
- checks CI obligatoires exacts ;
- `develop` : squash ;
- `main` : merge commit ;
- approvals 0 pour propriétaire unique ;
- PR-only avec bypass propriétaire/admin ;
- pas de strict up-to-date ;
- aucun changement sans autorisation propriétaire explicite.

## G2 — Dependabot / Dependency Review

- Dependabot Alerts ;
- mises à jour mensuelles vers `develop` ;
- Dependency Review progressive ;
- ne pas mélanger advisory et exposition runtime démontrée.

## G3 — Quagga / Sharp (#162)

Monitoring uniquement tant que l'architecture ne change pas et qu'aucun nouveau
chemin runtime n'est démontré.

---

# Programme E — Backlog produit et qualité post-V1

Les éléments ci-dessous doivent être revalidés sur le HEAD réel avant
implémentation. Leur présence dans ce document ne vaut pas autorisation.

## E1 — Restore/Trash phantom inconsistency

Investiguer puis corriger l'incohérence de restauration/Corbeille déjà
identifiée, sans élargir le lot de suppression.

## E2 — Paramètres / recherche

Améliorer la découvrabilité de la recherche globale depuis Paramètres si le
constat reste valide.

## E3 — Progression / sémantique des périodes

Clarifier la sémantique des périodes de Progression sans modifier les calculs
sous-jacents sans validation dédiée.

## E4 — Première pesée

Ajouter le CTA manquant pour la première pesée si le défaut est toujours
présent.

## E5 — Bottom navigation

Corriger le faux indicateur actif mobile si encore reproductible.

## E6 — Cloudflare Workers Builds (#138)

Diagnostic uniquement avant modification : comprendre les checks externes
rouges, distinguer Workers Builds et Pages Direct Upload, ne rien supprimer ou
déconnecter sans preuve.

## E7 — PWA retention proof

Compléter la preuve PWA avec un scénario de photo de progression non vide si le
gap de preuve reste pertinent.

## E8 — Taxonomie des preuves d'audit

Normaliser la distinction entre preuve fonctionnelle, visuelle, CI, Preview et
production pour éviter les validations ambiguës.

## E9 — CRLF contrat Data (#136)

Rendre le test concerné indépendant des fins de ligne sans modifier le
comportement produit.

## E10 — Smoke responsive Corbeille (#137)

Ajouter une preuve navigateur légère sans refonte produit.

## E11 — Tests intermittents historiques (#93)

Revalider sur le HEAD courant. Corriger uniquement si l'intermittence existe
toujours ; ne pas appliquer une ancienne solution à un problème disparu.

## E12 — Issues administratives historiques

Certaines issues peuvent rester ouvertes alors que leur implémentation est déjà
intégrée. Ne jamais déduire le statut produit d'un simple `state=open`.
Revalider commit/PR/comportement puis proposer une clôture administrative
séparée si nécessaire.

---

# Ordre d'exécution recommandé

1. C0 — Intégrité des signaux Coach.
2. C1 — Coach State Foundation.
3. C2 — Coach du jour.
4. C3 — Strength Performance Engine.
5. C4 — Décisions intégrées.
6. C5 — Bilan du Coach.
7. C6 — page et Plan Coach.
8. Checkpoint propriétaire Coach.
9. C7 — phases MVP fondées sur l'objectif utilisateur.
10. C8 — Safety Layer.
11. C9 — Coach Memory.
12. C10 — IA uniquement si coût garanti 0 EUR ; sinon skip.
13. C11 — Mode Compétition.
14. D1 -> D2 -> D3 -> D4 ; D5 selon disponibilité.
15. P1 puis P2.
16. G1/G2 uniquement après autorisation propriétaire explicite.
17. E1-E12 selon priorité/risk/quick wins revalidés.

Cet ordre peut être ajusté par décision propriétaire explicite, mais une
dépendance technique démontrée doit être documentée avant inversion.

# Definition of Done d'un lot

Chaque lot de développement doit au minimum :

- partir d'un `develop` frais ;
- annoncer le SHA de base ;
- respecter périmètre et hors périmètre ;
- réutiliser les contrats existants ;
- ajouter/adapter les tests pertinents ;
- exécuter les validations proportionnées au risque ;
- distinguer avertissements préexistants et régressions ;
- fournir un résumé des fichiers modifiés et décisions techniques ;
- fournir les commandes/tests réellement exécutés et leurs résultats ;
- ouvrir une PR dédiée vers `develop` si autorisé ;
- s'arrêter avant fusion.

Pour les changements UX, une recette visuelle propriétaire est requise avant
fusion. Pour les données, synchronisation, sécurité ou calculs, les tests de
continuité/isolation et scénarios de reprise sont obligatoires.

# Règle d'autorisation

Ce MASTER PLAN décrit **où va SportPilot**. Il n'autorise pas Codex à exécuter
plusieurs lots de sa propre initiative.

Pour chaque lot :

`MASTER PLAN = contexte` ;
`prompt du lot = autorisation` ;
`PR = résultat auditable` ;
`propriétaire = décision de fusion/deploiement`.
