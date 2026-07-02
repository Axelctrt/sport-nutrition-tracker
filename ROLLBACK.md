# Retour arrière — SportPilot 0.21.1

## Stratégie

Le fix-forward est privilégié. Ne supprime jamais IndexedDB, les données Safari, la PWA ou une base Dexie Cloud locale pour corriger un incident de compte, d’import ou de restauration.

SportPilot 0.21.1 conserve la base métier Dexie v8, la sauvegarde JSON v7, le registre des espaces v1 et le runtime cloud `sportpilot-sync-runtime-0.20.0-v8`.

## Mesures immédiates

1. arrêter les importations et synchronisations du domaine concerné ;
2. exporter une sauvegarde JSON de chaque espace accessible ;
3. noter le compte, l’appareil, l’espace, le domaine et l’action réalisée ;
4. ne pas changer de compte tant que l’incident n’est pas qualifié ;
5. ne pas effacer le stockage du navigateur ou de Safari ;
6. préparer une correction depuis le tag `v0.21.1`.

## Correctif du journal nutritionnel 0.21.1

Un retour à 0.21.0 réintroduit le renouvellement artificiel de `updatedAt` lors de l’ouverture du tableau de bord. Ce comportement ne détruit pas les données, mais peut provoquer une synchronisation répétitive de la journée courante. Préférer un fix-forward et ne jamais effacer le journal ou le cloud pour supprimer cet écart.

## Gestion du compte D1

Un retour au code 0.20.1 peut rendre l’écran de gestion indisponible en production. Il ne doit pas être utilisé comme procédure de suppression ou de changement de compte. Préférer une correction ciblée de l’accès ou de la configuration publique.

## Import invité D2

D2 ne modifie aucun schéma et ne supprime jamais la source invitée. Désactiver l’interface d’import n’annule pas les données déjà fusionnées dans un compte. En cas d’import incorrect, conserver les deux espaces, exporter les sauvegardes et corriger par fusion déterministe plutôt que par effacement.

## Restauration cloud D3

D3 utilise le cloud en lecture seule, prépare les données dans une base temporaire et applique la cible localement. Un retour au code antérieur retire l’interface de restauration, mais les données déjà restaurées restent dans l’espace local et le cloud reste intact.

En cas d’échec pendant une restauration, fermer l’application, conserver la base locale et exporter une sauvegarde si possible. Ne jamais vider le cloud pour forcer une nouvelle tentative.

## Défaut de runtime cloud

Fermer tous les onglets de l’origine concernée puis redémarrer l’application. Une future évolution du schéma doit utiliser un nouveau numéro de version et un nouveau nom de runtime. Ne jamais réutiliser un runtime d’un schéma antérieur avec une version supérieure.

## Git

Ne jamais réécrire le tag `v0.21.1`. Conserver le tag publié et livrer tout correctif ultérieur avec une nouvelle version et un nouveau tag annoté.
