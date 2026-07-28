# SportPilot 0.33.1

SportPilot 0.33.1 fiabilise l’analyse nutritionnelle par photo et affine les
parcours de recherche et de journal alimentaire sur mobile.

L’application reste mobile-first, locale-first, compatible compte/cloud, hors ligne et installable en PWA.

## Principales évolutions

### Analyse photo

- route de production corrigée et délais client/serveur explicites ;
- préparation locale des images jusqu’à 1 600 px et 1,5 Mo ;
- diagnostic serveur traçable sans photo, clé ou jeton dans les journaux ;
- résultat réel à vérifier ou saisie manuelle vide, sans estimation fictive.

### Journal et recherche

- tous les repas peuvent être fermés simultanément ;
- choix direct entre **Mes aliments** et **Open Food Facts** ;
- recherche locale par nom, marque ou code-barres ;
- création immédiate après une recherche vide avec contexte conservé.

### Interface

- switch d’analyse lisible de 320 à 412 px et avec texte agrandi ;
- aides courtes ancrées à leur déclencheur et adaptées aux collisions ;
- sections repliables non essentielles fermées par défaut ;
- textes techniques retirés des parcours ordinaires.

### Qualité

- tests Playwright dédiés sur Chromium desktop, mobile 320/360/412 px et WebKit iPhone 15 ;
- audits dédiés à l’analyse photo et aux textes utilisateur ;
- checklist de validation sur appareils physiques ;
- aucun changement de calcul calorique, de contrat social ou de schéma de stockage.

## Stockage et versions techniques

- Application : `0.33.1`.
- AppDatabase locale : Dexie v11.
- Sauvegarde JSON : v10.
- Runtime Dexie Cloud prototype : v16.
- Contrat de snapshot social : `0.29.0-a3`.
- Migrations D1 ajoutées par 0.33.1 : aucune.
- Migrations Dexie ajoutées par 0.33.1 : aucune.

## Contrôles de publication

```text
npm run lint
npx tsc -b --pretty false
npm run build
npm run test
npm run test:e2e
npm run audit:photo-ai
npm run audit:release-consolidation
npm run check
npm audit
```

La recette réelle sur iPhone et Android doit valider la photothèque, la caméra,
le clavier, le switch, l’analyse réelle, le retour au repas, la PWA et le
fonctionnement hors ligne.

Tag attendu : `v0.33.1`.
