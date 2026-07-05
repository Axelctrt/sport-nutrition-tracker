# SportPilot 0.27.0 F4 — Snapshots sociaux d’activité

## Objectif

F4 transforme une activité privée en snapshot social filtré. Cette phase ne livre pas un fil d’activité, ne crée pas de backend social réel et ne publie aucune donnée automatiquement.

## Règle produit

- Le résumé est le niveau par défaut.
- Le détail est généré uniquement pour un ami dont la permission locale est `detailed` avec consentement explicite.
- Si le détail est demandé sans permission, le résultat est dégradé en résumé.
- Si le partage global est désactivé ou que le profil est privé, aucun snapshot n’est créé.

## Champs exposés

Un snapshot résumé peut contenir :

- identifiant du snapshot ;
- identifiant de l’activité source ;
- identifiant stable de l’ami destinataire ;
- handle de l’ami ;
- type d’activité ;
- date ;
- durée ;
- intensité ;
- calories estimées agrégées ;
- métriques sportives synthétiques comme distance ou dénivelé.

Un snapshot détaillé peut ajouter seulement des champs structurés non libres, par exemple :

- type de séance ;
- terrain ;
- nage principale ;
- longueur de bassin ;
- type de vélo ;
- environnement indoor/outdoor.

## Champs interdits

Aucun export brut d’activité n’est autorisé. Les snapshots ne doivent pas contenir :

- notes libres ;
- horaire précis ;
- RPE historique ;
- calories manuelles comme champ source ;
- objet de calcul interne ;
- poids utilisé par le calcul ;
- coefficient de calcul ;
- cadence ;
- détails d’intervalles libres.

## Limites de phase

F4 n’est pas un fil d’activité. Elle ne livre pas :

- affichage chronologique des activités des amis ;
- réactions sociales ;
- commentaires ;
- messagerie ;
- groupes ;
- classements ;
- découverte publique ;
- synchronisation cloud réelle.

## Préparation F5

Le service applicatif `prepareSocialActivitySnapshots` retourne une collection de snapshots filtrés et une collection de blocages. F5 pourra consommer ces sorties pour construire un premier fil d’activité amis, sans jamais dépendre des activités brutes.
