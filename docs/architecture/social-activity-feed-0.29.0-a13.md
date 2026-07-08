# SportPilot 0.29.0 — A13 — Priorité du partage par activité

## Contexte

Lors des premiers essais réels à deux comptes sur le déploiement Preview, une activité explicitement configurée en mode `Résumé` ou `Détaillé` ne produisait aucun snapshot social. La table D1 restait vide et aucune requête `POST /api/social-activity-snapshots/sync` n'était émise.

Le cache local des amis était correct depuis A12. Le blocage provenait du garde-fou historique `activitySharing`, encore évalué après la résolution du nouveau contrat 0.29.

## Cause

Le flux calculait correctement une politique effective à partir de :

1. la politique globale 0.29 ;
2. la surcharge propre à l'activité ou à la séance ;
3. les champs personnalisés sélectionnés.

Mais la portée accordée au destinataire était ensuite recalculée à partir de l'ancien champ `activitySharing`. Lorsque ce champ restait à `disabled`, la publication était annulée même si la surcharge effective valait `summary`, `detailed` ou `custom`.

## Correction

Le garde-fou de partage accepte désormais la visibilité effective déjà résolue par le contrat 0.29.

Ordre appliqué pendant la publication :

1. le profil social privé reste un verrou absolu ;
2. la politique globale et la surcharge par activité sont résolues ;
3. la visibilité effective est transmise au garde-fou par ami ;
4. la permission de l'ami plafonne le résultat à `none`, `summary` ou `detailed` ;
5. l'ancien champ `activitySharing` n'est utilisé qu'en l'absence de visibilité effective fournie.

Ainsi, une activité explicitement partagée n'est plus bloquée par une valeur historique obsolète, sans contourner la confidentialité du profil ni le consentement détaillé de l'ami.

## Garanties

- profil privé toujours bloquant ;
- activité privée toujours non publiée ;
- surcharge résumé autorisée avec permission résumé ;
- surcharge détaillée plafonnée par la permission et le consentement de l'ami ;
- aucun élargissement des champs partagés ;
- aucune modification D1 ou Dexie ;
- aucune donnée privée supplémentaire dans le snapshot ;
- compatibilité maintenue pour les appels historiques qui ne fournissent pas de visibilité effective.

## Validation

Les tests couvrent notamment :

- ancien champ global `disabled` avec surcharge activité `summary` ;
- création effective d'un snapshot dans l'outbox runtime ;
- notification du livreur cloud après création de l'outbox ;
- maintien du verrou absolu lorsque le profil est privé ;
- comportement historique inchangé lorsque la visibilité effective n'est pas fournie.
