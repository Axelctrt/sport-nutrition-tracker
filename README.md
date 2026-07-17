# SportPilot 0.32.0

SportPilot 0.32.0 finalise un onboarding mobile plus lisible, plus direct et mieux adapté à l’iPhone 15. Le choix entre mode local et compte est clarifié, les données du profil sont renseignées avec des rouleaux tactiles et chaque étape ordinaire reste entièrement visible sans défilement global.

L’application reste mobile-first, locale-first, compatible compte/cloud, hors ligne et installable en PWA.

## Principales évolutions

### Démarrage local ou compte

- choix initial limité à **Mode local** et **Connecter un compte** ;
- connexion e-mail et code déplacée sur l’écran suivant ;
- rappel qu’un profil local peut être associé plus tard depuis Paramètres → Compte et appareils ;
- logique de stockage, de connexion et de synchronisation inchangée.

### Profil compact

- neuf étapes de profil structurées et accessibles ;
- pages ordinaires verrouillées dans la hauteur de l’écran ;
- textes explicatifs raccourcis et informations utiles signalées par une icône `i` ;
- choix du sexe empilés et choix d’objectif ou d’activité présentés sur des lignes lisibles ;
- résumé final seul autorisé à faire défiler l’ensemble de la page.

### Rouleaux tactiles

- date de naissance ou âge sans saisie numérique manuelle ;
- taille, poids et objectif de pas sélectionnés par rouleaux ;
- pas proposés par paliers de 500 ;
- sensibilité légèrement accrue sur les rouleaux ordinaires ;
- variation hebdomadaire conservée à sa sensibilité précise ;
- navigation clavier, VoiceOver, réduction des animations et inertie iOS préservées.

### Qualité

- recette Playwright dédiée à l’onboarding sur WebKit iPhone 15 ;
- acceptation mobile maintenue sur Chromium desktop et WebKit ;
- bootstrap E2E et contrôles de focus rendus plus stables ;
- aucun changement de calcul calorique, de contrat social ou de schéma de stockage.

## Stockage et versions techniques

- Application : `0.32.0`.
- AppDatabase locale : Dexie v10.
- Sauvegarde JSON : v9.
- Runtime Dexie Cloud prototype : v14.
- Contrat de snapshot social : `0.29.0-a3`.
- Migrations D1 ajoutées par 0.32.0 : aucune.
- Migrations Dexie ajoutées par 0.32.0 : aucune.

## Contrôles de publication

```text
npm run lint
npx tsc -b --pretty false
npm run build
npm run test:e2e:onboarding
npm run test:e2e:acceptance
npm run audit:release-consolidation
npm run check
npm audit
```

La recette réelle sur iPhone 15 doit valider le mode local, la connexion compte séparée, les rouleaux, l’absence de scroll sur les étapes ordinaires, le résumé scrollable, la PWA et l’accessibilité.

Tag attendu : `v0.32.0`.
