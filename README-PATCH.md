# SportPilot 0.21.0 — continuité des données et gestion du compte

Branche de travail : `feature/data-continuity-0.21.0`

## Objet

Cette version sécurise le passage entre l’espace invité, les espaces de compte et le cloud. Elle rend la gestion du compte disponible en production, ajoute une fusion explicite des données invitées et permet de restaurer un compte après une nouvelle installation sans écriture implicite dans le cloud.

## D1 — Gestion du compte

- accès centralisé depuis **Compte et appareils** ;
- affichage du compte connecté, de l’état cloud et de l’espace local actif ;
- déconnexion et changement de compte sans suppression implicite ;
- désassociation de l’appareil distincte de la suppression locale ;
- configuration publique de production validée et impossible à désactiver par une ancienne variable de déploiement.

## D2 — Import des données invitées

- analyse obligatoire avant toute modification ;
- résumé des ajouts, mises à jour et retraits par domaine ;
- fusion atomique dans l’espace du compte ;
- conservation de la donnée la plus récente ;
- déduplication par identifiant fonctionnel, date, créneau ou code-barres selon le domaine ;
- remappage des références nutritionnelles ;
- espace invité conservé intégralement ;
- import idempotent après une première fusion.

## D3 — Restauration après nouvelle installation

- détection des données cloud sur une installation locale vide ;
- choix explicite entre restauration et espace vide ;
- analyse cloud en lecture seule ;
- préparation dans une base Dexie temporaire ;
- application locale atomique avec vérification des empreintes source et cible ;
- restauration différée depuis **Compte et appareils** ;
- blocage protecteur si l’espace local contient déjà des données métier ;
- aucune suppression ni remise à zéro du cloud.

## Compatibilité

- application : `0.21.0` ;
- base Dexie Cloud : v8 ;
- runtime local cloud : `sportpilot-sync-runtime-0.20.0-v8` ;
- schéma métier Dexie : v8 ;
- sauvegarde JSON : v7 ;
- registre local des espaces : v1.

Aucune migration de données n’est nécessaire et le runtime cloud n’est pas renommé.

## Contrôles

```powershell
npm ci
npm run release:verify
npm run test:e2e
npm run audit:data-continuity-release
```

## Validation manuelle

1. gérer le compte et changer de compte sans mélange de données ;
2. importer l’espace invité puis confirmer une seconde analyse à zéro ;
3. restaurer un compte dans un profil navigateur vierge ;
4. commencer avec un espace vide puis restaurer ultérieurement ;
5. vérifier le blocage d’une restauration globale dans un espace déjà utilisé ;
6. confirmer `0 différence` dans chaque domaine synchronisé ;
7. vérifier l’accès hors ligne après restauration ;
8. répéter la suppression/réinstallation de la PWA sur iPhone 15 sous iOS 26.
