import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

import type {
  SocialIdentityRepository,
  SocialUserLookupGateway,
} from '@/application/friends/socialIdentityService';
import {
  DEFAULT_FRIENDS_PRIVACY_SETTINGS,
  type FriendsPrivacySnapshot,
} from '@/domain/friends/friendship';
import type { SocialCloudIdentityPort } from '@/domain/friends/socialCloudContract';
import type { EntityId } from '@/domain/models/common';
import {
  createDefaultSocialIdentity,
  type SocialUserLookupResult,
} from '@/domain/friends/socialIdentity';
import { FriendsPrivacyPage } from '@/features/friends/pages/FriendsPrivacyPage';
import { ToastProvider } from '@/shared/toast/ToastProvider';

const snapshot: FriendsPrivacySnapshot = {
  friends: [],
  requests: [],
  privacy: DEFAULT_FRIENDS_PRIVACY_SETTINGS,
};

const identity = createDefaultSocialIdentity(
  '2026-07-05T10:00:00.000Z',
  'alex123',
);

function renderProfile(
  lookupGateway: SocialUserLookupGateway,
  identityRepository?: SocialIdentityRepository,
  cloudIdentityPort?: SocialCloudIdentityPort,
) {
  const page = (
    <ToastProvider>
      <FriendsPrivacyPage
        initialSnapshot={snapshot}
        initialIdentity={identity}
        lookupGateway={lookupGateway}
        {...(identityRepository ? { identityRepository } : {})}
        {...(cloudIdentityPort ? { cloudIdentityPort } : {})}
      />
    </ToastProvider>
  );

  return render(
    <RouterProvider
      router={createMemoryRouter(
        [{ path: '*', element: page }],
        { initialEntries: ['/friends'] },
      )}
    />,
  );
}

async function openSocialProfileSection(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Mon profil social' }));
  return screen.getByLabelText('Profil social');
}

async function openSocialProfile(user: ReturnType<typeof userEvent.setup>) {
  await openSocialProfileSection(user);
  await user.click(screen.getByRole('button', { name: 'Modifier le profil public' }));
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
  it('affiche la carte sociale en lecture seule avec Modifier et sans Enregistrer', async () => {
    const user = userEvent.setup();
    renderProfile({ lookupByHandle: vi.fn() });

    const card = await openSocialProfileSection(user);
    const editButton = screen.getByRole('button', { name: 'Modifier le profil public' });

    expect(card).toContainElement(editButton);
    expect(editButton).toHaveTextContent('Modifier');
    expect(editButton.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('@sp-alex123')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByLabelText('Identifiant public')).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Enregistrer' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Annuler' })).not.toBeInTheDocument();
  });

  it('place l’icône Copier avec le champ, puis le statut et l’action principale', async () => {
    const user = userEvent.setup();
    renderProfile({ lookupByHandle: vi.fn() });

    const input = await openSocialProfile(user);
    const status = screen.getByRole('status');
    const copyButton = screen.getByRole('button', { name: 'Copier l’identifiant public' });
    const saveButton = screen.getByRole('button', { name: 'Enregistrer' });
    const controlRow = input.parentElement;

    expect(controlRow).toContainElement(copyButton);
    expect(copyButton).toHaveClass('size-11', 'shrink-0', 'p-0');
    expect(copyButton).not.toHaveTextContent('Copier');
    expect(copyButton.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(status).toHaveAttribute('id', 'social-handle-status');
    expect(status).toHaveAttribute('data-field-status', 'valid');
    expect(status).toHaveTextContent('Identifiant actuel.');
    expect(status.querySelector('[data-field-status-icon="valid"]')).toHaveAttribute('aria-hidden', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'social-handle-status');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect((controlRow?.compareDocumentPosition(status) ?? 0) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(status.compareDocumentPosition(saveButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(saveButton.closest('[data-bottom-sheet-footer]')).not.toBeNull();
  });

  it('signale un format incorrect avec texte, croix ronde et aria-invalid', async () => {
    const user = userEvent.setup();
    renderProfile({ lookupByHandle: vi.fn() });
    await openSocialProfile(user);

    const input = await replaceHandle(user, '@A');
    const alert = screen.getByRole('alert');

    expect(alert).toHaveAttribute('data-field-status', 'invalid');
    expect(alert).toHaveTextContent(/Identifiant invalide/u);
    expect(alert.querySelector('[data-field-status-icon="invalid"]')).toHaveAttribute('aria-hidden', 'true');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
  });

  it('distingue un identifiant disponible d’un identifiant déjà pris', async () => {
    const lookupByHandle = vi.fn<SocialUserLookupGateway['lookupByHandle']>(
      async (handle): Promise<SocialUserLookupResult> => handle === 'alex.run'
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
    const available = await screen.findByText('Identifiant disponible.');
    expect(available.closest('[data-field-status]')).toHaveAttribute('data-field-status', 'valid');
    expect(available.closest('[data-field-status]')?.querySelector('[data-field-status-icon="valid"]')).toBeInTheDocument();
    expect(availableInput).not.toHaveAttribute('aria-invalid');
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeEnabled();

    const takenInput = await replaceHandle(user, '@alex.taken');
    const unavailable = await screen.findByText(/déjà pris/u);
    expect(unavailable.closest('[data-field-status]')).toHaveAttribute('data-field-status', 'unavailable');
    expect(unavailable.closest('[data-field-status]')?.querySelector('[data-field-status-icon="unavailable"]')).toBeInTheDocument();
    expect(takenInput).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
  });

  it('affiche un spinner pendant la vérification', async () => {
    const pending = new Promise<SocialUserLookupResult>(() => undefined);
    const user = userEvent.setup();
    renderProfile({ lookupByHandle: vi.fn(() => pending) });
    await openSocialProfile(user);

    await replaceHandle(user, '@alex.pending');

    await waitFor(() => {
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('data-field-status', 'checking');
      expect(status.querySelector('[data-field-status-icon="checking"]')).toHaveClass('animate-spin');
    });
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
    const errorStatus = error.closest('[data-field-status]');

    expect(errorStatus).toHaveAttribute('data-field-status', 'error');
    expect(errorStatus?.querySelector('[data-field-status-icon="error"]')).toHaveAttribute('aria-hidden', 'true');
    expect(errorStatus).toHaveClass('text-amber-800', 'dark:text-amber-200');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
  });

  it('copie l’identifiant depuis l’icône et utilise un toast temporaire unique', async () => {
    const user = userEvent.setup();
    const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    try {
      renderProfile({ lookupByHandle: vi.fn() });
      await openSocialProfile(user);

      await user.click(screen.getByRole('button', { name: 'Copier l’identifiant public' }));

      expect(writeText).toHaveBeenCalledWith('@sp-alex123');
      expect(await screen.findByText('Identifiant copié.')).toBeInTheDocument();
      expect(screen.getAllByText('Identifiant copié.')).toHaveLength(1);
      expect(screen.queryByText('Profil à vérifier')).not.toBeInTheDocument();
    } finally {
      if (clipboardDescriptor) {
        Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
      } else {
        Reflect.deleteProperty(navigator, 'clipboard');
      }
    }
  });

  it('affiche un seul toast après une sauvegarde locale réussie et bloque les doubles soumissions', async () => {
    let resolveSave: (() => void) | undefined;
    const saveIdentity = vi.fn(() => new Promise<void>((resolve) => {
      resolveSave = resolve;
    }));
    const repository: SocialIdentityRepository = {
      readIdentity: vi.fn().mockResolvedValue(identity),
      saveIdentity,
    };
    const user = userEvent.setup();
    renderProfile({ lookupByHandle: vi.fn() }, repository);
    await openSocialProfile(user);

    const displayName = screen.getByLabelText('Nom affiché');
    await user.clear(displayName);
    await user.type(displayName, 'Alex Mobile');
    const saveButton = screen.getByRole('button', { name: 'Enregistrer' });
    await user.click(saveButton);
    await user.click(saveButton);

    expect(saveIdentity).toHaveBeenCalledOnce();
    expect(saveButton).toBeDisabled();
    await act(async () => {
      resolveSave?.();
      await Promise.resolve();
    });

    expect(await screen.findByText('Profil mis à jour')).toBeInTheDocument();
    expect(screen.getAllByText('Profil mis à jour')).toHaveLength(1);
    expect(screen.queryByText('Profil à vérifier')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryByLabelText('Identifiant public')).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Enregistrer' })).not.toBeInTheDocument();
    expect(screen.queryByText('Action prise en compte')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Modifier le profil public' })).toHaveFocus());
  });

  it('annule les changements, ferme la surface et restaure le focus', async () => {
    const user = userEvent.setup();
    renderProfile({ lookupByHandle: vi.fn() });
    await openSocialProfile(user);

    const displayName = screen.getByLabelText('Nom affiché');
    await user.clear(displayName);
    await user.type(displayName, 'Modification abandonnée');
    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    const dialog = screen.getByRole('alertdialog', { name: 'Annuler les modifications ?' });
    expect(dialog).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuer la modification' }));
    expect(screen.getByLabelText('Nom affiché')).toHaveValue('Modification abandonnée');

    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    await user.click(screen.getByRole('button', { name: 'Abandonner les modifications' }));

    await waitFor(() => expect(screen.queryByLabelText('Identifiant public')).not.toBeInTheDocument());
    expect(screen.getByText(identity.displayName || 'Non renseigné')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Modifier le profil public' })).toHaveFocus());
  });

  it('conserve une erreur locale et n’affiche aucun succès lorsque la sauvegarde échoue', async () => {
    const repository: SocialIdentityRepository = {
      readIdentity: vi.fn().mockResolvedValue(identity),
      saveIdentity: vi.fn().mockRejectedValue(new Error('Stockage local indisponible.')),
    };
    const user = userEvent.setup();
    renderProfile({ lookupByHandle: vi.fn() }, repository);
    await openSocialProfile(user);

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByText('Stockage local indisponible.')).toBeInTheDocument();
    expect(screen.getByText('Enregistrement impossible').closest('[role="alert"]')).toBeInTheDocument();
    expect(screen.queryByText('Profil mis à jour')).not.toBeInTheDocument();
  });

  it('enregistre le profil local sans tenter une publication cloud', async () => {
    const repository: SocialIdentityRepository = {
      readIdentity: vi.fn().mockResolvedValue(identity),
      saveIdentity: vi.fn().mockResolvedValue(undefined),
    };
    const cloudIdentityPort: SocialCloudIdentityPort = {
      readCurrentIdentity: vi.fn().mockResolvedValue(undefined),
      reserveHandle: vi.fn().mockResolvedValue({
        status: 'unavailable',
        message: 'Réservation indisponible.',
      }),
      lookupByHandle: vi.fn().mockResolvedValue({ status: 'notFound' }),
      publishIdentity: vi.fn().mockResolvedValue({
        status: 'unavailable',
        message: 'Service cloud indisponible.',
      }),
    };
    const user = userEvent.setup();
    renderProfile({ lookupByHandle: vi.fn() }, repository, cloudIdentityPort);
    await openSocialProfile(user);

    const displayName = screen.getByLabelText('Nom affiché');
    await user.clear(displayName);
    await user.type(displayName, 'Alex local');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByText('Profil mis à jour')).toBeInTheDocument();
    expect(screen.getAllByText('Profil mis à jour')).toHaveLength(1);
    expect(cloudIdentityPort.publishIdentity).not.toHaveBeenCalled();
    expect(screen.queryByText('Profil enregistré, publication à reprendre')).not.toBeInTheDocument();
  });

  it('ignore la réponse obsolète d’une ancienne valeur', async () => {
    const pending = new Map<string, (result: SocialUserLookupResult) => void>();
    const lookupByHandle = vi.fn<SocialUserLookupGateway['lookupByHandle']>(
      (handle) => new Promise<SocialUserLookupResult>(
        (resolve) => pending.set(handle, resolve),
      ),
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
