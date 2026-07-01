# Retour arrière — SportPilot 0.20.0

## Stratégie

Le fix-forward est privilégié. Ne supprime jamais IndexedDB, les données Safari, la PWA ou une base Dexie Cloud locale pour corriger une erreur de synchronisation.

SportPilot 0.20.0 conserve la base métier Dexie v8 et le format JSON v7. La base de synchronisation cloud est en v8 et utilise le runtime local `sportpilot-sync-runtime-0.20.0-v8`.

## Mesures immédiates

1. arrêter les synchronisations manuelles du domaine concerné ;
2. exporter une sauvegarde JSON de l’espace actif ;
3. noter le compte, l’appareil, le domaine et les identifiants concernés ;
4. ne pas connecter un autre compte tant que l’incident n’est pas qualifié ;
5. ne pas effacer le stockage du navigateur ;
6. préparer une correction depuis le tag `v0.20.0`.

## Défaut de runtime cloud

Fermer tous les onglets de l’origine concernée puis redémarrer l’application. Une évolution corrective du schéma doit utiliser un nouveau numéro de version, ce qui génère automatiquement un nouveau nom de runtime local. Ne réutilise jamais un runtime d’un schéma antérieur avec une version supérieure.

## Désactivation ciblée

Un domaine peut être désactivé par sa variable `VITE_ENABLE_REAL_*_SYNC` sans supprimer ses données locales ou cloud. Les autres domaines peuvent rester disponibles si le défaut est isolé.

## Retour du code

Un redéploiement temporaire de 0.19.0 ne sait pas synchroniser les données nutritionnelles C1 à C3. Il ne doit pas supprimer les données locales, mais les modifications cloud plus récentes pourront rester invisibles jusqu’au rétablissement de 0.20.x.

## Git

Ne jamais réécrire le tag `v0.20.0`. Conserver le tag publié et livrer un correctif `0.20.1` avec un nouveau tag annoté.
