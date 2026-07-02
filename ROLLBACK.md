# Retour arrière — SportPilot 0.22.0

## Stratégie

Le fix-forward est privilégié. Ne supprime jamais IndexedDB, les données Safari, la PWA ou une base Dexie Cloud locale pour corriger un incident de compte, de restauration ou de synchronisation.

SportPilot 0.22.0 conserve la base métier Dexie v8, la sauvegarde JSON v7 et le registre des espaces v1. Il utilise le runtime cloud `sportpilot-sync-runtime-0.20.0-v10` introduit pendant la roadmap 0.22.0.

## Mesures immédiates

1. arrêter les synchronisations du domaine concerné ;
2. exporter une sauvegarde JSON de chaque espace accessible ;
3. noter le compte, l’appareil, le domaine et l’action réalisée ;
4. conserver les données locales des deux appareils ;
5. ne pas effacer le stockage du navigateur ou de Safari ;
6. préparer une correction depuis le tag `v0.22.0`.

## Centre unifié

Le centre orchestre les services unitaires sans modifier leurs règles de fusion. En cas de défaut de l’interface globale, utiliser le détail de la rubrique concernée ou désactiver temporairement l’action globale par correctif. Ne jamais effacer une donnée pour forcer l’état 9/9.

## Profil, récompenses et routines

Les états cumulatifs sont fusionnés sans suppression. Un retour à 0.21.1 retire leur interface cloud mais ne supprime ni les agrégats déjà présents dans le runtime v10 ni les données locales. Conserver les deux côtés et corriger par fix-forward.

## Restauration cloud

La restauration lit le cloud, prépare une base temporaire et applique localement après vérification des empreintes. Un retour au code antérieur retire l’extension E1/E2 de la restauration, mais les données déjà restaurées restent locales et le cloud reste intact.

En cas d’échec, fermer l’application, conserver la base locale et exporter une sauvegarde si possible. Ne jamais vider le cloud pour forcer une nouvelle tentative.

## Défaut de runtime cloud

Fermer tous les onglets de l’origine puis redémarrer l’application. Ne jamais renommer v10 ni réutiliser un runtime d’un schéma antérieur sous un numéro supérieur. Une nouvelle évolution de schéma doit utiliser une nouvelle version de runtime.

## Retour applicatif temporaire

Un déploiement temporaire du tag `v0.21.1` n’effectue aucune migration inverse et ne supprime aucune donnée. Il masque cependant les fonctionnalités E1 à E3 et ne doit être utilisé que pour isoler un incident d’interface pendant la préparation d’un correctif 0.22.x.

## Git

Ne jamais réécrire le tag `v0.22.0`. Conserver le tag publié et livrer chaque correctif avec une nouvelle version et un nouveau tag annoté.
