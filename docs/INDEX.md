# Référentiel SportPilot

Cet index est l’entrée canonique pour comprendre l’état actuel du produit. Les
documents historiques déjà présents dans `docs/`, les release notes, les
checklists et les artefacts de préparation à la racine sont conservés comme
preuves de livraison.

## Références canoniques

| Sujet | Document |
| --- | --- |
| Cadre agents | [`../AGENTS.md`](../AGENTS.md) |
| Architecture générale | [`architecture/OVERVIEW.md`](architecture/OVERVIEW.md) |
| Données et synchronisation | [`architecture/DATA_AND_SYNC.md`](architecture/DATA_AND_SYNC.md) |
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
| Roadmap | [`roadmap/ROADMAP.md`](roadmap/ROADMAP.md) |
| Fonctionnalités planifiées | [`roadmap/PLANNED_FEATURES.md`](roadmap/PLANNED_FEATURES.md) |
| Dette technique | [`roadmap/TECHNICAL_DEBT.md`](roadmap/TECHNICAL_DEBT.md) |
| Décisions ADR | [`decisions/README.md`](decisions/README.md) |

## Convention de statut

- **Actuel** : vérifié dans la branche courante.
- **Décision validée** : contrainte à respecter jusqu’à remplacement par ADR.
- **Planifié** : accepté dans la roadmap, sans promesse de date.
- **Idée à étudier** : hypothèse non autorisée pour implémentation.
- **Dette technique** : faiblesse connue, sans changement implicite de portée.
- **Abandonné** : piste explicitement écartée.

Une release note décrit une version livrée. Elle ne remplace pas les documents
canoniques et ne doit pas être réécrite pour refléter le présent. Les fichiers
de préparation tels que `README-PATCH.md`, `INSTALLATION.txt` et les sections
historiques de `RELEASE-CHECKLIST.md` peuvent donc conserver le vocabulaire de
candidate lorsqu’il décrit fidèlement l’étape où ils ont été produits.

## Réconciliation du bundle documentaire

Le bundle de cadrage fourni pour cette phase a été confronté au dépôt avant
adaptation :

- ses modèles `architecture`, `product`, `quality`, `operations`, `roadmap` et
  `security` sont devenus les références canoniques listées ci-dessus ;
- ses décisions confirmées sont formalisées dans les ADR plutôt que dupliquées
  dans un fichier de synthèse concurrent ;
- ses consignes ChatGPT, Codex, « read first » et agents sont consolidées dans
  `AGENTS.md` et dans cet index ;
- les noms de fichiers, versions, commandes et contrats non vérifiés dans le
  code ont été corrigés ou retirés ;
- les documents historiques existants sont conservés sans être présentés comme
  l’état courant.

Cette consolidation évite plusieurs sources de vérité pour une même règle.
