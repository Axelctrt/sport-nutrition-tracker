# Retour arrière — SportPilot 0.18.0

## Stratégie

Le fix-forward est la stratégie privilégiée. Ne supprime jamais IndexedDB, les données Safari ou la PWA pour corriger un défaut de changement de compte.

SportPilot 0.18.0 conserve le schéma Dexie v8 et le format JSON v7, mais introduit plusieurs bases locales distinctes et un registre d’espaces v1. Un retour vers 0.17.1 ne sait pas gérer ces espaces de comptes et rouvrirait uniquement la base invitée historique.

## Mesures immédiates

1. exporter une sauvegarde JSON de l’espace actif si celui-ci reste accessible ;
2. noter le compte et l’espace concernés ;
3. ne pas connecter un autre compte tant que le défaut n’est pas qualifié ;
4. ne pas effacer le stockage du navigateur ;
5. préparer une correction sur une branche dédiée à partir de v0.18.0.

## Désactivation du cloud

Si le défaut concerne uniquement Dexie Cloud, conserver les espaces locaux, interrompre les opérations de compte et publier une correction. La désactivation du cloud ne doit pas entraîner la suppression d’un espace local.

## Retour du code

Un redéploiement temporaire de 0.17.1 peut rendre les espaces de comptes invisibles sans les supprimer, car 0.17.1 n’ouvre que sportpilot-local-database. Il ne doit être effectué qu’après validation et avec une sauvegarde récente.

## Git

Ne jamais réécrire le tag v0.18.0. Conserver le tag publié et livrer un correctif 0.18.1 avec un nouveau tag annoté.
