# SportPilot 0.30.0 — U2B.2 Nouveau socle énergétique

## Périmètre

Cette phase applique les décisions validées après l’audit U2A :

- les nouvelles activités fondées sur un MET utilisent une dépense nette ;
- la part correspondant au repos est retirée avant l’ajout au socle quotidien ;
- les nouvelles estimations utilisent le poids de référence hebdomadaire introduit en U2B.1 ;
- le signe de la variation hebdomadaire est rendu cohérent avec l’objectif du profil ;
- les anciens snapshots d’activité restent inchangés ;
- les activités planifiées et la réconciliation prévu/réalisé restent hors de cette phase.

## Formule MET nette

Les snapshots v1 utilisaient :

```text
calories brutes = durée × MET × 3,5 × poids / 200
```

Les nouveaux snapshots v2 utilisent :

```text
calories nettes = durée × max(0, MET − 1) × 3,5 × poids / 200
```

Le retrait de `1 MET` évite de recompter la dépense de repos déjà intégrée dans le métabolisme et le socle quotidien.

## Course

La course conserve la formule validée :

```text
poids × distance × coefficient kcal/kg/km
```

La valeur ne change pas dans U2B.2, mais les nouveaux snapshots de course passent également en version 2 et utilisent le poids de référence hebdomadaire.

## Poids utilisé pour une nouvelle activité

Pour la date de l’activité :

1. SportPilot calcule la semaine civile précédente ;
2. il retient une pesée représentative par jour ;
3. il calcule la moyenne de ces journées ;
4. en l’absence de pesée, il utilise le poids initial du profil.

Le formulaire d’activité affiche la valeur et sa source avant l’enregistrement.

## Compatibilité historique

- Un snapshot d’activité v1 conserve sa valeur enregistrée.
- Aucun recalcul automatique des anciennes activités n’est effectué.
- Une correction manuelle continue de remplacer l’estimation automatique.
- Lorsqu’une ancienne activité est explicitement modifiée puis enregistrée, elle reçoit un nouveau snapshot v2 avec les règles actuelles.
- Aucune migration Dexie ou D1 n’est nécessaire.

## Cohérence objectif / variation

Le moteur applique une normalisation défensive :

- perte : variation négative ;
- maintien : variation nulle ;
- prise : variation positive.

La magnitude enregistrée est conservée. Le moteur ne choisit pas une nouvelle vitesse de variation. Cette protection couvre les anciennes données, imports ou synchronisations qui auraient contourné la validation du formulaire.

## Versionnement

```text
ACTIVITY_CALCULATION_VERSION = 2
DAILY_TARGET_CALCULATION_VERSION = 3
```

Le passage de la cible quotidienne en version 3 documente l’utilisation du nouveau socle et la normalisation de la variation. Les journées passées ne sont pas réécrites automatiquement.

## Limites volontaires

Cette phase ne couvre pas encore :

- l’anticipation des activités planifiées ;
- le lien entre activité prévue et activité réalisée ;
- les activités annulées ou imprévues ;
- la synchronisation du planning ;
- le recalcul global de l’historique.

Ces travaux appartiennent aux phases U2B.3 et suivantes.
