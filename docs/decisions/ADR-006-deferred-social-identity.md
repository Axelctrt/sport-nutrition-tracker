# ADR-006 — Identité sociale différée

- Statut : Accepté
- Date : 2026-07-30

## Contexte

Le dépôt contient un domaine social et une base D1, mais l’identité visible, le
profil local et le compte synchronisé ne doivent pas être confondus. Une
identité sociale élargie accroîtrait les risques de confidentialité,
d’usurpation et de croisement de données.

## Décision

- Ne pas faire de l’identité sociale la source d’identité principale du produit
  sans phase dédiée.
- Conserver l’isolation entre profil local, compte et représentation sociale.
- Tout élargissement social requiert des règles explicites de consentement,
  visibilité, révocation, suppression et modération.
- Les photos de progression et données de santé restent exclues du partage
  social prévu.

## Conséquences

Les fonctions sociales existantes ne valent pas autorisation d’étendre les
données publiées. Les futures interfaces doivent nommer clairement l’espace
actif et éviter les transitions implicites entre identité locale et sociale.
