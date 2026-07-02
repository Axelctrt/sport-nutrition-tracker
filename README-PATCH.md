# SportPilot 0.21.1 — développement 0.22.0 E3

Branche de travail : `feature/full-account-continuity-0.22.0`

## Objet

Le lot E3 ajoute un centre de synchronisation unifié au-dessus des panneaux existants. La version affichée reste `0.21.1` jusqu’à la publication finale 0.22.0 en E4.

## Pilotage global

Le centre permet de :

- lancer une analyse sans modification sur toutes les rubriques actives ;
- confirmer puis synchroniser toutes les rubriques ;
- suivre l’état et le nombre de différences par domaine ;
- conserver la dernière analyse et la dernière synchronisation sur l’appareil ;
- ouvrir la rubrique Synchronisation des données sur son en-tête, puis revenir à cet en-tête à la fermeture d’un détail ;
- garantir qu’un seul lien de navigation est visuellement sélectionné, y compris pour Rappels et Corbeille ;
- poursuivre les autres domaines lorsqu’une rubrique échoue ;
- relancer uniquement les rubriques en échec ;
- accéder au détail et aux actions unitaires de chaque domaine.

## Rubriques

- profil et réglages ;
- récompenses et routines ;
- pesées ;
- activités ;
- objectifs ;
- musculation ;
- journal nutritionnel ;
- bibliothèque nutritionnelle ;
- suivi nutritionnel.

## Garanties

- aucune synchronisation globale n’est lancée sans action explicite ;
- la synchronisation globale exige une confirmation ;
- une erreur ne bloque pas les rubriques suivantes ;
- le mode hors connexion désactive les opérations cloud sans bloquer les données locales ;
- les métadonnées du centre sont isolées par empreinte de compte et ne contiennent aucune donnée métier ;
- les services existants restent l’unique source de vérité pour les règles de fusion et l’isolation des comptes.

## Compatibilité

- application affichée : `0.21.1` pendant le développement ;
- base Dexie Cloud : v10 ;
- runtime local cloud : `sportpilot-sync-runtime-0.20.0-v10` ;
- schéma métier Dexie : v8 ;
- sauvegarde JSON : v7 ;
- registre local des espaces : v1.

E3 ne crée aucune table et ne nécessite aucune migration ni nouvelle authentification OTP par rapport à E2.

## Contrôles

```powershell
npm ci
npm run check
npm run test:stability
npm run audit:unified-sync-center
```

La publication et le changement de version applicative restent réservés au lot E4.
