# Audit avant déploiement

## Informations générales

- **Application :** Sport Nutrition Tracker / SportPilot
- **Version auditée :** 0.12.0
- **Version de référence :** `v0.12.0-mvp`
- **Branche :** `audit/pre-deploiement` *(à confirmer avec `git branch --show-current`)*
- **Date :** 24 juin 2026
- **Testeur :** Axel
- **Système :** Windows
- **Git :** 2.39.1.windows.1
- **Node.js :** 24.17.0
- **npm :** 11.13.0

---

## 1. Version de référence

- [x] Dépôt Git initialisé
- [x] Branche stable `main`
- [x] Branche de développement `develop`
- [x] Tag `v0.12.0-mvp`
- [x] Dépôt GitHub configuré
- [x] Branches et tag envoyés sur GitHub
- [x] Archive ZIP du code source créée
- [x] Archive ZIP du build créée

**Conclusion :** le MVP 0.12.0 est figé et restaurable depuis Git, GitHub ou les archives ZIP.

---

## 2. Contrôles automatisés

| Contrôle | Résultat | Statut |
|---|---:|---|
| `npm ci` | Réussi | Validé |
| Oxlint | 0 avertissement, 0 erreur | Validé |
| Vitest | 43 fichiers réussis | Validé |
| Tests | 187/187 réussis | Validé |
| TypeScript | Compilation réussie | Validé |
| Build Vite | Réussi | Validé |
| Audit MVP | Réussi | Validé |
| Génération PWA | Réussie | Validé |
| Taille du build | Environ 1,27 Mo | Information |
| `npm audit` | À analyser | En attente |
| `npm outdated` | À analyser | En attente |

### Détails

- 245 fichiers analysés par Oxlint avec 103 règles.
- 1 148 modules transformés pendant le build.
- 77 éléments ajoutés au précache PWA.
- `dist/sw.js` et le fichier Workbox ont été générés.
- L’audit MVP a validé la PWA, les fichiers hors ligne, des repères d’accessibilité et l’absence de secrets évidents.

### Open Food Facts

Les messages `Failed to fetch` observés pendant les tests sont attendus : certains tests simulent volontairement une indisponibilité réseau. Tous les tests concernés sont réussis.

---

## 3. Sécurité et confidentialité

### Secrets

- [x] Aucun mot de passe codé en dur détecté
- [x] Aucune clé API détectée
- [x] Aucun jeton d’authentification détecté
- [x] Aucun secret évident détecté
- [x] Aucun fichier `.env` suivi par Git

Les occurrences `token` dans `package-lock.json` correspondent à des dépendances légitimes telles que `@csstools/css-tokenizer` et `js-tokens`.

### Fichiers ignorés

Le `.gitignore` exclut notamment :

- `node_modules/`
- `dist/`
- `dev-dist/`
- `.env`
- `.env.*`
- `coverage/`
- les logs ;
- les caches TypeScript et Vite.

### URL externes

- [x] `http://127.0.0.1:5173/` : documentation de développement
- [x] `http://www.w3.org/2000/svg` : namespace SVG standard
- [x] `https://search.openfoodfacts.org` : recherche Open Food Facts
- [x] `https://world.openfoodfacts.org` : API produit et secours

- [x] Aucun domaine externe inconnu détecté
- [x] Aucune clé présente dans une URL
- [ ] Vérifier dans l’onglet Network qu’aucune donnée personnelle n’est envoyée lors des saisies locales

---

## 4. Version de production

- [x] Build de production généré
- [x] Lancer `npm run preview`
- [ ] Vérifier toutes les routes
- [ ] Vérifier l’absence d’erreurs rouges dans la console
- [ ] Vérifier les requêtes réseau
- [ ] Vérifier les rechargements directs
- [ ] Vérifier les graphiques
- [ ] Vérifier les formulaires
- [ ] Vérifier la persistance après fermeture

Commandes :

```powershell
npm run build
npm run preview
```

---

## 5. Recette fonctionnelle

### Profil

- [ ] Profil homme
- [ ] Profil femme
- [ ] Perte de poids
- [ ] Maintien
- [ ] Prise de poids
- [ ] Champs obligatoires
- [ ] Valeurs incorrectes
- [ ] Modification du profil
- [ ] Recalcul des calories
- [ ] Recalcul des macronutriments

### Poids et pas

- [ ] Ajout, modification et suppression d’une pesée
- [ ] Moyenne mobile sur 7 jours
- [ ] Moyenne hebdomadaire
- [ ] Saisie de 0, 5 000 et 15 000 pas
- [ ] Modification des pas
- [ ] Application du seuil de pas inclus dans l’activité de base

### Course

Scénario :

```text
Durée : 30 minutes
Distance : 5 km
Cadence : 170 pas/min
Pas de course attendus : 5 100
Pas totaux : 10 000
Pas hors course attendus : 4 900
```

- [ ] Allure correcte
- [ ] Pas de course corrects
- [ ] Pas hors course corrects
- [ ] Aucun double comptage
- [ ] Deux courses le même jour
- [ ] Course sans cadence
- [ ] Modification et suppression
- [ ] Validation des valeurs invalides
- [ ] RPE minimum et maximum

### Natation

Scénario :

```text
Durée : 45 minutes
Distance : 1 500 m
Allure attendue : 3 min/100 m
```

- [ ] Allure correcte
- [ ] Calories MET correctes
- [ ] Différents types de séance
- [ ] Modification du MET
- [ ] Modification et suppression
- [ ] Validation des valeurs invalides

### Musculation et autres activités

- [ ] Séance de 60 minutes
- [ ] Modification de l’intensité
- [ ] Modification du MET
- [ ] Plusieurs activités le même jour
- [ ] Modification et suppression

---

## 6. Journal alimentaire

Aliment de test :

```text
Riz cuit, pour 100 g :
130 kcal
2,7 g protéines
28 g glucides
0,3 g lipides
```

Pour 200 g, résultat attendu :

```text
260 kcal
5,4 g protéines
56 g glucides
0,6 g lipides
```

- [ ] Création d’un aliment manuel
- [ ] Quantités de 50 g, 100 g, 200 g et 250 g
- [ ] Modification et suppression
- [ ] Duplication
- [ ] Copie d’un repas
- [ ] Copie d’une journée
- [ ] Favoris
- [ ] Création d’une recette
- [ ] Plusieurs portions
- [ ] Totaux du tableau de bord

---

## 7. Open Food Facts

- [ ] Recherche textuelle
- [ ] Code-barres valide
- [ ] Code-barres inexistant
- [ ] Produit incomplet
- [ ] Unité inhabituelle
- [ ] Service de secours
- [ ] Coupure réseau
- [ ] Message d’erreur compréhensible
- [ ] Création manuelle toujours possible
- [ ] Produits locaux disponibles hors connexion

---

## 8. IndexedDB et persistance

- [ ] Profil conservé après actualisation
- [ ] Poids conservé
- [ ] Pas conservés
- [ ] Activités conservées
- [ ] Aliments conservés
- [ ] Recettes conservées
- [ ] Données conservées après fermeture du navigateur
- [ ] Données conservées après redémarrage du PC
- [ ] Tables IndexedDB présentes et cohérentes
- [ ] Aucune donnée personnelle envoyée automatiquement

---

## 9. Sauvegarde et restauration

- [ ] Export JSON complet
- [ ] Suppression avec confirmation
- [ ] Retour correct à l’état initial
- [ ] Import du fichier exporté
- [ ] Restauration du profil
- [ ] Restauration des paramètres
- [ ] Restauration des poids, pas et activités
- [ ] Restauration des aliments, repas, favoris et recettes
- [ ] Restauration des bilans hebdomadaires
- [ ] Rejet d’un fichier non JSON
- [ ] Rejet d’un JSON invalide
- [ ] Ancien format de sauvegarde
- [ ] Deux imports successifs
- [ ] Aucun écrasement sans confirmation

---

## 10. PWA et hors connexion

### Automatique

- [x] Manifest généré
- [x] Service worker généré
- [x] Fichiers hors ligne présents
- [x] 77 éléments dans le précache
- [x] Audit PWA réussi

### Manuel

- [ ] Installation sur ordinateur
- [ ] Installation sur iPhone
- [ ] Icône et nom corrects
- [ ] Ouverture en mode autonome
- [ ] Chargement hors connexion
- [ ] Tableau de bord hors connexion
- [ ] Saisie du poids et des pas hors connexion
- [ ] Ajout d’activité hors connexion
- [ ] Produits locaux hors connexion
- [ ] Historique hors connexion
- [ ] Mise à jour correcte du service worker

---

## 11. Tests mobiles

- [x] Application accessible sur le téléphone via le réseau local
- [x] Problème initial identifié comme une mauvaise adresse
- [x] Connexion mobile fonctionnelle

À vérifier :

- [ ] Navigation basse
- [ ] Boutons tactiles
- [ ] Taille des zones cliquables
- [ ] Clavier des formulaires
- [ ] Nombres décimaux
- [ ] Sélecteurs de date
- [ ] Graphiques
- [ ] Absence de défilement horizontal involontaire
- [ ] Mode clair et sombre
- [ ] Portrait et paysage
- [ ] Conservation des données

---

## 12. Accessibilité

- [x] Repères d’accessibilité détectés par l’audit MVP
- [ ] Navigation clavier
- [ ] Ordre de tabulation
- [ ] Focus visible
- [ ] Labels des champs
- [ ] Messages d’erreur associés
- [ ] Contrastes
- [ ] Information non transmise uniquement par la couleur
- [ ] Taille des boutons
- [ ] Zoom du texte
- [ ] Lighthouse Accessibilité

---

## 13. Lighthouse

| Catégorie | Objectif | Résultat |
|---|---:|---:|
| Performance | ≥ 80 | À renseigner |
| Accessibilité | ≥ 90 | À renseigner |
| Bonnes pratiques | ≥ 90 | À renseigner |
| SEO | ≥ 90 | À renseigner |
| PWA | Validation | À renseigner |

---

## 14. Dépendances

- [x] `npm audit` exécuté et analysé
- [x] Aucune vulnérabilité critique non traitée
- [x] Vulnérabilités élevées analysées
- [x] `npm outdated` exécuté et analysé
- [x] Aucun `npm audit fix --force` lancé sans analyse
- [x] @types/node 24 conservé pour rester aligné avec Node.js 24 LTS
- [x] Recharts mis à jour de 3.8.1 vers 3.9.0
- [x] Tests automatisés réussis après la mise à jour de Recharts
- [x] Graphiques vérifiés manuellement après la mise à jour

Commandes :

```powershell
npm audit
npm outdated
```

---

## 15. Problèmes relevés

| ID | Priorité | Zone | Description | Reproduction | Statut |
|---|---|---|---|---|---|
| AUD-001 | Mineur | Test mobile | Première tentative avec une mauvaise adresse réseau | Adresse différente de l’adresse Network de Vite | Résolu |

Niveaux :

- **Bloquant :** perte de données, application inutilisable, calcul critique faux.
- **Majeur :** fonctionnalité importante indisponible.
- **Modéré :** problème réel avec contournement.
- **Mineur :** esthétique, texte ou confort.

---

## 16. Décision provisoire

- [ ] Déploiement autorisé
- [x] Déploiement autorisé après finalisation des tests manuels
- [ ] Déploiement refusé

### État actuel

Le socle technique est solide :

- compilation réussie ;
- 187 tests réussis ;
- aucun problème de lint ;
- PWA générée ;
- audit automatique réussi ;
- aucun secret évident ;
- domaines externes cohérents ;
- accès mobile local confirmé.

### Travaux prioritaires restants

1. analyser `npm audit` et `npm outdated` ;
2. tester `npm run preview` ;
3. valider les calculs métier ;
4. valider IndexedDB ;
5. valider l’export/import ;
6. tester le mode hors connexion ;
7. lancer Lighthouse ;
8. tester l’installation réelle de la PWA ;
9. corriger les anomalies bloquantes ou majeures.
