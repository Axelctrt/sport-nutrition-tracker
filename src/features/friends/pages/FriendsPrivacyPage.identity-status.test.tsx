import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SocialUserLookupGateway } from '@/application/friends/socialIdentityService';
import {
  DEFAULT_FRIENDS_PRIVACY_SETTINGS,
  type FriendsPrivacySnapshot,
} from '@/domain/friends/friendship';
import type { EntityId } from '@/domain/models/common';
import {
  createDefaultSocialIdentity,
  type SocialUserLookupResult,
} from '@/domain/friends/socialIdentity';
import { FriendsPrivacyPage } from '@/features/friends/pages/FriendsPrivacyPage';

const snapshot: FriendsPrivacySnapshot = {
  friends: [],
  requests: [],
  privacy: DEFAULT_FRIENDS_PRIVACY_SETTINGS,
};

const identity = createDefaultSocialIdentity(
  '2026-07-05T10:00:00.000Z',
  'alex123',
);

function renderProfile(lookupGateway: SocialUserLookupGateway) {
  return render(
    <FriendsPrivacyPage
      initialSnapshot={snapshot}
      initialIdentity={identity}
      lookupGateway={lookupGateway}
    />,
  );
}

async function openSocialProfile(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Mon profil social' }));
  return screen.getByLabelText('Identifiant public');
}

async function enterHandle(
  user: ReturnType<typeof userEvent.setup>,
  value: string,
) {
  const input = screen.getByLabelText('Identifiant public');
  await user.clear(input);
  await user.type(input, value);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(350);
  });
  return input;
}

beforeEach(() => {
  window.history.replaceState({}, '', '/#/friends');
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('statut de l’identifiant public', () => {
  it('place le statut sous le champ et avant les actions', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderProfile({ lookupByHandle: vi.fn() });

    const input = await openSocialProfile(user);
    const status = screen.getByRole('status');
    const copyButton = screen.getByRole('button', { name: 'Copier' });
    const saveButton = screen.getByRole('button', { name: 'Enregistrer' });

    expect(status).toHaveAttribute('id', 'social-handle-status');
    expect(status).toHaveAttribute('data-field-status', 'valid');
    expect(status).toHaveTextContent('Identifiant actuel.');
    expect(input).toHaveAttribute('aria-describedby', 'social-handle-status');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(status.compareDocumentPosition(copyButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(status.compareDocumentPosition(saveButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('signale un format incorrect sans dépendre uniquement de la couleur', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderProfile({ lookupByHandle: vi.fn() });
    await openSocialProfile(user);

    const input = await enterHandle(user, '@A');
    const status = screen.getByRole('status');

    expect(status).toHaveAttribute('data-field-status', 'invalid');
    expect(status).toHaveTextContent(/Identifiant invalide/u);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
  });

  it('distingue un identifiant disponible d’un identifiant déjà pris', async () => {
    const lookupByHandle = vi.fn<SocialUserLookupGateway['lookupByHandle']>(
      async (handle) => handle === 'alex.run'
        ? { status: 'notFound' }
        : {
            status: 'found',
            profile: {
              userId: 'social-user:other' as EntityId,
              handle,
              displayName: 'Autre membre',
              createdAt: '2026-07-01T08:00:00.000Z',
              updatedAt: '2026-07-01T08:00:00.000Z',
            },
          },
    );
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderProfile({ lookupByHandle });
    await openSocialProfile(user);

    const availableInput = await enterHandle(user, '@alex.run');
    await act(async () => Promise.resolve());
    expect(screen.getByRole('status')).toHaveAttribute('data-field-status', 'valid');
    expect(screen.getByRole('status')).toHaveTextContent('Identifiant disponible.');
    expect(availableInput).not.toHaveAttribute('aria-invalid');
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeEnabled();

    const takenInput = await enterHandle(user, '@alex.taken');
    await act(async () => Promise.resolve());
    expect(screen.getByRole('status')).toHaveAttribute('data-field-status', 'unavailable');
    expect(screen.getByRole('status')).toHaveTextContent(/déjà pris/u);
    expect(takenInput).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
  });

  it('présente une erreur de vérification distincte d’un identifiant pris', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderProfile({
      lookupByHandle: vi.fn(async () => {
        throw new Error('Service de vérification indisponible.');
      }),
    });
    await openSocialProfile(user);

    const input = await enterHandle(user, '@alex.error');
    await act(async () => Promise.resolve());
    const status = screen.getByRole('status');

    expect(status).toHaveAttribute('data-field-status', 'error');
    expect(status).toHaveTextContent('Service de vérification indisponible.');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
  });

  it('ignore la réponse obsolète d’une ancienne valeur', async () => {
    const pending = new Map<
      string,
      (result: SocialUserLookupResult) => void
    >();
    const lookupByHandle: SocialUserLookupGateway['lookupByHandle'] = vi.fn(
      (handle) => new Promise((resolve) => pending.set(handle, resolve)),
    );
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderProfile({ lookupByHandle });
    await openSocialProfile(user);

    await enterHandle(user, '@first.handle');
    expect(pending.has('first.handle')).toBe(true);

    await enterHandle(user, '@second.handle');
    expect(pending.has('second.handle')).toBe(true);

    await act(async () => {
      pending.get('second.handle')?.({ status: 'notFound' });
      await Promise.resolve();
    });
    expect(screen.getByRole('status')).toHaveTextContent('Identifiant disponible.');

    await act(async () => {
      pending.get('first.handle')?.({
        status: 'found',
        profile: {
          userId: 'social-user:first' as EntityId,
          handle: 'first.handle',
          displayName: 'Ancienne réponse',
          createdAt: '2026-07-01T08:00:00.000Z',
          updatedAt: '2026-07-01T08:00:00.000Z',
        },
      });
      await Promise.resolve();
    });

    expect(screen.getByLabelText('Identifiant public')).toHaveValue('@second.handle');
    expect(screen.getByRole('status')).toHaveAttribute('data-field-status', 'valid');
    expect(screen.getByRole('status')).toHaveTextContent('Identifiant disponible.');
  });
});
