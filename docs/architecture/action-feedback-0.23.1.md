# SportPilot 0.23.1 — Retours d’action centralisés

## Objectif

Toute action utilisateur explicitement validée et réellement persistée doit produire un retour visuel cohérent. Les messages intégrés aux pages restent disponibles lorsqu’ils apportent un détail durable, tandis que le toast confirme immédiatement le résultat global.

## Socle

`useActionToast` normalise :

- les confirmations de réussite ;
- les erreurs avec conservation du message métier ;
- la déduplication par action ;
- les confirmations à restituer après un rechargement complet.

Le hook reste silencieux lorsqu’un composant est rendu isolément hors du shell applicatif. Le `ToastProvider` demeure la source d’affichage en production.

## Rechargements et redirections

Une action de compte, une restauration cloud ou un import invité peut provoquer un rechargement immédiat. `pendingToast.ts` conserve alors une charge utile sérialisable dans `sessionStorage`. Le fournisseur la consomme une seule fois au prochain montage et la retire avant de l’afficher.

L’indisponibilité de `sessionStorage` ne bloque jamais l’action métier.

## Couverture

Le correctif couvre notamment :

- objectifs, profil et paramètres ;
- poids, pas et personnalisation du tableau de bord ;
- aliments, recettes, favoris et modèles sportifs ;
- exercices, modèles et démarrage de séances de musculation ;
- sauvegardes, restaurations, exports et rapports ;
- compte, import invité et restauration cloud ;
- synchronisation automatique, stockage persistant et corbeille.

## Écritures fréquentes

Les changements de champs, les autosauvegardes et les écritures répétitives d’une séance active ne déclenchent pas un toast à chaque valeur. Ils conservent leur indicateur local `Enregistrement… / Enregistré / Erreur`. Cette exception évite le bruit visuel sans masquer les erreurs.

## Accessibilité

Le viewport existant conserve :

- une région `aria-live="polite"` pour les confirmations ;
- un rôle d’alerte pour les erreurs ;
- une fermeture explicite ;
- une durée supérieure pour les erreurs ;
- un maximum de quatre notifications visibles.

## Compatibilité

- application : 0.23.1 ;
- runtime cloud : v10 ;
- base métier Dexie : v8 ;
- sauvegarde JSON : v7 ;
- registre des espaces : v1.

Aucune migration n’est introduite.
