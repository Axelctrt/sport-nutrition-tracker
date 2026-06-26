# SportPilot 0.15.0

PWA locale de suivi sportif, nutritionnel, calorique et de progression.

## Phase 5 — minuteur de repos de musculation

La séance active dispose maintenant d’un minuteur de repos mobile-first :

- démarrage automatique après une série de travail lorsque l’exercice possède un temps de repos ;
- démarrage manuel possible depuis la carte de l’exercice ;
- pause, reprise, arrêt, retrait de 15 secondes et ajouts de 15 ou 30 secondes ;
- calcul fondé sur un timestamp de fin pour rester exact après un passage en arrière-plan ;
- conservation temporaire dans `sessionStorage` pendant la séance et après un rechargement ;
- vibration et son configurables, avec indication visuelle et annonce accessible systématiques ;
- arrêt du minuteur lors de la fin ou de l’abandon de la séance ;
- anciens réglages et anciennes sauvegardes complétés automatiquement sans migration Dexie.

Le schéma IndexedDB reste en version 2 et le format de sauvegarde reste en version 2.

## Version 0.15 — Expérience mobile-first

### 0.15.0 — version stable

La version 0.15.0 consolide l’ensemble du parcours mobile-first validé pendant les préversions et la Release Candidate :

- tableau de bord, nutrition, activités, poids, analyses, musculation, profil, paramètres et sauvegarde optimisés pour l’iPhone ;
- navigation mobile complète, installation PWA, fonctionnement hors connexion et mise à jour contrôlée ;
- champs de date uniformisés, saisies numériques à zéro directement remplaçables et sections repliables recentrées ;
- routes, sauvegardes, erreurs globales, thème et budgets du build couverts par des garde-fous automatisés ;
- version stable visible dans Paramètres ;
- schéma Dexie 2 et sauvegarde JSON 2 conservés sans migration.

### 0.15.0-rc.1 — stabilisation finale et Release Candidate

Cette Release Candidate a gelé les fonctionnalités de la version 0.15 et renforcé la livraison avant publication stable :

- routes du shell centralisées, sans doublon, et comparées automatiquement aux navigations mobile et ordinateur ;
- titres de page obligatoires pour chaque route réellement enregistrée ;
- chemins dynamiques construits depuis les constantes centrales avec encodage des identifiants ;
- couverture du format de sauvegarde comparée à toutes les tables Dexie ;
- thème tolérant aux refus de lecture ou d’écriture de `localStorage` ;
- écran global d’erreur permettant de revenir à l’accueil sans toucher aux données ;
- version installée affichée dans Paramètres pour faciliter la vérification des mises à jour PWA ;
- budgets JavaScript et CSS, raccourcis PWA, fichiers hashés et absence de source maps contrôlés par l’audit de production ;
- checklist de validation et procédure de retour arrière fournies ;
- aucune migration Dexie et aucune modification du format de sauvegarde.

### 0.15.0-alpha.13 — finitions de saisie et panneaux mobiles

Cette préversion corrige trois irritants transversaux avant la Release Candidate :

- champs de date et d’heure contraints à la même largeur et à la même hauteur que les autres champs sur Safari iOS ;
- correction spécifique de la largeur intrinsèque des contrôles natifs dans les grilles mobiles ;
- effacement automatique d’une valeur numérique égale à `0` lorsque le champ reçoit le focus ;
- restauration automatique de `0` si le champ est quitté sans nouvelle saisie ;
- comportement appliqué aux séries, charges, répétitions, poids, pas et autres champs numériques similaires ;
- recentrage doux du contenu lorsqu’une section, une carte ou un menu repliable est développé ;
- respect de `prefers-reduced-motion` pour éviter les animations imposées ;
- stabilisation d’un test d’activité dépendant de la date courante ;
- stabilisation de la vérification du retour au journal par contrôle direct de la destination et de l’état complet transmis à React Router ;
- aucune migration Dexie et aucune modification du format de sauvegarde.

### 0.15.0-alpha.12 — navigation mobile et expérience PWA

Cette préversion finalise l’accès aux écrans secondaires et les états transversaux de l’application sur téléphone :

- menu mobile complet accessible depuis l’en-tête sans modifier la navigation basse ;
- accès direct aux entraînements, exercices, modèles, historique, bilan, profil, paramètres, sauvegarde et calculs ;
- état actif du menu lorsqu’un écran secondaire est ouvert ;
- feuille mobile accessible avec fermeture par croix, arrière-plan ou touche Échap, verrouillage du scroll et restitution déterministe du focus au bouton Menu ;
- instructions d’installation spécifiques à l’iPhone avec le parcours Safari Partager puis Ajouter à l’écran d’accueil ;
- installation native proposée sur les navigateurs compatibles et état explicite lorsque la PWA est déjà installée ;
- bannière hors connexion plus précise et confirmation temporaire lorsque le réseau revient ;
- message de mise à jour PWA adapté aux safe areas et actions plus lisibles sur téléphone ;
- page des calculs convertie en sections progressives avec résumé compact et liens vers le profil et les paramètres ;
- pages hors connexion et introuvable enrichies avec actions de reprise claires ;
- aucune migration Dexie et aucune modification du format de sauvegarde.

### 0.15.0-alpha.11 — recherche et ajout alimentaire mobile

Cette préversion simplifie le choix et l’ajout d’un aliment depuis le journal :

- sélecteur local, recherche Open Food Facts et scanner harmonisés autour du même parcours mobile ;
- feuille accessible pour régler la quantité sans faire descendre la page ni perdre le contexte ;
- focus automatique sur la quantité et restitution du focus après fermeture ;
- sources locales affichées dans une grille plus dense, sans défilement horizontal ;
- chargement initial du sélecteur remplacé par le skeleton partagé ;
- recherche Open Food Facts limitée à un seul mode visible à la fois : nom ou marque, ou code-barres ;
- résumé compact des résultats locaux, affichés et disponibles dans la base externe ;
- cartes de produits raccourcies avec calories et macronutriments lisibles immédiatement ;
- scanner recentré sur la caméra, avec confidentialité et saisie manuelle dans des sections repliables ;
- produit scanné conservé dans une carte compacte avec réouverture directe du réglage de quantité ;
- états de chargement et états vides harmonisés avec les composants partagés ;
- aucune migration Dexie et aucune modification du format de sauvegarde.

### 0.15.0-alpha.10 — profil, paramètres et sauvegarde mobile

Cette préversion simplifie la configuration personnelle et la gestion des données locales sur téléphone :

- accès direct aux paramètres depuis l’icône d’engrenage de l’en-tête mobile ;
- résumés compacts pour comprendre immédiatement le profil, les réglages actifs et le stockage local ;
- formulaire de profil organisé en sections progressives, avec objectifs et macronutriments regroupés ;
- bouton d’enregistrement stable sous le formulaire, sans déplacement pendant le défilement ;
- paramètres avancés répartis entre affichage, calculs, natation et calibration hebdomadaire ;
- clavier mobile adapté aux coefficients et focalisation du premier champ invalide ;
- confirmation accessible avant le rétablissement des valeurs par défaut ;
- spinner local des paramètres remplacé par le skeleton partagé ;
- page de sauvegarde recentrée sur exporter, restaurer et effacer ;
- prévisualisation compacte d’un fichier avant restauration, puis confirmation de remplacement ;
- suppression définitive dans un dialogue accessible exigeant la saisie `EFFACER` ;
- confidentialité, fonctionnement PWA et zone dangereuse déplacés dans des sections repliables ;
- aucune migration Dexie et aucune modification du format de sauvegarde.

### 0.15.0-alpha.9 — carnet de musculation mobile

Cette préversion harmonise les écrans de musculation utilisés en dehors d’une séance active :

- catalogue d’exercices avec résumé unique, recherche prioritaire, filtres tactiles et options avancées repliées ;
- recherche et filtres appliqués localement après un chargement unique, sans perte de focus pendant la saisie ;
- cartes d’exercices compactes avec historique prioritaire et actions secondaires regroupées ;
- archivage ou réactivation protégés par un dialogue accessible, sans rechargement complet ;
- séances modèles avec résumé, recherche locale, démarrage visible et actions secondaires repliées ;
- historique des entraînements regroupé en cartes compactes avec filtres Toutes, Terminées et Abandonnées ;
- séance en cours toujours prioritaire avec accès direct à la reprise ;
- progression par exercice structurée autour d’une synthèse unique, avec records et graphiques ouverts à la demande ;
- records de répétitions par charge convertis en cartes mobiles, sans tableau horizontal ;
- séries de chaque séance historique repliées par défaut ;
- formulaires d’exercice et de séance modèle raccourcis avec informations facultatives et réglages avancés repliés ;
- focalisation du premier champ invalide et chargements harmonisés avec les skeletons partagés ;
- aucune migration Dexie et aucune modification du format de sauvegarde.

### 0.15.0-alpha.8 — bibliothèque alimentaire mobile

Cette préversion harmonise les aliments locaux, les recettes et les repas favoris pour une utilisation mobile :

- résumés compacts pour comprendre immédiatement le contenu de chaque bibliothèque ;
- recherche locale instantanée dans les aliments, les recettes et les repas favoris ;
- filtres rapides pour les aliments favoris ou dont les informations nutritionnelles restent à vérifier ;
- cartes mobiles avec action principale visible et actions secondaires repliées ;
- archivage d’un aliment et suppression d’une recette ou d’un favori protégés par le dialogue partagé ;
- mutations silencieuses sans rechargement complet ni remontée en haut ;
- restauration du défilement et mise en évidence après création ou modification ;
- formulaires d’aliments et de recettes raccourcis, avec informations facultatives repliées ;
- ajout d’un repas favori au journal depuis sa propre carte, dans une feuille mobile accessible ;
- skeletons et états vides partagés, avec meilleure isolation des tests React ;
- aucune migration Dexie et aucune modification du format de sauvegarde.

### 0.15.0-alpha.7 — analyses et bilan hebdomadaire mobile

Cette préversion rend les analyses et la calibration hebdomadaire plus lisibles sur téléphone :

- synthèse unique sur douze semaines regroupant course, natation, adhérence calorique et poids récent ;
- graphiques montés uniquement à l’ouverture de leur section pour éviter une page initiale trop longue ;
- course, natation, nutrition, activité générale, poids et répartition sportive organisés en sections progressives ;
- détails hebdomadaires présentés sous forme de cartes, sans tableaux horizontaux ;
- accès direct au bilan hebdomadaire et à l’historique depuis les analyses ;
- décision calorique placée en priorité dans le bilan, avec actions adaptées au téléphone ;
- résumé hebdomadaire compact et détails d’adhérence repliables ;
- historiques des bilans et ajustements acceptés convertis en cartes mobiles ;
- acceptation ou refus d’une proposition sans démontage complet de la page ;
- chargement harmonisé avec les skeletons partagés ;
- aucune migration Dexie et aucune modification du format de sauvegarde.

### 0.15.0-alpha.6 — poids et historique mobile

Cette préversion simplifie le suivi du poids et la consultation de l’historique sur téléphone :

- résumé du poids regroupant dernière mesure, moyenne mobile, variation et écart à la trajectoire ;
- saisie mobile compacte avec note facultative repliée et bouton d’enregistrement fixe sous le formulaire ;
- historique des pesées présenté sous forme de cartes, sans tableau horizontal ;
- périodes rapides de 30 jours, 90 jours ou historique complet pour le graphique ;
- modification directe d’une pesée depuis sa carte et suppression protégée par le dialogue partagé ;
- sauvegarde et suppression silencieuses sans rechargement complet ni remontée en haut ;
- historique général regroupé en cartes quotidiennes compactes avec résumé de période ;
- filtres rapides de 7, 28 et 90 jours, avec dates personnalisées disponibles en option ;
- accès direct au journal alimentaire, aux activités et à la pesée de chaque journée ;
- aucune migration Dexie et aucune modification du format de sauvegarde.

### 0.15.0-alpha.5 — suivi des activités mobile

Cette préversion simplifie la saisie et la consultation des activités sur téléphone :

- journal quotidien compact avec nombre de séances, durée totale et calories retenues regroupés ;
- cartes de course, natation, vélo, marche et cardio allégées, avec métriques essentielles immédiatement lisibles ;
- modification, duplication et suppression regroupées dans un menu secondaire ;
- suppression protégée par le dialogue accessible partagé ;
- duplication et suppression silencieuses, sans grand chargement ni remontée en haut ;
- restauration du défilement et mise en évidence temporaire après ajout, modification ou duplication ;
- choix du type d’activité plus compact et formulaires adaptés aux claviers mobiles ;
- bouton d’enregistrement stable sous la note facultative, sans déplacement pendant le scroll ;
- notes et correction calorique déplacées dans une section facultative repliable ;
- liens de musculation et explications énergétiques déplacés dans des sections secondaires ;
- aucune migration Dexie et aucune modification du format de sauvegarde.

### 0.15.0-alpha.4 — tableau de bord mobile

Cette préversion réorganise le tableau de bord autour de la journée en cours :

- résumé principal unique regroupant calories consommées, reste ou dépassement, macronutriments, pas et poids du jour ;
- séance de musculation en cours affichée immédiatement avec reprise directe ;
- six actions rapides tactiles pour l’alimentation, le scanner, les pas, le poids, les activités et la musculation ;
- saisies du poids et des pas ouvertes dans une feuille mobile depuis les actions rapides, avec confirmation locale et sans section dupliquée ;
- activités et détails de calcul déplacés dans des sections secondaires repliables ;
- explications énergétiques réduites à une phrase et un lien vers la page dédiée ;
- skeleton partagé utilisé pendant le chargement initial et rafraîchissement silencieux des données ;
- aucune migration Dexie et aucune modification du format de sauvegarde.

### 0.15.0-alpha.3 — journal alimentaire mobile

Cette préversion simplifie le suivi alimentaire quotidien sur téléphone :

- résumé journalier compact regroupant calories, reste disponible et macronutriments ;
- quatre cartes de repas autonomes avec action `Ajouter` immédiatement accessible ;
- lignes d’aliments plus compactes et modification rapide de la quantité dans le journal ;
- duplication, suppression et accès au détail placés dans des actions secondaires ;
- options de repas et de journée repliées pour réduire la longueur de la page ;
- rafraîchissement silencieux après chaque action, sans démontage du journal ;
- retour au bon repas après ajout classique, scan d’un code-barres ou ajout d’une recette ;
- restauration du défilement et mise en évidence temporaire de l’entrée ajoutée ou modifiée ;
- confirmations alimentaires uniques par toast et suppression via un dialogue accessible.

### 0.15.0-alpha.2 — séance de musculation mobile

Cette préversion optimise la séance pour une utilisation réelle pendant l’entraînement :

- barre d’action fixe sur téléphone avec durée, état de sauvegarde et bouton `Terminer` ;
- adaptation automatique de la barre sur ordinateur sans dupliquer les actions ;
- rafraîchissement silencieux après chaque mutation, sans démontage de la page ni retour en haut ;
- cartes d’exercices repliables avec objectif, avancement et performance précédente regroupés ;
- séries compactes en trois colonnes tactiles pour la charge, les répétitions et le RPE ;
- type et notes de série déplacés dans une section secondaire ;
- ajout et duplication faisant apparaître uniquement le nouvel élément lorsque nécessaire ;
- statut de sauvegarde discret pendant les actions, sans toast de succès encombrant pendant la séance ;
- dialogues accessibles pour terminer, abandonner, retirer un exercice ou supprimer une série ;
- état vide et notes générales harmonisés avec les fondations UX.

### 0.15.0-alpha.1 — fondations UX

- écran de démarrage avec le logo SportPilot ;
- skeletons adaptés aux routes et limitant les décalages visuels ;
- système global de notifications temporaires accessible ;
- restauration centralisée de la position de défilement ;
- titres de pages dynamiques dans l’en-tête ;
- dialogue de confirmation accessible ;
- états vides, sections repliables et statut de sauvegarde partagés ;
- focalisation du premier champ invalide ;
- respect renforcé de `prefers-reduced-motion`.

## Prérequis

- Node.js `20.19+`, `22.13+` ou `24+`
- npm

## Installation

```powershell
npm install
npm run check
npm run dev
```

Adresse de développement habituelle : `http://127.0.0.1:5173/`.

## Scripts

```powershell
npm run dev          # serveur Vite
npm run lint         # Oxlint
npm run test         # suite Vitest déterministe
npm run test:stability # suite Vitest brassée avec une seed fixe
npm run build        # TypeScript + build PWA
npm run audit:mvp    # contrôle statique de la PWA
npm run audit:release # cohérence version, documentation et schémas
npm run audit:security # en-têtes Cloudflare, CSP et page Confidentialité
npm run audit:rc     # audit du build d’une Release Candidate
npm run audit:stable # budgets du build et intégrité de la version stable
npm run check        # lint + tests + build + tous les audits
npm run ci           # contrôle CI principal : lint, tests, build et audits
npm run preview      # prévisualisation du build
npm run diagnose:off # diagnostic Open Food Facts
```

## Intégration continue

Le workflow `.github/workflows/ci.yml` s’exécute lors des pushes vers `develop` ou `main`, ainsi que pour les pull requests ciblant l’une de ces branches.

Il lance trois jobs indépendants :

- `quality` : installation reproductible avec `npm ci`, lint, suite Vitest, build PWA et audits ;
- `test-order-stability` : suite Vitest complète dans un ordre brassé avec une seed fixe ;
- `e2e` : parcours Playwright sur Chromium et WebKit iPhone.

Pour exécuter localement le contrôle principal :

```powershell
npm ci
npm run ci
```

Le contrôle complémentaire d’indépendance à l’ordre se lance avec :

```powershell
npm run test:stability
```

## Fonctionnalités

- onboarding et profil physique, avec modification mobile optimisée ;
- paramètres énergétiques avancés ;
- Mifflin–St Jeor, dépenses et macronutriments ;
- poids, pas et objectifs quotidiens ;
- course, natation, vélo, marche et cardio ;
- carnet de musculation détaillé avec catalogue, modèles, séances, séries et reprise en cours ;
- historique par exercice, graphiques, records, estimation du 1RM et suggestions de progression ;
- journal alimentaire local avec ajout direct depuis chaque repas ;
- Open Food Facts avec fonctionnement dégradé ;
- recettes et repas favoris ;
- historique et analyses sur douze semaines ;
- bilan hebdomadaire et calibration contrôlée ;
- export et import JSON complets ;
- suppression confirmée des données ;
- installation PWA et fonctionnement hors connexion.

## Sauvegarde et restauration

La page `#/backup` permet de :

1. télécharger une sauvegarde JSON complète ;
2. sélectionner un fichier de sauvegarde ;
3. valider sa structure avec Zod ;
4. consulter son résumé ;
5. restaurer toutes les tables dans une transaction Dexie ;
6. effacer toutes les données après confirmation `EFFACER`.

Le format courant est `sportpilot-backup`, schéma version `2`. Les sauvegardes des versions 0.12 et 0.13 au schéma version 1 sont migrées automatiquement à l’import. Les futures migrations de sauvegarde sont centralisées dans :

```text
src/infrastructure/backup/backupMigrations.ts
```

Un import invalide n’altère jamais la base. Si l’écriture échoue, la transaction est annulée et les données précédentes sont conservées.

## Confidentialité et sécurité du déploiement

La page publique `#/privacy` détaille :

- le stockage dans IndexedDB ;
- l’absence de compte, de backend, de publicité et de mesure d’audience ;
- les données transmises uniquement lors d’une recherche Open Food Facts ;
- le traitement local des images du scanner ;
- les sauvegardes, diagnostics et moyens de suppression ;
- les limites des estimations sportives et nutritionnelles.

Le fichier `public/_headers` est copié dans `dist/_headers` pendant le build. Cloudflare Workers Static Assets ou Cloudflare Pages applique alors notamment :

- une Content-Security-Policy limitée à l’application et aux deux domaines Open Food Facts ;
- `X-Content-Type-Options: nosniff` ;
- `Referrer-Policy: no-referrer` ;
- `frame-ancestors 'none'` et `X-Frame-Options: DENY` ;
- une Permissions-Policy autorisant seulement la caméra de la même origine et désactivant les permissions inutilisées.

La prévisualisation Vite de production relit le même fichier afin que les tests Playwright exécutent SportPilot avec ces en-têtes.

## Architecture

```text
src/
├── app/                 routage, providers et layouts
├── application/         orchestration des cas d’usage
├── domain/              modèles et logique métier pure
├── features/            pages et formulaires par fonctionnalité
├── infrastructure/      Dexie, repositories, backup et Open Food Facts
├── pwa/                 hors ligne, mise à jour et nettoyage local
├── shared/              composants et utilitaires partagés
└── test/                configuration et factories
```

## PWA

Le build génère :

```text
dist/manifest.webmanifest
dist/sw.js
dist/workbox-*.js
```

Le manifeste comprend des icônes standards et maskable ainsi que des raccourcis vers l’ajout d’un aliment, d’une activité et d’une pesée.

Pour tester la version de production :

```powershell
npm run build
npm run preview
```

## Historique de validation 0.13.0

La version 0.13.0 a été validée avec :

- Oxlint : 0 avertissement, 0 erreur ;
- Vitest : 58 fichiers, 234 tests ;
- TypeScript strict : compilation réussie ;
- Vite/PWA : build réussi, service worker généré ;
- audit MVP : manifeste, icônes, raccourcis, hors ligne, repères d’accessibilité et absence de secrets évidents.

## Correctif 0.13.0-alpha.2

- Compatibilité des identifiants sur les origines HTTP locales mobiles où `crypto.randomUUID()` est indisponible.
- Utilisation de `crypto.getRandomValues()` lorsque possible, avec repli local pour les anciens navigateurs.
- Centralisation des identifiants des repas favoris.

## Nettoyage de l’interface 0.13.0-alpha.3

- suppression des références visibles aux étapes de développement ;
- remplacement des libellés temporaires par des intitulés métier ;
- retrait du diagnostic de version Open Food Facts dans l’interface ;
- mise à jour de la présentation des capacités de l’application ;
- ajout d’un test empêchant le retour de textes comme `Étape 8`, `MVP`, `prochainement` ou `TODO` dans les composants de production.


## Correctif mobile 0.13.0-alpha.4

Les champs natifs de date et d’heure sont maintenant contraints à la largeur de leur conteneur, y compris sur Safari iOS. Le correctif couvre notamment les écrans Journal alimentaire, Journal des activités, Poids et Analyses, sans désactiver les sélecteurs natifs du navigateur.

## Sélecteur alimentaire par repas 0.13.0-alpha.5

Depuis le petit-déjeuner, le déjeuner, le dîner ou les collations, l’utilisateur peut maintenant ouvrir un parcours d’ajout conservant automatiquement la date et le repas d’origine.

Le sélecteur propose :

- les aliments utilisés récemment ;
- les aliments marqués comme favoris ;
- tous les aliments locaux ;
- une recherche locale par nom, marque ou code-barres ;
- un aperçu nutritionnel avant validation ;
- la saisie par quantité ou par nombre de portions ;
- la création manuelle avec retour automatique vers le repas initial.

Le scan caméra sera intégré dans la branche suivante. Cette évolution réutilise les tables IndexedDB existantes et ne modifie pas le format des sauvegardes.


## Recherche Open Food Facts intégrée 0.13.0-alpha.6

Le sélecteur alimentaire de chaque repas comprend maintenant un onglet Open Food Facts. L’utilisateur peut effectuer une recherche textuelle, enregistrer le résultat localement, régler la quantité puis l’ajouter au repas d’origine sans changer de page.

Le parcours gère :

- les résultats complets et incomplets ;
- les produits déjà enregistrés localement ;
- la conservation prioritaire d’un aliment manuel utilisant le même code-barres ;
- le fonctionnement hors connexion avec retour vers les sources locales ;
- les erreurs et indisponibilités du service externe ;
- l’annulation automatique des requêtes lors du démontage du composant.

Aucune table IndexedDB ni version de sauvegarde n’est modifiée.

## Version 0.13.0-alpha.7 — validation du scanner caméra

Un écran de scan est accessible depuis le sélecteur d’aliments. Il utilise Quagga2 pour reconnaître EAN-13, EAN-8, UPC-A et UPC-E, privilégie la caméra arrière et arrête systématiquement le flux après détection, annulation, changement de page ou passage en arrière-plan.

Cette version valide uniquement la capture et le décodage. Le raccordement automatique du code détecté à Open Food Facts et à l’ajout au repas sera effectué dans la prochaine évolution.

Aucune table IndexedDB et aucun format de sauvegarde ne sont modifiés.

## Version 0.13.0-alpha.8 — scanner relié au journal alimentaire

Le scanner code-barres est désormais intégré au parcours alimentaire complet.

- recherche locale prioritaire par code-barres ;
- lecture des produits locaux hors connexion ;
- interrogation d'Open Food Facts pour un code inconnu ;
- enregistrement local du produit distant ;
- quantité et portions configurables après le scan ;
- ajout direct au repas d'origine ;
- création manuelle avec code prérempli ;
- recherche textuelle de secours ;
- messages distincts pour produit absent, produit archivé, mode hors connexion et API indisponible ;
- proxy de développement utilisable derrière un Quick Tunnel Cloudflare.

Le schéma IndexedDB et le format des sauvegardes restent inchangés.

## Version stable 0.13.0

Cette version finalise les évolutions d'interface et de nutrition prévues pour la série 0.13 :

- modification du profil utilisable sur mobile ;
- suppression des textes temporaires visibles ;
- ajout d'aliments directement depuis chaque repas ;
- aliments récents, favoris et locaux ;
- recherche Open Food Facts intégrée au repas ;
- scan EAN-13, EAN-8, UPC-A et UPC-E ;
- recherche locale prioritaire après scan ;
- ajout direct du produit au repas sélectionné ;
- fonctionnement dégradé et solutions de secours hors connexion.

Le schéma IndexedDB et le format des sauvegardes restent inchangés.

Validation de la version :

- Oxlint : 0 erreur et 0 avertissement ;
- Vitest : 58 fichiers et 234 tests réussis ;
- TypeScript strict : compilation réussie ;
- Vite/PWA : build et service worker générés ;
- audit MVP : réussi.

## Version 0.14.0-alpha.1 — socle de données musculation

Cette préversion ajoute le modèle de données du futur carnet de musculation sans encore modifier l’interface :

- catalogue d’exercices système ou utilisateur ;
- séances modèles et exercices ordonnés ;
- séances réalisées indépendantes de leur modèle d’origine ;
- séries avec répétitions, charge, type, validation et RPE facultatif ;
- suggestions de progression et historique des décisions ;
- sept nouvelles tables Dexie ajoutées par une migration non destructive ;
- conservation intégrale des anciennes activités de musculation dans `activities` ;
- format de sauvegarde version 2 incluant toutes les nouvelles tables ;
- migration automatique des sauvegardes version 1 vers la version 2.

Validation de cette préversion :

- Oxlint : 0 erreur et 0 avertissement ;
- Vitest : 59 fichiers et 238 tests réussis ;
- TypeScript strict : compilation réussie ;
- Vite/PWA : build et service worker générés ;
- audit MVP : réussi.



## Version 0.14.0-alpha.2 — catalogue d’exercices

Cette préversion ajoute le premier écran fonctionnel du carnet de musculation :

- catalogue local de 43 exercices courants disponible hors connexion ;
- recherche sans sensibilité aux accents ;
- filtres par groupe musculaire, matériel et origine ;
- création et modification d’exercices personnels ;
- archivage et réactivation des exercices personnels ;
- duplication d’un exercice système ou personnel ;
- protection des exercices système contre les modifications directes ;
- accès depuis le journal des activités et la navigation ordinateur ;
- restauration automatique du catalogue après un effacement ou l’import d’une ancienne sauvegarde.

Validation : 63 fichiers de tests, 249 tests, lint, build PWA et audit réussis.

## Version 0.14.0-alpha.3 — séances modèles de musculation

Cette préversion ajoute la gestion complète des séances modèles :

- création et modification d’une séance modèle ;
- ajout d’exercices depuis le catalogue local ;
- ordre modifiable avec des commandes accessibles ;
- séries prévues et fourchette de répétitions ;
- charge cible, incrément, repos et RPE maximal recommandé ;
- notes générales et notes par exercice ;
- duplication d’une séance avec une configuration indépendante ;
- archivage et réactivation sans suppression de l’historique ;
- conservation des identifiants des exercices de modèle lors des modifications ;
- accès depuis le journal des activités et la navigation ordinateur.

Validation : 66 fichiers de tests, 259 tests, lint, build PWA et audit réussis.

## Version 0.14.0-alpha.4 — séances réalisées

Cette préversion ajoute le cycle de vie des entraînements de musculation :

- démarrage d’une séance libre ou depuis un modèle ;
- création d’instantanés indépendants du modèle et du catalogue ;
- reprise automatique d’une séance en cours après fermeture de l’application ;
- prévention de plusieurs séances simultanées ;
- ajout, retrait et réorganisation des exercices pendant la séance ;
- notes générales persistantes ;
- clôture avec calcul de la durée ;
- abandon avec conservation dans l’historique ;
- consultation des séances terminées ou abandonnées ;
- accès depuis le journal des activités, les modèles et la navigation ordinateur.

Validation : 69 fichiers de tests, 268 tests, lint, build PWA et audit réussis.


## Version 0.14.0-alpha.5 — saisie des séries

Cette préversion ajoute la saisie détaillée des séries directement dans les séances de musculation :

- ajout d’une série avec reprise automatique de la charge cible et des répétitions prévues ;
- saisie de la charge, des répétitions, du RPE et du type de série ;
- notes facultatives au niveau de chaque série ;
- validation et réouverture d’une série ;
- duplication rapide d’une série existante ;
- suppression avec renumérotation automatique ;
- état d’avancement par exercice par rapport aux séries prévues ;
- protection des séances terminées contre les modifications ;
- persistance locale et reprise après fermeture de l’application ;
- interface responsive optimisée pour la saisie mobile.

Aucune nouvelle migration Dexie n’est nécessaire : la table `strengthSets` existe depuis `0.14.0-alpha.1`.

Validation : 71 fichiers de tests, 277 tests, lint, build PWA et audit réussis.


## Version 0.14.0-alpha.6 — historique par exercice

Cette préversion ajoute la continuité entre les séances de musculation :

- affichage de la dernière séance terminée pour chaque exercice d’une séance en cours ;
- détail des charges, répétitions et RPE précédents ;
- reprise automatique des séries de la séance précédente avant toute nouvelle saisie ;
- protection contre l’écrasement de séries déjà enregistrées ;
- page d’historique accessible depuis le catalogue et les séances ;
- récapitulatif du nombre de séances, de la meilleure charge et du volume cumulé ;
- historique détaillé des séries terminées ;
- exclusion des séries d’échauffement du volume principal ;
- accès direct à la séance d’origine ;
- fonctionnement intégral hors connexion avec IndexedDB.

Aucune nouvelle migration Dexie n’est nécessaire : l’historique est recalculé à partir des séances et séries déjà stockées.

Validation : 73 fichiers de tests, 285 tests, lint, build PWA et audit réussis.


## Version 0.14.0-alpha.7 — statistiques et records de musculation

Cette préversion enrichit l’historique de chaque exercice avec des analyses calculées localement :

- graphiques d’évolution de la charge maximale, de la charge moyenne et du 1RM estimé ;
- graphique du volume et des répétitions par séance ;
- meilleure charge, meilleur volume sur une série et meilleur volume sur une séance ;
- nombre total de séries de travail et de répétitions ;
- charge moyenne par série de travail ;
- estimation du 1RM avec la formule d’Epley sur les séries de 1 à 12 répétitions ;
- comparaison de la dernière séance avec la précédente ;
- records de répétitions pour chaque charge utilisée ;
- exclusion systématique des séries d’échauffement des statistiques principales.

Aucune nouvelle migration Dexie n’est nécessaire : les statistiques sont recalculées à partir des séances et séries existantes.

Validation : 74 fichiers de tests, 290 tests, lint, build PWA et audit réussis.


## Version 0.14.0-alpha.8 — suggestions de progression

Cette préversion ajoute l’assistance à la progression des charges dans les séances modèles :

- génération automatique d’une suggestion après une séance terminée ;
- vérification de toutes les séries de travail prévues ;
- exigence de la borne haute de répétitions sur chaque série ;
- prise en compte du RPE maximal recommandé lorsqu’il est configuré ;
- calcul de la charge proposée avec l’incrément du modèle ;
- acceptation de la proposition ou saisie d’une charge personnalisée ;
- refus ou report de la décision ;
- mise à jour de la charge cible du modèle uniquement après acceptation explicite ;
- conservation de la séance réalisée et de ses valeurs historiques ;
- suivi des suggestions en attente depuis l’historique des entraînements ;
- conservation complète de l’historique des décisions.

Aucune charge n’est modifiée automatiquement. Aucune nouvelle migration Dexie n’est nécessaire : la table `progressionSuggestions` existe depuis `0.14.0-alpha.1`.

Validation : 75 fichiers de tests, 298 tests, lint, build PWA et audit réussis.


## Version 0.14.0-alpha.9 — retrait du RPE général des activités

Cette préversion réserve désormais le RPE aux séries détaillées de musculation :

- retrait du RPE des formulaires de course, natation, vélo, marche et autre cardio ;
- retrait du RPE du formulaire historique de musculation simplifiée ;
- retrait du RPE des cartes d’activité, du tableau de bord et des analyses course/natation ;
- nouvelles activités créées sans valeur RPE générale ;
- conservation non destructive des anciens RPE déjà enregistrés ;
- modification d’une ancienne activité sans suppression de sa valeur historique ;
- sauvegardes anciennes avec RPE et sauvegardes récentes sans RPE toutes deux acceptées.

Le RPE reste disponible uniquement pour chaque série du carnet de musculation. Aucune migration Dexie ni évolution du format de sauvegarde n’est nécessaire.

Validation : 76 fichiers de tests, 301 tests, lint, build PWA et audit réussis.

## Version stable 0.14.0

Cette version finalise le carnet de musculation local et hors connexion :

- catalogue intégré de 43 exercices et exercices personnalisés ;
- création, duplication, archivage et réorganisation des séances modèles ;
- démarrage d’une séance libre ou depuis un modèle ;
- reprise d’une séance en cours après fermeture de l’application ;
- séries détaillées avec charge, répétitions, type, notes et RPE ;
- historique de la dernière performance et reprise rapide des séries précédentes ;
- statistiques par exercice, records, volumes et estimation du 1RM selon Epley ;
- suggestions d’augmentation de charge soumises à une décision explicite ;
- retrait du RPE général des activités cardio sans suppression des anciennes données ;
- migration Dexie non destructive vers le schéma 2 ;
- sauvegarde JSON version 2 compatible avec les sauvegardes 0.12 et 0.13 ;
- fonctionnement hors connexion des fonctionnalités de musculation.

Les anciennes activités de musculation simplifiées restent conservées dans leur historique. Aucune charge cible n’est modifiée automatiquement.

Validation finale :

- Oxlint : 0 erreur et 0 avertissement ;
- Vitest : 78 fichiers et 305 tests réussis ;
- TypeScript strict : compilation réussie ;
- Vite/PWA : build réussi et 106 ressources précachées ;
- audit MVP et audit de release : réussis.



### Correctif de cohérence du retour après ajout d’une activité

La navigation de retour transmet explicitement au journal le message de confirmation, l’identifiant de l’activité enregistrée et la clé de restauration du défilement. Un test dédié couvre désormais le helper de navigation afin d’éviter qu’une branche locale plus ancienne ne revienne à un simple `navigate(destination)` sans état.

## Tests de parcours Playwright

Les tests de bout en bout vérifient les principaux parcours utilisateur dans le bundle de production :

- création et persistance du profil local ;
- saisie des pas et du poids ;
- ajout d’une course ;
- création et ajout d’un aliment local ;
- création d’une séance modèle, démarrage, série et fin de séance ;
- export et restauration JSON ;
- rechargement direct d’une route Hash Router ;
- navigation mobile et absence de débordement horizontal critique.

Installation initiale des navigateurs :

```bash
npx playwright install chromium webkit
```

Exécution complète :

```bash
npm run test:e2e
```

Exécution ciblée :

```bash
npm run test:e2e:chromium
npm run test:e2e:webkit
npm run test:e2e:ui
```

Les tests utilisent Chromium sur ordinateur et WebKit avec l’émulation iPhone 15. Aucun retry n’est activé. Les traces, captures et rapports sont conservés uniquement en cas d’échec dans GitHub Actions.
