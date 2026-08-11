# SportPilot 1.0.0-rc.1 — notes de candidate

Statut historique final : **RC1 REJETÉE**. Ce document reste l'archive de
`1.0.0-rc.1` et ne décrit pas la candidate courante.

- SHA RC1 gelé et déployé :
  `2fd781087a65e125b0e77edcd53d41fdf82922ed`.
- Deployment unique : `64efefef-d4c5-4f6a-a98e-c04ca65bc0da`.
- URL immuable : `https://64efefef.sportpilot-pages.pages.dev`.
- Verdict de recette : **REJETÉE / BLOQUÉE**.
- Cause : cold launch PWA hors ligne, suivi par #144.
- Correctif intégré ensuite dans `develop` par la PR #145, squash
  `465f927c6ed17dd7537bfa83d6fe11e9329825ea`.
- Aucune seconde Preview RC1 et aucun redéploiement de RC1.
- Une candidate distincte `1.0.0-rc.2` est requise.
- Journal historique : #142, fermé en `completed` parce que la recette RC1 est
  terminée, et non parce que RC1 aurait été approuvée.

RC1 n'a créé aucun tag ni aucune release GitHub et n'a jamais remplacé la
production `0.37.0`.

## Évolutions principales depuis 0.37.0

### Expérience, accessibilité et continuité

- convergence mobile et desktop des hubs et surfaces critiques ;
- continuité des saisies non enregistrées pour les éditeurs Sport, Nutrition,
  Photo Nutrition et photos de progression ;
- feedbacks d'action et états filtrés harmonisés ;
- parcours clavier, focus, reduced-motion et zones sûres mobiles consolidés ;
- validation aux largeurs 320, 360 et 412 px, ainsi que sur desktop.

### Sport

- planification hebdomadaire, objectifs, modèles Endurance et parcours Force
  rendus plus cohérents ;
- actions contextuelles, feedbacks et protection des brouillons renforcés ;
- stabilisation des parcours Chromium et WebKit/iPhone.

### Nutrition

- journal, bibliothèques, recettes, produits et repas favoris convergés ;
- ajout Photo Nutrition avec consentement explicite par image et saisie
  protégée contre une sortie involontaire ;
- aucune modification des formules nutritionnelles ou caloriques.

### Progression

- rapports, check-in et préremplissage consolidés ;
- galerie et comparateur de photos de progression conservés ;
- protection de la saisie photo et des métadonnées avant enregistrement.

### Compte, données et PWA

- retours d'action et états compte/données homogénéisés ;
- preuves de continuité, isolation, export/restauration et rétention PWA
  renforcées ;
- compatibilité Chromium, WebKit/iPhone et fonctionnement hors ligne couverts.

## Sécurité et confidentialité

- aucune synchronisation cloud des photos de progression ;
- aucune publication sociale des photos ;
- aucune analyse corporelle par IA ;
- aucune extension du provider, des prompts ou des capacités IA ;
- aucun annuaire public, likes, commentaires, messagerie ou export d’activité brute.

## Compatibilité des données

- Dexie v12, inchangée ;
- sauvegarde JSON v10, inchangée ;
- runtime Dexie Cloud v16, inchangé ;
- registre d'espaces de données v1, inchangé ;
- contrat de snapshot social `0.29.0-a3`, inchangé ;
- aucune migration Dexie ou D1, aucun changement de schéma ou de contrat de données.

## Dettes acceptées et séparées

- #103 — diagnostic Photo Nutrition IA en Preview ;
- #136 — portabilité CRLF du contrat source Data ;
- #137 — preuve responsive/E2E de la Corbeille ;
- #138 — diagnostic des Workers Builds Cloudflare rouges ;
- #141 — traitement ou acceptation explicite des dépendances npm HIGH avant la
  stable `1.0.0`.

Ces dettes ne sont pas absorbées dans la candidate. Elles nécessitent leurs
propres validations et n'autorisent aucune Preview ou action Cloudflare.

L'audit npm du verrou courant signale également 9 vulnérabilités hautes amont,
dont React Router et Sharp via Quagga 2. Aucun correctif automatique ou forcé
n'est appliqué dans cette préparation. La qualification consignée dans #141
autorise la recette RC, mais #141 reste un gate explicite avant une publication
stable.

## Point historique

La PR #68 reste ouverte mais obsolète : sa protection de l'éditeur d'activité
a été remplacée dans `develop` par l'intégration #70. Elle n'est ni fusionnée,
ni fermée, ni reprise dans cette branche.
