/**
 * Numéros de versions Dexie publiés.
 *
 * Une constante historique ne doit jamais être modifiée après publication.
 * Une nouvelle évolution du schéma doit ajouter une nouvelle constante et un
 * nouveau fichier de migration sans réutiliser CURRENT_DATABASE_VERSION dans
 * une migration antérieure.
 */
export const DATABASE_VERSION_1 = 1 as const;
export const DATABASE_VERSION_2 = 2 as const;
export const DATABASE_VERSION_3 = 3 as const;

export const CURRENT_DATABASE_VERSION = DATABASE_VERSION_3;
