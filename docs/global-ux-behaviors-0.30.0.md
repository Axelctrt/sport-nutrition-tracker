# U10 — Comportements UX communs

## Objectif

Cette phase homogénéise les comportements transverses qui doivent rester cohérents dans toute l'application, sans modifier les règles métier ni les données enregistrées.

## Erreurs de chargement et déploiements

SportPilot écoute désormais l'événement `vite:preloadError` émis lorsqu'un ancien onglet tente de charger un chunk supprimé par un nouveau déploiement.

- une seule tentative de rechargement automatique est autorisée dans une fenêtre de 30 secondes ;
- le marqueur est effacé après un démarrage sain ;
- si le problème persiste, React Router affiche une page d'erreur exploitable au lieu de son écran développeur ;
- la page d'erreur propose de recharger ou de revenir à l'Accueil et rassure sur la conservation des données locales.

## Notifications

Une seule notification principale est affichée à la fois.

- un nouveau retour d'action remplace le précédent afin de rester immédiatement visible ;
- les notifications qui doivent toutes être livrées peuvent être mises en file explicitement ;
- les déblocages simultanés de badge et de thème sont présentés successivement ;
- les succès restent courts ;
- les erreurs restent visibles dix secondes ;
- les actions comme « Annuler » restent disponibles.

## Actualisations

Le composant partagé `RefreshStatus` distingue une actualisation silencieuse d'un chargement initial.

- le chargement initial continue d'utiliser les skeletons ;
- le journal Nutrition et le planning conservent leurs données visibles pendant une actualisation ;
- un petit indicateur annonce la mise à jour sans masquer l'écran ;
- un échec d'actualisation silencieuse ne remplace pas les données déjà affichées.

## Suppressions importantes

La suppression d'un ami n'utilise plus `window.confirm`.

- une boîte de confirmation accessible affiche le nom de l'ami ;
- la conséquence est explicitée ;
- l'action destructive possède un état de progression ;
- la boîte reste compatible clavier, focus et petits écrans.

## Hors ligne

Le message global devient :

> Hors ligne — modifications conservées sur cet appareil. La synchronisation reprendra au retour du réseau.

Il correspond aux quatre états simplifiés retenus pour l'utilisateur et évite d'exposer les détails techniques de synchronisation dans l'interface principale.

## Compatibilité

- aucune migration D1 ;
- aucune migration Dexie ;
- aucun changement de format de sauvegarde ;
- aucune modification des règles sociales, nutritionnelles ou sportives ;
- les routes existantes restent valides ;
- les mécanismes de corbeille et d'annulation existants restent inchangés.
