# SportPilot 0.21.0

## Continuité des données et gestion du compte

Cette version sécurise le cycle complet entre l’espace invité, l’espace local d’un compte et Dexie Cloud. Les opérations potentiellement sensibles restent explicites, analysables avant écriture et non destructives par défaut.

## Gestion du compte

- accès fonctionnel à **Compte et appareils** dans le build de production ;
- affichage du compte connecté, de l’état cloud et de l’espace local actif ;
- déconnexion, changement de compte, désassociation et suppression locale clairement séparés ;
- aucune suppression implicite des données locales ou cloud.

## Import des données invitées

- analyse préalable avec résumé par domaine ;
- fusion atomique dans un compte existant ;
- conservation de la donnée la plus récente ;
- déduplication fonctionnelle des pesées, pas, repas, objectifs, bilans et produits ;
- remappage des références nutritionnelles ;
- espace invité intégralement conservé ;
- import idempotent sans compteur fantôme après une première fusion.

## Restauration après nouvelle installation

- détection des données déjà synchronisées pour un compte ;
- choix explicite entre **Restaurer depuis le cloud** et **Commencer avec un espace vide** ;
- analyse cloud en lecture seule et préparation dans une base temporaire ;
- vérification des empreintes source et cible avant application ;
- restauration locale atomique et protection contre les changements concurrents ;
- restauration différée disponible depuis **Compte et appareils** ;
- blocage protecteur lorsqu’un espace local contient déjà de vraies données ;
- isolation stricte entre les comptes.

## Domaines restaurés

- pesées ;
- activités ;
- objectifs sportifs ;
- exercices, modèles et séances de musculation ;
- bibliothèque nutritionnelle ;
- journal nutritionnel ;
- bilans et ajustements nutritionnels ;
- marqueurs de suppression associés.

## Compatibilité

- base Dexie Cloud v8 ;
- runtime local `sportpilot-sync-runtime-0.20.0-v8` ;
- schéma métier Dexie v8 ;
- sauvegarde JSON v7 ;
- registre local des espaces v1.

Aucune migration de données, aucun changement de schéma cloud et aucune nouvelle connexion OTP liée au runtime ne sont requis.

## Validation

- audits D1, D2, D3 et isolation des comptes ;
- suite de tests complète et suite mélangée ;
- build PWA et budgets de production ;
- restauration dans un navigateur vierge ;
- espace vide puis restauration différée ;
- suppression/réinstallation de la PWA sur iPhone 15 sous iOS 26 ;
- consultation hors ligne après restauration.
