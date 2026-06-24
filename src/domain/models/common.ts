export type EntityId = string;
export type LocalDate = string;
export type LocalTime = string;
export type IsoDateTime = string;

export interface EntityMetadata {
  id: EntityId;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface DatedEntity extends EntityMetadata {
  date: LocalDate;
}

export type NewEntity<T extends EntityMetadata> = Omit<T, keyof EntityMetadata>;
export type EntityChanges<T extends EntityMetadata> = Partial<Omit<T, keyof EntityMetadata>>;
