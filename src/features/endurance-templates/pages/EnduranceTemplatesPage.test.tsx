import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import * as enduranceTemplateService from '@/application/activities/enduranceTemplateService';
import { EnduranceTemplatesPage } from '@/features/endurance-templates/pages/EnduranceTemplatesPage';
import { appDatabase } from '@/infrastructure/database/database';
import { initializeDatabase } from '@/infrastructure/database/databaseLifecycle';

function renderPage() {
  return render(
    <MemoryRouter>
      <EnduranceTemplatesPage />
    </MemoryRouter>,
  );
}

function dispatchBeforeUnload() {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event;
}

function editButtonForTemplate(templateName: string) {
  const heading = screen.getByRole('heading', { name: templateName });
  const card = heading.closest('.sp-card');
  if (!(card instanceof HTMLElement)) {
    throw new Error(`Carte du modèle « ${templateName} » introuvable.`);
  }
  return within(card).getByRole('button', { name: 'Modifier' });
}

beforeEach(async () => {
  cleanup();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  appDatabase.close();
  await appDatabase.delete();
  await initializeDatabase();
});

afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  appDatabase.close();
  await appDatabase.delete();
});

describe('EnduranceTemplatesPage', () => {
  it.each([
    { reducedMotion: false, expectedBehavior: 'smooth' as const },
    { reducedMotion: true, expectedBehavior: 'auto' as const },
  ])(
    'conserve la destination haute avec le comportement $expectedBehavior',
    async ({ reducedMotion, expectedBehavior }) => {
      const user = userEvent.setup();
      vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
        matches: reducedMotion,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(() => false),
      }) as MediaQueryList);
      renderPage();

      await screen.findByRole('heading', { name: 'Course facile 45 min' });
      await user.click(editButtonForTemplate('Natation endurance 1 500 m'));

      expect(window.scrollTo).toHaveBeenCalledWith({
        top: 0,
        behavior: expectedBehavior,
      });
    },
  );

  it('affiche les modèles par défaut et enregistre un modèle vélo', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Course facile 45 min' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Natation endurance 1 500 m' })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Nom/), 'Vélo souple');
    await user.selectOptions(screen.getByLabelText(/Sport/), 'cycling');
    await user.clear(screen.getByLabelText(/Durée \(min\)/));
    await user.type(screen.getByLabelText(/Durée \(min\)/), '75');
    await user.clear(screen.getByLabelText('Distance (km)'));
    await user.type(screen.getByLabelText('Distance (km)'), '32');
    await user.click(screen.getByRole('button', { name: 'Créer le modèle' }));

    expect(await screen.findByRole('heading', { name: 'Vélo souple' })).toBeInTheDocument();
    expect(dispatchBeforeUnload().defaultPrevented).toBe(false);
    await waitFor(async () => {
      const settings = await appDatabase.userSettings.toCollection().first();
      expect(settings?.enduranceTemplates).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: 'Vélo souple', activityType: 'cycling', distanceKm: 32 })]),
      );
    });
  });

  it('protège le brouillon avant de charger un autre modèle', async () => {
    const user = userEvent.setup();
    const targetName = 'Natation endurance 1 500 m';
    renderPage();

    await screen.findByRole('heading', { name: 'Course facile 45 min' });
    const nameInput = screen.getByLabelText(/Nom/);
    expect(dispatchBeforeUnload().defaultPrevented).toBe(false);

    await user.type(nameInput, 'Brouillon endurance');
    expect(dispatchBeforeUnload().defaultPrevented).toBe(true);

    await user.click(editButtonForTemplate(targetName));
    expect(screen.getByRole('alertdialog', { name: 'Remplacer le brouillon ?' })).toBeInTheDocument();
    expect(nameInput).toHaveValue('Brouillon endurance');

    await user.click(screen.getByRole('button', { name: 'Conserver le brouillon' }));
    expect(screen.queryByRole('alertdialog', { name: 'Remplacer le brouillon ?' })).not.toBeInTheDocument();
    expect(nameInput).toHaveValue('Brouillon endurance');

    await user.click(editButtonForTemplate(targetName));
    await user.click(screen.getByRole('button', { name: 'Modifier ce modèle' }));

    expect(await screen.findByRole('heading', { name: `Modifier : ${targetName}` })).toBeInTheDocument();
    expect(nameInput).toHaveValue(targetName);
    expect(dispatchBeforeUnload().defaultPrevented).toBe(false);
  });

  it('conserve la protection après une erreur d’enregistrement', async () => {
    const user = userEvent.setup();
    vi.spyOn(enduranceTemplateService, 'saveEnduranceTemplate')
      .mockRejectedValueOnce(new Error('Échec contrôlé'));
    renderPage();

    await screen.findByRole('heading', { name: 'Course facile 45 min' });
    await user.type(screen.getByLabelText(/Nom/), 'Modèle en erreur');
    await user.click(screen.getByRole('button', { name: 'Créer le modèle' }));

    expect(await screen.findAllByText('Échec contrôlé')).not.toHaveLength(0);
    expect(screen.getByLabelText(/Nom/)).toHaveValue('Modèle en erreur');
    expect(dispatchBeforeUnload().defaultPrevented).toBe(true);
  });
});
