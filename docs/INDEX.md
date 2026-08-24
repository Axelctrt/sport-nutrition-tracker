# Référentiel SportPilot

Cet index est l’entrée canonique pour comprendre l’état actuel du produit. Les
documents historiques déjà présents dans `docs/`, les release notes, les
checklists et les artefacts de préparation sont conservés comme preuves de
livraison ; ils ne remplacent pas les références canoniques ci-dessous.

## Références canoniques

| Sujet | Document |
| --- | --- |
| Cadre agents | [`../AGENTS.md`](../AGENTS.md) |
| Master Plan post-V1 | [`roadmap/POST_V1_MASTER_PLAN.md`](roadmap/POST_V1_MASTER_PLAN.md) |
| Architecture générale | [`architecture/OVERVIEW.md`](architecture/OVERVIEW.md) |
| Données et synchronisation | [`architecture/DATA_AND_SYNC.md`](architecture/DATA_AND_SYNC.md) |
| Gate Dexie Cloud Goals | [`operations/ENVIRONMENTS_AND_DEPLOYMENT.md#gate-manuel-dexie-cloud-pour-goals`](operations/ENVIRONMENTS_AND_DEPLOYMENT.md#gate-manuel-dexie-cloud-pour-goals) |
| Règles produit | [`product/PRODUCT_RULES.md`](product/PRODUCT_RULES.md) |
| Catalogue fonctionnel | [`product/FEATURE_CATALOG.md`](product/FEATURE_CATALOG.md) |
| Guide UX | [`product/UX_GUIDELINES.md`](product/UX_GUIDELINES.md) |
| Design system | [`product/DESIGN_SYSTEM.md`](product/DESIGN_SYSTEM.md) |
| Références UX | [`product/UX_REFERENCES.md`](product/UX_REFERENCES.md) |
| Glossaire | [`product/GLOSSARY.md`](product/GLOSSARY.md) |
| Sécurité et confidentialité | [`security/SECURITY_AND_PRIVACY.md`](security/SECURITY_AND_PRIVACY.md) |
| Environnements et déploiement | [`operations/ENVIRONMENTS_AND_DEPLOYMENT.md`](operations/ENVIRONMENTS_AND_DEPLOYMENT.md) |
| Incidents et restaurations | [`operations/INCIDENT_AND_RECOVERY.md`](operations/INCIDENT_AND_RECOVERY.md) |
| Stratégie de test | [`quality/TEST_STRATEGY.md`](quality/TEST_STRATEGY.md) |
| Processus de release | [`quality/RELEASE_PROCESS.md`](quality/RELEASE_PROCESS.md) |
| Changelog | [`../CHANGELOG.md`](../CHANGELOG.md) |
| Roadmap historique/générale | [`roadmap/ROADMAP.md`](roadmap/ROADMAP.md) |
| Trajectoire et readiness V1 — archive de cycle | [`roadmap/V1_READINESS_PLAN.md`](roadmap/V1_READINESS_PLAN.md) |
| Fonctionnalités planifiées — historique V1/post-V1 initial | [`roadmap/PLANNED_FEATURES.md`](roadmap/PLANNED_FEATURES.md) |
| Dette technique | [`roadmap/TECHNICAL_DEBT.md`](roadmap/TECHNICAL_DEBT.md) |
| Décisions ADR | [`decisions/README.md`](decisions/README.md) |

## Reprise du travail courant

SportPilot `1.0.0` constitue désormais la base stable du cycle post-V1. Le
travail courant doit être repris depuis le HEAD réel de `develop`, jamais depuis
un SHA copié d'une ancienne conversation ou d'un document historique.

Le programme prioritaire est défini dans
[`roadmap/POST_V1_MASTER_PLAN.md`](roadmap/POST_V1_MASTER_PLAN.md). Il couvre :

- SportPilot Coach C0 à C11 ;
- suppression, continuité et confidentialité ;
- badges ;
- Photo Nutrition ;
- gouvernance GitHub et dépendances ;
- backlog produit, qualité et infrastructure post-V1.

Le MASTER PLAN décrit une séquence et des décisions produit validées, mais ne
constitue jamais une autorisation implicite de développement. Chaque lot doit
être autorisé séparément, exécuté dans une branche dédiée et s'arrêter avant
fusion sauf instruction explicite du propriétaire.

Les documents de readiness V1, RC1/RC2 et préparation stable restent utiles
comme preuves historiques. Ils ne doivent plus être lus comme le pilotage
courant du produit.

## Convention de statut

- **Actuel** : vérifié dans la branche ou l'environnement courant.
- **Décision validée** : contrainte à respecter jusqu’à remplacement explicite.
- **Planifié** : accepté dans la roadmap, sans autorisation implicite d'exécution.
- **Idée à étudier** : hypothèse non autorisée pour implémentation.
- **Dette technique** : faiblesse connue, sans changement implicite de portée.
- **Abandonné** : piste explicitement écartée.

Une release note décrit une version livrée. Elle ne remplace pas les documents
canoniques et ne doit pas être réécrite pour refléter le présent. Les fichiers
de préparation et journaux historiques peuvent conserver le vocabulaire de
candidate lorsqu’il décrit fidèlement l’étape où ils ont été produits.

## Règle de réconciliation

En cas de contradiction :

1. vérifier le dépôt et les services réels ;
2. appliquer `AGENTS.md` pour la méthode et les garde-fous ;
3. appliquer `POST_V1_MASTER_PLAN.md` pour la roadmap et l'ordre des lots ;
4. consulter les documents spécialisés pour le contrat du domaine concerné ;
5. traiter les documents V1/versionnés comme historiques sauf mention
   explicitement actuelle.
