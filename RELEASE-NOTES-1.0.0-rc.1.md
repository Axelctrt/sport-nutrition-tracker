# SportPilot 1.0.0-rc.1 — notes de candidate

Statut : candidate V1 en préparation, non publiée.

- Branche : `codex/rc-1-0-0-rc1`
- Base `develop` : `3eff34a73cc40d98d3de2ab947ac8b45bfae5f01`
- Stable de référence : `0.37.0` au commit `84fea3d49e68c7d190c00d505502a5c4aa2e672a`
- Issue de préparation : #139

Aucun tag, aucune release GitHub et aucun déploiement ne sont créés par cette
préparation. La production reste sur `0.37.0`.

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
- #138 — diagnostic des Workers Builds Cloudflare rouges.

Ces dettes ne sont pas absorbées dans la candidate. Elles nécessitent leurs
propres validations et n'autorisent aucune Preview ou action Cloudflare.

L'audit npm du verrou courant signale également 9 vulnérabilités hautes amont,
dont React Router et Sharp via Quagga 2. Aucun correctif automatique ou forcé
n'est appliqué dans cette préparation ; ce risque de dépendances devra être
explicitement réévalué avant une publication stable.

## Point historique

La PR #68 reste ouverte mais obsolète : sa protection de l'éditeur d'activité
a été remplacée dans `develop` par l'intégration #70. Elle n'est ni fusionnée,
ni fermée, ni reprise dans cette branche.
