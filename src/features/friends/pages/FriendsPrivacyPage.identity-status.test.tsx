import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
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

async function replaceHandle(
  user: ReturnType<typeof userEvent.setup>,
  value: string,
) {
  const input = screen.getByLabelText('Identifiant public');
  await user.clear(input);
  await user.type(input, value);
  return input;
}

beforeEach(() => {
  window.history.replaceState({}, '', '/#/friends');
});

afterEach(cleanup);

describe('statut de l’identifiant public', () => {
  it('place le statut sous le champ et avant les actions', async () => {
    const user = userEvent.setup();
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
    const user = userEvent.setup();
    renderProfile({ lookupByHandle: vi.fn() });
    await openSocialProfile(user);

    const input = await replaceHandle(user, '@A');
    const alert = screen.getByRole('alert');

    expect(alert).toHaveAttribute('data-field-status', 'invalid');
    expect(alert).toHaveTextContent(/Identifiant invalide/u);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
  });

  it('distingue un identifiant disponible d’un identifiant déjà pris', async () => {
    const lookupByHandle: SocialUserLookupGateway['lookupByHandle'] = vi.fn(
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
    const user = userEvent.setup();
    renderProfile({ lookupByHandle });
    await openSocialProfile(user);

    const availableInput = await replaceHandle(user, '@alex.run');
    expect(await screen.findByText('Identifiant disponible.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('data-field-status', 'valid');
    expect(availableInput).not.toHaveAttribute('aria-invalid');
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeEnabled();

    const takenInput = await replaceHandle(user, '@alex.taken');
    const unavailable = await screen.findByText(/déjà pris/u);
    expect(unavailable.closest('[data-field-status]')).toHaveAttribute('data-field-status', 'unavailable');
    expect(takenInput).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
  });

  it('présente une erreur de vérification distincte d’un identifiant pris', async () => {
    const user = userEvent.setup();
    renderProfile({
      lookupByHandle: vi.fn(async () => {
        throw new Error('Service de vérification indisponible.');
      }),
    });
    await openSocialProfile(user);

    const input = await replaceHandle(user, '@alex.error');
    const error = await screen.findByText('Service de vérification indisponible.');

    expect(error.closest('[data-field-status]')).toHaveAttribute('data-field-status', 'error');
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
    const user = userEvent.setup();
    renderProfile({ lookupByHandle });
    await openSocialProfile(user);

    await replaceHandle(user, '@first.handle');
    await waitFor(() => expect(pending.has('first.handle')).toBe(true));

    await replaceHandle(user, '@second.handle');
    await waitFor(() => expect(pending.has('second.handle')).toBe(true));

    await act(async () => {
      pending.get('second.handle')?.({ status: 'notFound' });
      await Promise.resolve();
    });
    expect(await screen.findByText('Identifiant disponible.')).toBeInTheDocument();

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
