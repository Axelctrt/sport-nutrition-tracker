# SportPilot 0.29.0 — A20 sélection des champs partagés par ami

## Objectif

Permettre au propriétaire d’une activité de choisir, pour chaque ami autorisé au niveau détaillé, les informations effectivement publiées et lisibles dans le fil social.

A20 ajoute une borne de confidentialité supplémentaire. Le snapshot destiné à un ami est limité par l’intersection de trois règles :

1. la politique globale du propriétaire ;
2. l’éventuelle règle propre à l’activité ;
3. la sélection de champs propre à l’ami.

Le niveau `summary` ou `detailed` reste appliqué en plus de cette intersection. Une sélection par ami ne peut donc jamais élargir la politique globale ou celle de l’activité.

## Champs configurables

### Informations communes

- type d’activité ;
- titre ;
- date ;
- heure ;
- durée ;
- intensité ;
- calories.

Le type d’activité et la date restent des métadonnées minimales obligatoires pour qu’une publication soit interprétable.

### Cardio et endurance

- distance ;
- type de séance et terrain ;
- discipline de nage et longueur du bassin ;
- type de vélo et environnement ;
- allure, vitesse et évolution du rythme ;
- dénivelé ;
- fréquence cardiaque et cadence ;
- intervalles, tours, segments et graphique.

### Musculation

- nom de séance ;
- groupes musculaires et nombre d’exercices ;
- exercices et séries ;
- répétitions ;
- charges et poids du corps ;
- temps de repos et RPE ;
- volume.

Les dépendances sont normalisées automatiquement. Par exemple, partager des répétitions implique que les exercices et les séries puissent également être identifiés.

## Données toujours privées

Les notes personnelles, les données de calcul internes, le poids utilisateur, les métadonnées de synchronisation et l’activité brute ne sont jamais proposés dans l’interface et restent interdits par le contrat social.

## Persistance D1

La migration `migrations/0002_social_friend_permission_fields_0_29_0.sql` ajoute :

```sql
field_selection_json TEXT
```

à `social_friend_permissions`.

Les permissions déjà présentes sont initialisées avec l’ensemble des champs historiquement autorisables afin de ne pas modifier rétroactivement leur portée effective. Les politiques globale et propre à l’activité restent toutefois la borne supérieure.

Une nouvelle permission créée avec A20 reçoit la sélection détaillée standard. Lorsqu’un ancien client met à jour une permission sans envoyer `fieldSelection`, le serveur conserve la sélection déjà stockée au lieu de la réélargir.

## Application serveur

### Publication

Le serveur refuse un snapshot dont `allowedFields` dépasse la sélection enregistrée pour le destinataire avec le code :

```text
SOCIAL_ACTIVITY_FIELDS_EXCEEDED
```

### Lecture

Le fil et la route de détail recalculent la sélection effective à chaque lecture. Les anciens snapshots déjà stockés sont donc réduits immédiatement lorsqu’un champ est décoché, sans republier l’activité.

Une valeur JSON absente sur une ligne historique conserve le comportement antérieur. Une valeur corrompue revient à la sélection prudente du résumé.

## Application cliente

- l’éditeur est disponible uniquement lorsque le partage détaillé est accordé à l’ami ;
- la modification est optimiste localement, puis confirmée par D1 ;
- en cas de refus ou d’échec serveur, l’état local précédent est restauré ;
- la publication intersecte la politique résolue avec les champs propres à l’ami avant la projection du snapshot ;
- la sélection est directionnelle : les choix de A vers B n’affectent pas ceux de B vers A.

## Validation attendue

- décocher un champ le retire des nouveaux snapshots publiés ;
- décocher un champ le retire aussi des anciens snapshots au prochain chargement ;
- les réponses HTTP ne contiennent pas les données retirées ;
- le résumé reste limité à son sous-ensemble prudent ;
- une permission détaillée peut rester active même lorsqu’aucun bloc de détail imbriqué n’est autorisé ;
- les notes et l’activité brute ne transitent jamais ;
- le comportement reste distinct dans les deux directions de l’amitié.
