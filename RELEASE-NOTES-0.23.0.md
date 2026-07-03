# Notes de version — SportPilot 0.23.0

## Synchronisation automatique

SportPilot peut désormais analyser et synchroniser le compte lorsque l’application est ouverte :

- au démarrage ;
- au retour au premier plan ;
- au rétablissement de la connexion ;
- après la connexion à un compte ;
- après une restauration cloud ;
- après une modification locale, avec anti-rebond.

L’activation reste volontaire, locale à l’appareil et liée au compte autorisé. Le mode manuel demeure disponible. Le mode Wi-Fi uniquement bloque l’automatisation lorsque le navigateur ne confirme pas explicitement le type de connexion.

## Transparence

Le centre de synchronisation affiche désormais :

- l’état courant des neuf rubriques ;
- la dernière synchronisation réussie ;
- le dernier échec et sa raison ;
- le nombre de rubriques en attente ;
- un historique récent séparé par compte ;
- la distinction entre actions manuelles et automatiques ;
- la relance ciblée des domaines en échec.

Les divergences ambiguës sont présentées avant toute action. Les fusions automatiques restent limitées aux domaines capables de garantir une convergence non destructive.

## Résilience multiappareils

La publication renforce plusieurs scénarios :

- perte du réseau pendant une synchronisation ;
- fermeture ou démontage du coordinateur pendant une opération ;
- changement de compte alors qu’une opération antérieure se termine ;
- modifications locales après déconnexion ;
- retour en ligne après plusieurs jours ;
- modification immédiate après restauration ;
- retours répétés au premier plan ;
- prévention des boucles provoquées par les événements d’écriture.

Une opération appartenant à un ancien compte ne peut plus mettre à jour l’état du nouveau compte. Une fermeture n’entame pas de nouveau domaine après celui déjà engagé. Les tentatives hors ligne sont visibles dans l’historique.

## Compatibilité

- runtime Dexie Cloud : v10 ;
- runtime local : `sportpilot-sync-runtime-0.20.0-v10` ;
- base métier Dexie : v8 ;
- sauvegarde JSON : v7 ;
- registre des espaces : v1.

**Aucune migration** de données, de sauvegarde ou de registre n’est requise.

## Validation

La recette couvre les suites normales et mélangées, les audits F1 à F4, les budgets du build de production, les scénarios multiappareils, le fonctionnement hors connexion et les contrôles sur ordinateur et iPhone 15 sous iOS 26.
