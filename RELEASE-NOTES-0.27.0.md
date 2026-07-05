# SportPilot 0.27.0

## Nouveautés

- Ajout d’une identité sociale avec `userId` privé, handle public et nom affiché.
- Ajout de l’identifiant SportPilot visible, copiable et modifiable localement.
- Préparation d’une recherche exacte d’utilisateur par identifiant public.
- Transformation des demandes d’amis vers un flux compatible avec de vrais utilisateurs.
- Ajout des permissions de partage par ami.
- Génération de snapshots sociaux d’activité filtrés.
- Ajout d’un premier fil d’activité amis minimal basé uniquement sur les snapshots filtrés.

## Confidentialité

- Le résumé reste le niveau de partage par défaut.
- Le détail nécessite une permission explicite par ami.
- Les snapshots détaillés sont dégradés en résumé si la permission n’est pas suffisante.
- Le fil d’activité amis ne lit jamais les activités brutes complètes.
- Aucun export d’activité brute n’est disponible.
- Aucun like, commentaire, message, groupe ou classement n’est livré.

## Technique

- Version applicative : `0.27.0`.
- Base Dexie : v10.
- Sauvegarde JSON : v9.
- Registre local des espaces : v1.
- Runtime Dexie Cloud : v10.
- Synchronisation sociale cloud réelle : non activée.

## Sauvegarde et restauration

- Les données sociales locales sont incluses dans la sauvegarde JSON v9.
- La restauration conserve identité sociale, amis, demandes, préférences et permissions par ami.
- Le centre de gestion des données affiche Dexie v10 et JSON v9.

## Contrôles

- Tests identité sociale.
- Tests demandes d’amis réelles préparées.
- Tests permissions par ami.
- Tests snapshots sociaux anti-fuite.
- Tests fil d’activité amis.
- Audits sociaux F1 à F5.
- Audit social release F6.
- Build, check complet et test de stabilité attendus avant publication.
