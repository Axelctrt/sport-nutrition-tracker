# Notes de release — SportPilot 0.32.0

## Résumé

SportPilot 0.32.0 finalise la refonte de l’onboarding mobile. Le parcours est plus simple à comprendre, conserve des contrôles confortables et évite le défilement global sur les étapes ordinaires d’un iPhone 15.

La connexion au compte est séparée du choix initial, les informations numériques sont sélectionnées avec des rouleaux tactiles et le résumé final autorise volontairement le scroll de toute la page. Cette release ne modifie aucun schéma de données, contrat cloud, règle sociale ou calcul nutritionnel.

## Nouveautés principales

### Choix local ou compte

- deux choix directs : Mode local et Connecter un compte ;
- adresse e-mail et code demandés uniquement après le choix du compte ;
- mode local immédiatement utilisable ;
- association ultérieure à un compte explicitée via Paramètres → Compte et appareils ;
- logique de stockage et de synchronisation existante conservée.

### Parcours de profil

- neuf étapes structurées avec progression accessible ;
- textes raccourcis sans supprimer les informations nécessaires ;
- aides présentées avec une icône d’information ;
- choix Masculin/Féminin empilés sur toute la largeur ;
- choix d’objectif et d’activité disposés sur des lignes lisibles ;
- cartes Taille, Poids et Pas rééquilibrées.

### Rouleaux tactiles

- date de naissance en trois rouleaux JJ/MM/AAAA ;
- option Âge sur un rouleau dédié ;
- taille, poids, variation hebdomadaire et pas sans saisie numérique manuelle ;
- objectif de pas par paliers de 500 ;
- sensibilité légèrement accrue sur les rouleaux ordinaires ;
- variation d’objectif maintenue à sa sensibilité précise ;
- inertie, scroll-snap, clavier, VoiceOver et réduction des animations préservés.

### Hauteur et défilement

- étapes ordinaires verrouillées dans la hauteur dynamique de l’écran ;
- suppression du déplacement automatique entre les étapes ;
- seuls les rouleaux défilent sur les étapes ordinaires ;
- résumé final seul autorisé à faire défiler toute la page ;
- informations du résumé présentées sur une colonne et actions Modifier accessibles.

### Qualité

- recette Playwright dédiée à la hauteur de l’onboarding et aux rouleaux ;
- acceptation mobile sur Chromium desktop et WebKit iPhone 15 ;
- helpers E2E stabilisés face aux changements de libellés et au focus clavier ;
- tests unitaires renforcés sur la sensibilité, la hauteur et l’accessibilité des rouleaux ;
- budget de production actuel de 3 200 Kio conservé.

## Versions techniques

- Application : `0.32.0`.
- AppDatabase locale : Dexie v10.
- Sauvegarde JSON : v9.
- Runtime Dexie Cloud prototype : v14.
- Contrat de snapshot social : `0.29.0-a3`.
- Migrations D1 requises : aucune nouvelle migration.
- Migration Dexie : aucune.
- Tag attendu : `v0.32.0`.

## Validation

- suite Vitest complète en lots déterministes ;
- tests Playwright onboarding sur WebKit iPhone 15 ;
- tests Playwright d’acceptation mobile sur Chromium desktop et WebKit ;
- lint et TypeScript ;
- build Vite/PWA ;
- audits de synchronisation, Nutrition, Photo IA, social, sécurité, production, dépôt et UX mobile ;
- validation manuelle de l’onboarding sur iPhone 15.

## Hors périmètre

- refonte du moteur calorique ;
- nouvelle migration D1 ou Dexie ;
- modification des contrats sociaux `0.29.0-a*` ;
- annuaire public ;
- likes ;
- commentaires ;
- messagerie ;
- export d’activité brute ;
- nouvelle fonctionnalité sociale majeure ;
- changement des règles de synchronisation ou de résolution des conflits.
