# SportPilot 0.23.0 F4 — robustesse multiappareils et publication

## Objectif

F4 clôt la roadmap de synchronisation automatique sans modifier les règles métier des neuf domaines ni les formats de stockage.

## Garde-fous ajoutés

### Isolation des comptes

Le contrôleur associe chaque opération à une génération d’identité. Lorsqu’un compte change, l’orchestrateur précédent est arrêté, une nouvelle génération est créée et toute fin tardive de l’ancien compte est ignorée par l’état applicatif.

### Fermeture pendant une opération

L’orchestrateur ne peut pas annuler une requête réseau déjà engagée. Il laisse donc le domaine courant terminer, mais n’entame aucun domaine suivant après son arrêt. Les domaines non commencés sont marqués comme échec temporaire dans le résultat.

### Hors connexion

Une tentative bloquée avant tout accès cloud est désormais enregistrée dans l’historique. La relance ciblée conserve les mêmes domaines lorsque le réseau revient.

## Scénarios automatisés

- deux orchestrateurs du même compte restent séquentiels ;
- deux comptes différents peuvent progresser indépendamment ;
- une perte réseau conserve les domaines déjà réussis ;
- une relance ne rejoue que les échecs ;
- une fermeture n’entame pas de nouveau domaine ;
- une modification hors session ne part pas vers un compte ;
- le retour en ligne après plusieurs jours déclenche une analyse ;
- une modification immédiate après restauration reste prise en charge ;
- les doubles événements focus/visibilité sont bornés ;
- les événements produits pendant une synchronisation active ne créent pas de boucle ;
- une fin tardive de l’ancien compte ne modifie pas le nouveau compte.

## Consommation réseau

Les domaines restent séquentiels. Les modifications locales rapprochées sont regroupées. Les événements de premier plan sont limités par un intervalle minimal de 30 secondes et les écritures émises pendant une opération active sont ignorées par l’automatisation.

## Versions

- SportPilot : 0.23.0 ;
- runtime cloud : v10 ;
- base métier : Dexie v8 ;
- sauvegarde : JSON v7 ;
- registre des espaces : v1.

Aucune migration de données n’est introduite.
