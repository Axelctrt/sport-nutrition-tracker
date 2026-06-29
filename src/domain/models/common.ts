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

type PatchChanges<T> = {
  [K in keyof T as {} extends Pick<T, K> ? never : K]?: T[K];
} & {
  [K in keyof T as {} extends Pick<T, K> ? K : never]?: T[K] | undefined;
};

export type EntityChanges<T extends EntityMetadata> = PatchChanges<
  Omit<T, keyof EntityMetadata>
>;
