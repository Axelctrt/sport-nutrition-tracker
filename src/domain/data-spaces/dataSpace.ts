export const DATA_SPACE_REGISTRY_VERSION = 1 as const;
export const GUEST_DATA_SPACE_ID = 'guest' as const;

export type DataSpaceKind = 'guest' | 'account';
export type DataSpaceId = typeof GUEST_DATA_SPACE_ID | `account:${string}`;

export interface DataSpaceDescriptor {
  readonly id: DataSpaceId;
  readonly kind: DataSpaceKind;
  readonly databaseName: string;
  readonly label: string;
  readonly accountFingerprint?: string;
  readonly linkedToCurrentDevice?: boolean;
  readonly createdAt: string;
  readonly lastActivatedAt: string;
}

export interface DataSpaceRegistry {
  readonly version: typeof DATA_SPACE_REGISTRY_VERSION;
  readonly activeSpaceId: DataSpaceId;
  readonly spaces: readonly DataSpaceDescriptor[];
}

export function accountDataSpaceId(
  accountFingerprint: string,
): DataSpaceId {
  return `account:${accountFingerprint.toLowerCase()}`;
}

export function isAccountDataSpace(
  space: DataSpaceDescriptor,
): boolean {
  return space.kind === 'account';
}
