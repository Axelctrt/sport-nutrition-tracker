# Assistant quotidien - fondation de donnees 0.33.0

## Perimetre

Cette phase ajoute la persistance et la continuite multiappareils necessaires
au futur assistant quotidien. Elle ne modifie pas encore les ecrans du
tableau de bord.

## Sources de verite

- `weights` reste la source canonique des pesees.
- `dailySteps` reste la source canonique des pas.
- `activities`, `workoutSessions` et `endurancePlanningSessions` restent les
  sources canoniques des activites realisees ou planifiees.
- `dailyCheckIns`, `dailyActivityDecisions` et `dailyCheckOuts` ne dupliquent
  pas ces donnees. Ils stockent uniquement les reponses et decisions du
  parcours quotidien.

Les trois nouvelles entites possedent un identifiant deterministe par date.
Les anciennes donnees restent valides et aucune conversion destructive n'est
executee.

## Versions de stockage

- Base locale Dexie : v11.
- Sauvegarde JSON : v10.
- Runtime Dexie Cloud : v16.

La migration locale v11 ajoute trois tables vides. La migration de sauvegarde
v9 vers v10 ajoute trois collections vides. Les sauvegardes v10 les exigent et
les valident.

## Synchronisation quotidienne

Le domaine `daily-coaching` regroupe une journee par date :

- check-in ;
- decision d'activite ;
- check-out ;
- pas.

Chaque section est fusionnee independamment selon son horodatage. Une saisie
du matin sur un appareil peut donc etre combinee avec un check-out effectue
sur un autre appareil sans ecrasement de la journee complete.

Les drapeaux de contexte ne contiennent aucun texte libre. Lorsque
`contextSyncPreference` vaut `localOnly`, les drapeaux sont retires de
l'agregat cloud et preserves uniquement dans la base locale. La valeur
`account` doit etre choisie explicitement pour les synchroniser.

## Planning d'endurance

Les seances de `endurancePlanningSessions` font maintenant partie du domaine
Activites. Le type de suppression `endurancePlanningSession` et ses marqueurs
empechent une seance supprimee de reapparaitre apres une synchronisation ou
une restauration de compte.

## Portabilite

La sauvegarde complete, la restauration selective, l'import des donnees
invitees, la restauration cloud et la suppression distante du compte couvrent
les nouvelles tables. Les pas declenchent automatiquement la synchronisation
du domaine quotidien ; les changements du planning d'endurance declenchent
le domaine Activites.
