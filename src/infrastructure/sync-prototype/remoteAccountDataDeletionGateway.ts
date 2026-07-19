interface RemoteAccountCredentials {
  readonly userId: string;
  readonly accessToken: string;
}

export interface RemoteSocialDataDeletionResult {
  readonly deletedSocialRecords: number;
}

export interface RemoteAccountDataDeletionGatewayOptions {
  readonly endpoint?: string;
  readonly fetcher?: typeof fetch;
}

export async function deleteRemoteSocialAccountData(
  credentials: RemoteAccountCredentials,
  options: RemoteAccountDataDeletionGatewayOptions = {},
): Promise<RemoteSocialDataDeletionResult> {
  const fetcher = options.fetcher ?? globalThis.fetch?.bind(globalThis);
  if (!fetcher) {
    throw new Error('Le service de suppression distante est indisponible.');
  }
  const response = await fetcher(
    options.endpoint?.trim() || '/api/account-data',
    {
      method: 'DELETE',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${credentials.accessToken}`,
      },
    },
  );
  const payload = await response.json().catch(() => ({})) as {
    readonly message?: unknown;
    readonly deletedSocialRecords?: unknown;
  };
  if (!response.ok) {
    throw new Error(
      typeof payload.message === 'string'
        ? payload.message
        : 'Les données sociales distantes n’ont pas pu être supprimées.',
    );
  }
  return {
    deletedSocialRecords: Number.isSafeInteger(payload.deletedSocialRecords)
      ? Number(payload.deletedSocialRecords)
      : 0,
  };
}
