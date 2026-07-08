# SportPilot 0.29.0 A9 — Réglages de partage globaux et par activité

## Statut

A9 branche le contrat de confidentialité 0.29 sur les réglages persistants et sur les formulaires réels, sans modifier les versions Dexie, le schéma de sauvegarde ou D1.

## Politique globale

La page « Amis et confidentialité » permet désormais de choisir le comportement par défaut :

- privé : aucun snapshot social n'est publié ;
- résumé : seules les informations générales prudentes sont projetées ;
- détaillé : le détail standard reste plafonné par la permission de chaque ami ;
- personnalisé : l'utilisateur choisit les champs communs, cardio et musculation autorisés.

Les notes personnelles et les champs techniques ne sont jamais proposés au partage. L'ancien champ `activitySharing` reste synchronisé pour assurer la compatibilité des sauvegardes et des écrans historiques.

## Surcharge par activité

Les activités cardio/endurance et les séances de musculation peuvent enregistrer une surcharge :

- suivre les réglages globaux ;
- privée ;
- résumé ;
- détaillée ;
- personnalisée.

La surcharge est persistée dans l'agrégat métier avant la projection sociale. Une séance de musculation en cours peut préparer son réglage, mais elle n'est publiée qu'après finalisation.

## Réconciliation

Une modification du réglage global, de la visibilité du profil ou de la permission d'un ami déclenche une réconciliation best effort des activités existantes :

- activités cardio/endurance réelles ;
- séances de musculation terminées ;
- tombstone lorsqu'une activité devient privée ou qu'un destinataire perd l'accès ;
- poursuite du traitement si une activité isolée échoue.

Le traitement social reste dérivé et ne bloque jamais les fonctions sportives locales.

## Persistance et compatibilité

- aucune migration Dexie : les nouvelles propriétés sont optionnelles dans les enregistrements existants ;
- aucune migration D1 supplémentaire ;
- schéma de sauvegarde inchangé, avec validation des nouvelles propriétés optionnelles ;
- les données historiques sans politique 0.29 sont converties depuis le réglage de partage historique ;
- aucune note personnelle, commentaire libre ou payload technique n'est introduit dans la politique.

## Mobile-first

Les choix utilisent des boutons et cases à cocher avec une hauteur tactile minimale de 44 px. Les groupes de champs sont verticaux sur mobile et passent en deux colonnes lorsque la largeur le permet. Aucun tableau horizontal ou interaction au survol n'est requis.

## Hors périmètre

A9 n'applique pas la migration D1 A6 à distance, ne déploie pas l'application et n'ajoute ni réaction, commentaire, notification, défi ou profil public.

## Limite contrôlée avant la validation multi-appareil

La politique globale est persistée localement et incluse dans les sauvegardes. Les surcharges d'activité et de séance suivent les flux cloud existants de leurs agrégats. La synchronisation multi-appareil dédiée de la politique globale reste à brancher avant les tests réels à deux appareils ; A9 ne crée pas silencieusement un second stockage cloud concurrent.
