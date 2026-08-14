# SportPilot 1.0.0 — stable en préparation

Statut : candidate stable en préparation, non publiée, non taguée et non déployée.
`main` reste inchangé et la production continue de servir SportPilot `0.37.0`
tant qu'une publication distincte n'est pas autorisée.

- Branche : `codex/163-release-1-0-0`.
- Base de préparation :
  `develop@13cef273d09d78eeb4d177ab23e86c7770748419`.
- Issue de préparation : #163.
- `main` vérifié avant préparation :
  `9c5ed296dde93ca21b12228bb7f5945b5b9322d9`.
- Production fonctionnelle actuelle : `0.37.0` au commit
  `84fea3d49e68c7d190c00d505502a5c4aa2e672a`.

Cette préparation n'autorise aucune Preview Cloudflare, aucune fusion, aucune
modification de `main`, aucun tag `v1.0.0`, aucune GitHub Release et aucun
déploiement de production.

## Trajectoire V1

- Le périmètre V1 a été consolidé depuis la stable `0.37.0` par les lots de
  cohérence, de continuité et de readiness validés dans #63.
- RC1 (`1.0.0-rc.1`) a été déployée une seule fois puis rejetée après la
  reproduction du cold launch PWA hors ligne #144.
- Le correctif PWA #144/#145 a supprimé ce blocker et ajouté une preuve de cold
  launch réelle, en complément du scénario update/rétention.
- RC2 (`1.0.0-rc.2`) a été gelée au SHA
  `2554638a782f3be338b7323b95abc1078f65ef0b`, déployée une seule fois et
  acceptée après recette dans #147 ; #146 a été validée et fermée en
  `completed`.
- La navigation et le focus ont été stabilisés par #151/#152 avant le gel RC2.
- Après RC2, les contrats Friends, WebKit et thème ont été stabilisés par
  #153/#154, #155/#156, #157/#158 et #159/#160, sans nouvelle fonctionnalité.
- Le gate sécurité #141 a été levé par #161 et la décision propriétaire sur le
  risque résiduel Quagga/Sharp.

RC1 et RC2 restent des archives de candidates. La présente branche prépare la
stable ; elle ne réécrit ni leur SHA, ni leur deployment, ni leur verdict.

## Fonctionnalités V1

- Sport : planning, séances, modèles, exercices, activités et historiques ;
- Nutrition : journal, aliments, recettes, favoris, objectifs et bilans ;
- Progression : poids, pas, statistiques, rapports, badges et missions ;
- objectifs et liaison explicite vers les actions pertinentes ;
- compte, profil local, espace invité et espaces de données isolés ;
- synchronisation configurable et centre de continuité locale/cloud ;
- social et Amis dans le périmètre de permissions et de confidentialité validé ;
- photos de progression privées et locales, avec archive séparée ;
- PWA installable, fonctionnement hors ligne, mise à jour explicite et
  rétention des données ;
- continuité des saisies critiques et isolation entre comptes et espaces.

Cette stable n'ajoute aucun annuaire public, likes, commentaires, messagerie ou
export d’activité brute. Elle conserve aussi les exclusions validées :

- aucune synchronisation cloud des photos de progression ;
- aucune analyse corporelle par IA.

## Compatibilité des données

Le passage de `1.0.0-rc.2` à `1.0.0` est un changement de version applicative,
pas une migration de données :

- Dexie v12, inchangée ;
- sauvegarde JSON v10, inchangée ;
- runtime Dexie Cloud v16, inchangé ;
- registre des espaces de données v1, inchangé ;
- contrat de snapshot social `0.29.0-a3`, inchangé ;
- aucune migration Dexie ou D1, aucun changement de schéma, de sauvegarde ou de
  contrat de données.

## Sécurité

Le gate #141 est traité et fermé en `completed`. Les mises à jour compatibles
de #161 ont ramené `npm audit` de 9 HIGH / 0 CRITICAL à 2 HIGH / 0 CRITICAL.
Le résiduel `@ericblade/quagga2@1.12.1 → sharp@0.34.5` reste un signal réel :
il n'est pas présenté comme corrigé. Le propriétaire l'a accepté pour V1 dans
l'architecture validée, où Sharp est optionnel côté Node et absent du bundle
navigateur ainsi que des Pages Functions. #162 assure le suivi post-V1 sans
bloquer cette préparation.

## Dettes séparées

- #103 — diagnostic Photo Nutrition IA en Preview ;
- #136 — portabilité CRLF du contrat source Data ;
- #137 — preuve responsive/E2E de la Corbeille ;
- #138 — diagnostic des Workers Builds Cloudflare rouges ;
- #162 — surveillance d'une correction Quagga/Sharp compatible après V1.

#141 et #146 sont terminées et ne sont plus des blockers ouverts. Les dettes
ci-dessus ne sont pas absorbées par cette préparation et nécessitent leurs
propres validations avant toute modification.

## Publication encore interdite

La préparation stable doit encore obtenir ses preuves locales et sa CI sur son
HEAD exact, puis des autorisations séparées pour la fusion vers `develop`, la
Preview finale, la PR `develop` vers `main`, la fusion, le tag, la GitHub
Release, la production et les contrôles post-déploiement.
