# SportPilot 0.21.0 D4 — Durcissement et publication

## Objet

D4 transforme les phases D1 à D3 en version stable. Le lot ne modifie pas les modèles de données : il fige les invariants, ajoute un audit transversal, aligne la documentation et publie la version 0.21.0.

## Invariants de publication

- un compte ne peut ouvrir que son espace local identifié par son empreinte ;
- l’espace invité reste une source locale distincte et n’est jamais vidé par l’import ;
- une analyse D2 ou D3 est liée à sa source, sa cible et son compte ;
- toute modification après analyse invalide l’opération préparée ;
- la restauration D3 n’écrit jamais dans le cloud ;
- une vraie donnée locale interdit le remplacement global de l’espace ;
- les opérations multi-tables sont atomiques ;
- le changement de compte invalide les états préparés.

## Versions figées

| Composant | Version |
|---|---:|
| Application | 0.21.0 |
| Dexie Cloud | 8 |
| Runtime local cloud | `sportpilot-sync-runtime-0.20.0-v8` |
| Base métier Dexie | 8 |
| Sauvegarde JSON | 7 |
| Registre des espaces | 1 |

Le nom du runtime reste volontairement rattaché à 0.20.0 : il identifie le schéma cloud v8 introduit à cette étape et non la version courante de l’interface. Le renommer sans changement de schéma provoquerait une nouvelle base locale et une authentification inutile.

## Audit transversal

`npm run audit:data-continuity-release` contrôle :

- la cohérence de `package.json` et `package-lock.json` ;
- la présence des interfaces et moteurs D1 à D3 ;
- les garde-fous d’analyse, d’empreinte et de transaction ;
- l’absence de suppression de l’espace invité ;
- les versions de la base métier, du cloud, du backup et du registre ;
- l’intégration des audits D1 à D4 dans `check` et `ci` ;
- les notes de version et la documentation de publication.

## Recette manuelle minimale

1. changement compte A / compte B sans fuite ;
2. import invité dans A, puis seconde analyse à zéro ;
3. restauration de A dans une installation vierge ;
4. choix d’un espace vide sans modification du cloud ;
5. restauration différée tant que l’espace reste vide ;
6. blocage après création d’une donnée locale ;
7. analyses de tous les domaines à zéro ;
8. accès hors ligne après restauration ;
9. suppression et réinstallation de la PWA sur iPhone 15 sous iOS 26.

## Retour arrière

D4 ne comporte aucune migration. Un retour de code ne doit jamais s’accompagner d’un effacement IndexedDB ou cloud. Les données déjà importées ou restaurées restent valides dans leurs espaces respectifs ; la correction doit être réalisée par fix-forward.
