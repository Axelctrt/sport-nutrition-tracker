export const DEFAULT_DATABASE_NAME = 'sportpilot-local-database';

const ACCOUNT_DATABASE_SUFFIX_PATTERN = /^acct-[0-9a-f]{8}$/i;

export function accountDatabaseNameForFingerprint(
  accountFingerprint: string,
): string {
  const normalized = accountFingerprint.trim().toLowerCase();

  if (!ACCOUNT_DATABASE_SUFFIX_PATTERN.test(normalized)) {
    throw new Error(
      'L’empreinte du compte ne permet pas de créer un espace de données sûr.',
    );
  }

  return `${DEFAULT_DATABASE_NAME}--${normalized}`;
}
