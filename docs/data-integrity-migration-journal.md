# Contrôle d’intégrité et journal des migrations

La version 3 du schéma Dexie ajoute deux tables internes :

- `migrationJournal` conserve une entrée idempotente pour la version installée ;
- `databaseDiagnostics` conserve uniquement le dernier rapport d’intégrité.

Le contrôle est non destructif. Il vérifie la version du schéma, la présence et
la lecture des tables attendues, le journal de migration et les tables
inattendues. Il ne supprime, ne réinitialise et ne répare aucune donnée.

Les sauvegardes fonctionnelles restent limitées aux tables métier déjà
explicitement exportées. Les deux tables internes sont régénérables et ne sont
pas ajoutées aux sauvegardes utilisateur.
