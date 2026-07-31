# Fonctionnalités et chantiers planifiés

## Planifié — Phase 2 : audit ciblé

Produire un rapport vérifiable sur l’architecture, les données, la
synchronisation, la PWA, les parcours mobiles, Performance Glass et les risques
de régression. Cette phase ne modifie aucun fichier. Elle exige l’intégration
préalable de la Phase 1 et une autorisation explicite.

## Planifié sous condition — Phase 3 : fondations UX partagées

À cadrer d’après l’audit accepté :

- consolider les primitives et tokens partagés avant les adaptations locales ;
- réduire les divergences entre parcours comparables ;
- préserver mobile, clavier, safe areas, mouvement réduit et thèmes ;
- mesurer l’impact bundle et rendu.

Les références externes restent des inspirations selon
[`../product/UX_REFERENCES.md`](../product/UX_REFERENCES.md).

## Planifié sous condition — Phase 4 : photos de progression locales

Le périmètre prévu est strict :

- photos privées, locales et associées au bon espace de données ;
- consentement, suppression et export compréhensibles ;
- absence de publication sociale ;
- absence de synchronisation d’image cloud ;
- absence d’analyse corporelle ou d’extension IA.

Le stockage, les quotas, la sauvegarde et la restauration devront être spécifiés
et testés avant toute implémentation.

## Idée à étudier — Phase 5 : déploiement contrôlé

Une activation progressive pourra être envisagée après validation réelle des
critères fonctionnels, de données, de performance et d’accessibilité. Le
mécanisme et les métriques ne sont pas encore décidés.

## Hors périmètre et abandonné pour cette séquence

- **Abandonné pour cette séquence** : photos de progression sociales.
- **Abandonné pour cette séquence** : stockage cloud des photos de progression.
- **Abandonné pour cette séquence** : estimation IA ou automatique de la
  composition corporelle.
- **Hors périmètre** : modification des formules caloriques.
- **Hors périmètre** : changement de fournisseur de synchronisation ou
  d’identité.

Une idée abandonnée ici ne peut revenir que par une décision explicite et une
mise à jour de la roadmap.
