# SportPilot 0.30.0 — U4 : identité sociale obligatoire

## Objectif

U4 impose une identité sociale publique aux espaces de compte avant l’accès à l’application. Le mode local reste entièrement utilisable sans compte ni pseudonyme public.

## Parcours d’un compte connecté

1. `DataSpaceAccountGate` résout d’abord l’espace de données du compte.
2. `SocialIdentityAccountGate` recherche ensuite une identité locale canonique.
3. Si nécessaire, l’identité déjà réservée dans l’annuaire cloud est restaurée sur l’appareil.
4. Une ancienne identité personnalisée est réconciliée vers l’identifiant technique du compte.
5. Une identité absente ou générée automatiquement ouvre l’écran de création obligatoire.
6. Le pseudonyme est réservé dans l’annuaire avant toute sauvegarde locale.
7. L’application devient accessible uniquement après confirmation de la réservation.

## Règles du pseudonyme

- 3 à 24 caractères ;
- minuscules uniquement après normalisation ;
- premier caractère alphanumérique ;
- caractères suivants : lettres, chiffres, point, tiret et underscore ;
- mots réservés interdits ;
- unicité contrôlée par l’annuaire social serveur.

Le nom d’affichage public reste facultatif. Le prénom réel du profil, le poids, les repas et les entraînements ne sont jamais utilisés automatiquement comme identité publique.

## Réservation atomique

Lors d’une création ou d’un changement de pseudonyme :

1. le nouveau pseudonyme est revendiqué dans D1 ;
2. le propriétaire est relu et vérifié ;
3. les anciennes réservations du même compte ne sont supprimées qu’après confirmation du nouveau pseudonyme ;
4. en cas de concurrence, le perdant conserve son ancienne identité et ses données locales ne sont pas modifiées.

Le client suit la même règle : publication cloud d’abord, persistance locale ensuite.

## Compatibilité et mode hors ligne

- Un compte dont l’identité canonique est déjà confirmée peut continuer hors ligne.
- Une identité cloud existante est restaurée sur un nouvel appareil dès que le réseau est disponible.
- Un compte incomplet reste bloqué hors ligne, avec possibilité de réessayer ou de revenir au mode local.
- Le mode local contourne entièrement le garde d’identité sociale.
- Les amis, demandes, permissions et partages existants continuent d’utiliser l’identifiant social canonique.

## Protection des données

- L’adresse email et le code OTP ne sont pas affichés publiquement.
- Le prénom du profil n’est jamais prérempli dans le nom social.
- Seuls le pseudonyme, le nom d’affichage public facultatif et l’identifiant technique du compte sont transmis à l’annuaire social.
- Aucun pseudonyme concurrent ne peut écraser une identité locale confirmée.

## Compatibilité technique

- Aucune migration Dexie.
- Aucune nouvelle migration D1.
- Aucun changement de table.
- Les contrats sociaux existants sont réutilisés.
- Les règles de validation sont alignées entre domaine, client cloud et serveur D1.
