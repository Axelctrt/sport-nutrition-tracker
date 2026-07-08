# SportPilot 0.29.0 — A24 Sécurité et confidentialité sociales

## Objectif

Appliquer une autorisation serveur uniforme à toutes les routes sociales afin
qu'aucune donnée ne soit lue ou modifiée sur la seule base d'un identifiant
fourni par le navigateur.

## Authentification

Toutes les familles d'API sociales exigent désormais le jeton Bearer du compte
Dexie Cloud actif :

- annuaire et réservation du handle ;
- demandes d'amis ;
- amitiés et permissions ;
- fil, détail et publication des activités ;
- réconciliation de l'identité canonique.

Le serveur valide le jeton auprès de Dexie Cloud avant d'utiliser son sujet
`sub` comme identité canonique de l'appelant.

## Autorisation par acteur

Les identifiants présents dans les query strings ou les corps JSON ne font plus
autorité. Ils doivent correspondre au sujet authentifié :

- un compte ne peut réserver un handle pour un tiers ;
- un compte ne peut lister les demandes, amitiés ou permissions d'un tiers ;
- une permission ne peut être enregistrée que par son propriétaire ;
- une suppression d'ami ne peut être déclenchée que par un membre de la relation.

Pour les demandes d'amis, seul le destinataire peut accepter ou refuser et seul
l'expéditeur peut annuler.

## Intégrité des relations

Les identifiants de permission et d'amitié sont recalculés côté serveur et
comparés à la valeur reçue. Une valeur forgée est rejetée avant toute écriture.
Le handle d'un ami est relu depuis l'annuaire lorsque disponible, et les dates de
consentement ou de réponse sont produites par le serveur.

## Confidentialité des réponses

Les routes d'activité conservent le filtrage A18–A22 : amitié active,
permission courante et sélection des champs sont vérifiées avant chaque réponse.
Les erreurs inattendues ne renvoient plus le détail interne des exceptions.
Les handles de secours ne sont plus dérivés des identifiants canoniques, ce qui
évite d'afficher accidentellement une adresse électronique dans l'interface.

Les identifiants canoniques restent transportés uniquement lorsque le client
authentifié en a besoin pour adresser une relation, une demande ou une
permission. Ils ne sont pas utilisés comme libellés visibles.

## Durcissement des entrées et du transport

- limites explicites de taille sur les corps JSON sociaux ;
- normalisation Unicode et retrait des caractères de contrôle dans les noms ;
- `Cache-Control: no-store` sur les appels et réponses sensibles ;
- `X-Content-Type-Options: nosniff` ;
- `Referrer-Policy: no-referrer` ;
- autorisation explicite de l'en-tête `Authorization` pour les prévols CORS.

## Réconciliation des anciennes identités

Un identifiant local historique n'est migré que lorsqu'une preuve directe le
relie au compte authentifié : identité privée correspondante ou propriété
exacte du handle dans l'annuaire. La propriété d'une autre réservation privée
ne suffit plus à reprendre un identifiant arbitraire.

## Migrations

- D1 : aucune.
- Dexie : aucune.
