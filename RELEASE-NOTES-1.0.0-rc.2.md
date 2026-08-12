# SportPilot 1.0.0-rc.2 — notes de candidate

Statut : candidate RC2 en préparation sur `develop`, non fusionnée, non
déployée et non publiée.

- Branche : `codex/rc-1-0-0-rc2`.
- Base technique avant gel :
  `develop@e1921f5807292f8236e70c1688d8d9f02c22bdf0`.
- Journal de préparation et de recette : #147.
- Stable de référence : `0.37.0` au commit
  `84fea3d49e68c7d190c00d505502a5c4aa2e672a`.
- Le futur SHA immuable de RC2 sera consigné dans #147 après fusion et gel.

Aucun tag, aucune release GitHub, aucune Preview Cloudflare et aucun
déploiement ne sont créés par cette préparation. La production reste sur
`0.37.0`.

## Relation avec RC1

RC1 (`1.0.0-rc.1`) a été déployée une seule fois depuis le SHA
`2fd781087a65e125b0e77edcd53d41fdf82922ed`, sous le deployment
`64efefef-d4c5-4f6a-a98e-c04ca65bc0da`. Elle a été **rejetée** après la
reproduction du cold launch PWA hors ligne suivi par #144. Aucune seconde
Preview RC1 n'a été créée.

Le correctif a ensuite été intégré par la PR #145 dans
`develop@465f927c6ed17dd7537bfa83d6fe11e9329825ea`. RC2 reprend le périmètre
fonctionnel V1 déjà audité et y ajoute ce correctif ainsi qu'une preuve
automatisée obligatoire du cold launch hors ligne. Sa base technique a ensuite
intégré le correctif de navigation/focus #151/#152 et la stabilisation de preuve
WebKit Progress Photos #149/#150, sans réécrire l'historique RC1.

## Correctifs et preuves ajoutés depuis RC1

### Cold launch PWA — #144/#145

- Le Dashboard dépendait de chunks de services Analytics exclus du précache.
- L'exclusion générique `**/analytics*.js` a été retirée de `globIgnores`.
- Le chunk de route `AnalyticsPage-*` reste lazy et hors précache.
- Le précache a augmenté de 2 entrées et de 6 796 octets ; le JavaScript total
  et les budgets restent inchangés.
- Le scénario automatisé couvre une première visite online, la fermeture, une
  nouvelle page hors ligne sur l'accueil, la lecture locale, une écriture
  locale hors ligne et sa relecture après rechargement.
- Le test historique de mise à jour PWA et de rétention des données est
  conservé.

Cette préparation RC2 ne réécrit pas le correctif PWA et ne modifie ni le
Dashboard, ni Analytics, ni Workbox.

### Navigation et focus — #151/#152

- Le correctif produit préserve le focus réellement acquis par l'utilisateur
  après une navigation au lieu de le remplacer tardivement par `main-content`.
- Les callbacks double-frame devenus obsolètes sont annulés ; le transfert vers
  `main-content` reste conservé lorsqu'aucun nouveau focus n'a été acquis.
- Le correctif est intégré dans `develop` au squash
  `2d87ef9ddbf1d667c54229093b0895e948e6c73d`.

### Preuve WebKit Progress Photos — #149/#150

- La preuve E2E conserve le geste réel `50` → `ArrowRight` → `51` et vérifie
  explicitement le focus du slider avant l'action clavier.
- Cette stabilisation test-only est intégrée dans `develop` au squash
  `e1921f5807292f8236e70c1688d8d9f02c22bdf0` ; elle ne modifie aucun
  comportement Progress Photos.

## Périmètre fonctionnel conservé

- continuité des saisies non enregistrées sur les surfaces critiques ;
- feedbacks, états filtrés, clavier, focus, reduced-motion et responsive ;
- parcours Sport, Nutrition, Progression, compte et données déjà validés ;
- aucune modification des formules nutritionnelles ou caloriques ;
- aucune synchronisation cloud des photos de progression ;
- aucune analyse corporelle par IA ;
- aucun annuaire public, likes, commentaires, messagerie ou export d’activité brute.

## CORS Dexie Cloud — gate de recette #146

Dexie Cloud exige l'origine exacte de l'application. L'origine immuable RC1
était absente de la whitelist ; le diagnostic #146 confirme une
**configuration Preview manquante**, et non un défaut d'URL produit.

L'origine immuable RC2 n'existe pas encore. Après création autorisée du futur
deployment, son origine exacte devra faire l'objet d'une autorisation
propriétaire distincte avant d'être ajoutée à la whitelist, puis le preflight,
le compte, la synchronisation et l'isolation seront recettés sur ce même
deployment. Aucune modification CORS ou Dexie Cloud n'est incluse dans cette
PR.

## Compatibilité des données

- Dexie v12, inchangée ;
- sauvegarde JSON v10, inchangée ;
- runtime Dexie Cloud v16, inchangé ;
- registre d'espaces de données v1, inchangé ;
- contrat de snapshot social `0.29.0-a3`, inchangé ;
- aucune migration Dexie ou D1, aucun changement de schéma ou de contrat de
  données.

Le passage de `1.0.0-rc.1` à `1.0.0-rc.2` est une évolution SemVer de candidate,
pas une migration de données.

## Dettes et gates séparés

- #103 — diagnostic Photo Nutrition IA en Preview ;
- #136 — portabilité CRLF du contrat source Data ;
- #137 — preuve responsive/E2E de la Corbeille ;
- #138 — diagnostic des Workers Builds Cloudflare rouges ;
- #141 — traitement ou acceptation explicite des dépendances npm HIGH avant la
  stable `1.0.0` ;
- #146 — gate de recette CORS Dexie Cloud à traiter pendant la future étape
  Preview RC2.

Ces sujets ne sont pas absorbés dans la préparation RC2. #141 reste le gate de
sécurité avant la stable ; #146 reste le gate de recette compte/synchronisation
de la future Preview.
