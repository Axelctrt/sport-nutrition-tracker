import type { SyncPrototypeInteractionSnapshot } from '@/infrastructure/sync-prototype/syncPrototypeClient';
import {
  createEmptyWeightDraft,
  interactionError,
  interactionMessage,
  maskEmail,
  syncPhaseLabels,
  syncStatusLabels,
} from './syncPrototypePresentation';

function interaction(
  messageCode: string,
  message = 'Message Dexie Cloud',
): SyncPrototypeInteractionSnapshot {
  return {
    type: 'otp',
    title: 'Connexion',
    alerts: [{ type: 'error', messageCode, message, messageParams: {} }],
    fields: {},
  } as unknown as SyncPrototypeInteractionSnapshot;
}

describe('syncPrototypePresentation', () => {
  it('masque seulement la partie locale de l’adresse email', () => {
    expect(maskEmail('alex@example.com')).toBe('al***@example.com');
    expect(maskEmail('a@example.com')).toBe('a***@example.com');
    expect(maskEmail('adresse-invalide')).toBe('adresse-invalide');
  });

  it('traduit les erreurs d’interaction connues', () => {
    expect(interactionError(interaction('INVALID_EMAIL'))).toBe(
      'Cette adresse email n’est pas valide.',
    );
    expect(interactionError(interaction('INVALID_OTP'))).toBe(
      'Le code saisi est incorrect ou a expiré.',
    );
    expect(interactionError(interaction('LICENSE_LIMIT_REACHED'))).toContain(
      'limite de comptes',
    );
  });

  it('conserve le message fourni pour une erreur non référencée', () => {
    const snapshot = interaction('UNKNOWN', 'Erreur distante détaillée');
    expect(interactionError(snapshot)).toBe('Erreur distante détaillée');
    expect(interactionMessage(snapshot)).toBe('Erreur distante détaillée');
  });

  it('centralise les libellés de synchronisation et le brouillon initial', () => {
    expect(syncStatusLabels.connected).toBe('Connectée');
    expect(syncPhaseLabels['in-sync']).toBe('À jour');
    expect(createEmptyWeightDraft()).toMatchObject({
      weightKg: '',
      note: '',
    });
    expect(createEmptyWeightDraft().date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
