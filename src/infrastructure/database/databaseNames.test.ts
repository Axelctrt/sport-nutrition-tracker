import {
  DEFAULT_DATABASE_NAME,
  accountDatabaseNameForFingerprint,
} from '@/infrastructure/database/databaseNames';

describe('databaseNames', () => {
  it('conserve le nom historique pour l’espace invité', () => {
    expect(DEFAULT_DATABASE_NAME).toBe('sportpilot-local-database');
  });

  it('produit un nom de base distinct et stable pour un compte', () => {
    expect(accountDatabaseNameForFingerprint(' acct-A1B2C3D4 ')).toBe(
      'sportpilot-local-database--acct-a1b2c3d4',
    );
  });

  it('accepte les nouvelles empreintes de compte sur 128 bits', () => {
    expect(
      accountDatabaseNameForFingerprint(
        'acct-00112233445566778899AABBCCDDEEFF',
      ),
    ).toBe(
      'sportpilot-local-database--acct-00112233445566778899aabbccddeeff',
    );
  });

  it('refuse une valeur qui pourrait exposer un identifiant brut', () => {
    expect(() =>
      accountDatabaseNameForFingerprint('personne@example.com'),
    ).toThrow('empreinte du compte');
  });
});
