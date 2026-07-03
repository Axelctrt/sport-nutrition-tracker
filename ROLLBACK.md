# Retour arrière — SportPilot 0.23.0

## Stratégie

Le fix-forward est privilégié. Ne supprime jamais IndexedDB, les données Safari, la PWA ou une base Dexie Cloud locale pour corriger un incident de compte, de restauration ou de synchronisation.

SportPilot 0.23.0 conserve la base métier Dexie v8, la sauvegarde JSON v7, le registre des espaces v1 et le runtime cloud `sportpilot-sync-runtime-0.20.0-v10`.

## Mesures immédiates

1. désactiver la synchronisation automatique sur l’appareil concerné ;
2. conserver les actions manuelles disponibles ;
3. exporter une sauvegarde JSON de chaque espace accessible ;
4. noter le compte, l’appareil, le domaine, la source et l’heure de l’opération ;
5. conserver les historiques locaux et les données des deux appareils ;
6. ne pas effacer le stockage du navigateur ou de Safari ;
7. préparer une correction depuis le tag `v0.23.0`.

## Défaut de l’automatisation

L’autorisation automatique peut être désactivée localement sans supprimer les données ni désactiver le centre manuel. En cas de rafale ou de déclencheur incorrect, revenir temporairement au mode manuel et corriger par fix-forward.

## Changement de compte

Ne jamais forcer la réutilisation de l’orchestrateur d’un ancien compte. Conserver les deux espaces locaux, désactiver l’automatisation et vérifier les empreintes avant toute nouvelle opération.

## Opération interrompue

Une requête déjà engagée peut terminer. Attendre le retour du centre, analyser les neuf rubriques puis relancer uniquement les échecs. Ne jamais rejouer une synchronisation globale pour masquer un état partiel sans analyse préalable.

## Retour applicatif temporaire

Un déploiement temporaire du tag `v0.22.0` n’effectue aucune migration inverse et ne supprime aucune donnée. Il retire l’automatisation F1 à F4 mais conserve le centre manuel et les données cloud existantes. Désactiver l’automatisation avant ce retour.

## Git

Ne jamais réécrire le tag `v0.23.0`. Conserver le tag publié et livrer chaque correctif avec une nouvelle version et un nouveau tag annoté.
