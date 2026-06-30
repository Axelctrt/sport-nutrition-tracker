# Prototype Dexie Cloud — C2.1 : ergonomie des pesées synchronisées

## Statut

Lot UX expérimental limité à la branche `experiment/dexie-cloud-weight-sync`.

La base réelle `sportpilot-local-database`, le schéma Dexie v8, le backup JSON v7 et les règles de synchronisation C2 restent inchangés.

## Ajustements

### Synchronisation manuelle

Une synchronisation réussie affiche désormais un toast bref :

```text
Synchronisation effectuée
```

Les erreurs restent affichées dans la page afin de ne pas disparaître avant d’avoir été lues.

### Section repliable

La section `Pesées fictives synchronisées` est fermée par défaut. Son en-tête reste visible et indique le nombre de pesées du compte connecté.

Le contrôle utilise un bouton accessible avec `aria-expanded` et `aria-controls`. Il est utilisable au clavier et conserve les états clair et sombre.

### Modification ciblée

Le bouton `Modifier` :

1. conserve la section ouverte ;
2. remplit le formulaire avec la pesée sélectionnée ;
3. fait défiler la page jusqu’au formulaire ;
4. place le focus dans le champ de poids.

Le formulaire utilise une marge de défilement afin de ne pas être masqué par les éléments fixes de l’interface sur mobile.

## Hors périmètre

- logique de fusion Dexie Cloud ;
- identifiants des pesées ;
- `deletionRecords` ;
- fonctionnement hors ligne ;
- données réelles SportPilot ;
- nouvelles tables ou migrations.

## Scénarios manuels

1. ouvrir la page et vérifier que la section des pesées est fermée ;
2. ouvrir la section au clavier et au toucher ;
3. lancer une synchronisation manuelle et vérifier le toast ;
4. cliquer sur Modifier depuis une pesée située plus bas dans la page ;
5. vérifier le défilement vers le formulaire et le focus sur le poids ;
6. contrôler l’absence de débordement horizontal sur iPhone ;
7. vérifier les thèmes clair et sombre.
