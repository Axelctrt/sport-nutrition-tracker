# Centre de gestion des données

Cette évolution regroupe dans les paramètres avancés les principaux outils liés aux données locales :

- état de la persistance du stockage ;
- date de la dernière sauvegarde ;
- versions du schéma Dexie et du format JSON ;
- accès à la sauvegarde et à la restauration ;
- contrôle non destructif de l’intégrité ;
- réinitialisation sélective des données de test ;
- accès aux informations de confidentialité et de stockage local.

Le centre ne modifie aucune donnée à son ouverture. Les suppressions restent protégées par le dialogue de confirmation de la réinitialisation sélective.

## Compatibilité

- schéma Dexie : version 3 inchangée ;
- sauvegarde JSON : version 2 inchangée ;
- aucune nouvelle table ;
- aucune migration ;
- aucune dépendance npm supplémentaire.
