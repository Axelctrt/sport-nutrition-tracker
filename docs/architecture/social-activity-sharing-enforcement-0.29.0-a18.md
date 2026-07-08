# SportPilot 0.29.0 — A18

## Objectif

Garantir que les niveaux de partage `summary` et `detailed` sont appliqués à la source, au stockage et à chaque lecture serveur du fil social.

## Règles effectives

- un snapshot `summary` ne peut contenir ni bloc `detail`, ni champ détaillé dans `allowedFields` ;
- une permission ami `summary` réduit immédiatement tout snapshot détaillé déjà stocké à un résumé prudent lors de la lecture ;
- la réduction retire l'heure précise, les calories, le rythme, la vitesse, le dénivelé, le volume, les exercices, les séries, les répétitions et les charges ;
- une permission `detailed` avec consentement `granted` conserve le détail autorisé par le propriétaire ;
- les cartes du fil ne contiennent jamais le bloc `detail` ;
- la route de détail applique la même permission courante que le fil ;
- un snapshot D1 invalide ou incohérent n'est jamais renvoyé ;
- la republication locale n'est déclenchée qu'après confirmation D1 d'un changement de permission ami.

## Effet d'une baisse de permission

Lorsqu'un propriétaire passe un ami de `detailed` à `summary`, le serveur n'attend pas la republication locale pour protéger les données : les snapshots détaillés déjà présents sont immédiatement présentés sous forme de résumé filtré.

## Données et migrations

Aucune migration Dexie ou D1 n'est requise.
