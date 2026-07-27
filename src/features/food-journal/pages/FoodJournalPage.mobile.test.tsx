import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { FoodJournalPage } from '@/features/food-journal/pages/FoodJournalPage';
import { appDatabase } from '@/infrastructure/database/database';
import { repositories } from '@/infrastructure/repositories/repositories';
import { ToastProvider } from '@/shared/toast/ToastProvider';

const originalRequestAnimationFrame = window.requestAnimationFrame;

function renderJournal(initialEntry: string | { pathname: string; search?: string; state?: unknown } = '/food?date=2026-06-24') {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/food" element={<FoodJournalPage />} />
          <Route path="/food/select" element={<h1>Sélecteur</h1>} />
          <Route path="/food/entries/:entryId/edit" element={<h1>Éditeur</h1>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

async function seedLunchEntry(date = '2026-06-24') {
  const product = await repositories.food.createProduct({
    name: 'Yaourt grec',
    brand: 'SportPilot',
    basisUnit: 'g',
    servingSize: 125,
    nutritionPer100: {
      caloriesKcal: 120,
      proteinGrams: 9,
      carbohydratesGrams: 4,
      fatGrams: 7,
    },
    source: { type: 'manual' },
    isNutritionComplete: true,
    isFavorite: true,
    isArchived: false,
  });
  const meal = await repositories.food.getOrCreateMeal(date, 'lunch');
  const entry = await repositories.food.createEntry({
    date,
    mealId: meal.id,
    mealSlot: 'lunch',
    sourceType: 'product',
    reference: {
      sourceType: 'product',
      productId: product.id,
      inputMode: 'amount',
      inputQuantity: 125,
      normalizedAmount: 125,
      normalizedUnit: 'g',
      nutritionPer100Snapshot: product.nutritionPer100,
    },
  });
  return { product, entry };
}

beforeEach(async () => {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
  window.requestAnimationFrame = (callback: FrameRequestCallback) => window.setTimeout(
    () => callback(performance.now()),
    0,
  );
  appDatabase.close();
  await appDatabase.delete();
  await appDatabase.open();
});

afterEach(async () => {
  window.requestAnimationFrame = originalRequestAnimationFrame;
  cleanup();
  appDatabase.close();
  await appDatabase.delete();
});

describe('FoodJournalPage — expérience mobile', () => {
  it('regroupe le résumé et les quatre repas avec une action Ajouter immédiatement visible', async () => {
    renderJournal();

    expect(await screen.findByRole('heading', { name: 'Journal alimentaire' })).toBeInTheDocument();
    expect(await screen.findByLabelText('Résumé nutritionnel de la journée')).toBeInTheDocument();
    for (const meal of ['Petit-déjeuner', 'Déjeuner', 'Dîner', 'Collations']) {
      expect(screen.getByRole('heading', { name: meal })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: meal === 'Collations' ? 'Ajouter un aliment aux collations' : `Ajouter un aliment au ${meal.toLocaleLowerCase('fr')}` })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Options de la journée' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Copier toute la journée vers')).not.toBeInTheDocument();
  });


  it('ouvre une seule carte de repas à la fois et propose l’ajout principal', async () => {
    const user = userEvent.setup();
    renderJournal();

    await screen.findByRole('heading', { name: 'Journal alimentaire' });
    const breakfastToggle = await screen.findByRole('button', { name: /^Petit-déjeuner/ });
    expect(breakfastToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /^Déjeuner/ })).toHaveAttribute('aria-expanded', 'false');

    await user.click(screen.getByRole('button', { name: /^Déjeuner/ }));
    expect(breakfastToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: /^Déjeuner/ })).toHaveAttribute('aria-expanded', 'true');

    await user.click(screen.getAllByRole('button', { name: 'Ajouter un aliment' })[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Ajouter un repas' });
    await user.click(within(dialog).getByRole('radio', { name: /Petit-déjeuner/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Continuer' }));
    expect(within(dialog).getByRole('link', { name: /Rechercher un aliment/ })).toHaveAttribute(
      'href',
      '/food/select?date=2026-06-24&slot=breakfast',
    );
  });

  it('ouvre le repas et le panneau demandés explicitement par l’URL', async () => {
    renderJournal('/food?date=2026-06-24&slot=dinner&add=true');

    const dialog = await screen.findByRole('dialog', { name: 'Ajouter un repas' });
    await waitFor(() => {
      expect(within(dialog).getByRole('radio', { name: /Dîner/ })).toBeChecked();
    });
    expect(screen.getByRole('button', { name: /^Dîner/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await waitFor(() => {
      expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
    });
  });


  it('répète en un geste le dernier repas équivalent lorsqu’un repas est vide', async () => {
    const user = userEvent.setup();
    await seedLunchEntry('2026-06-23');
    renderJournal();

    await screen.findByRole('heading', { name: 'Journal alimentaire' });
    await user.click(await screen.findByRole('button', { name: /^Déjeuner/ }));

    expect(await screen.findByText('Dernier déjeuner enregistré le 23 juin 2026.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Répéter ce repas' }));

    await waitFor(async () => {
      expect(await repositories.food.listEntriesByDate('2026-06-24')).toHaveLength(1);
    });
    expect(await screen.findByText('Repas répété')).toBeInTheDocument();
    expect(await screen.findByText('Yaourt grec')).toBeInTheDocument();
  });

  it('ne conserve pas les données de la journée précédente lors de la navigation', async () => {
    const user = userEvent.setup();
    await seedLunchEntry();
    renderJournal();

    expect(await screen.findByText('Yaourt grec')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Jour suivant' }));

    await waitFor(() => expect(screen.getByLabelText('Choisir une date')).toHaveValue('2026-06-25'));
    await screen.findByRole('heading', { name: 'Aucun aliment pour cette journée' });
    expect(screen.queryByText('Yaourt grec')).not.toBeInTheDocument();
  });

  it('modifie une quantité dans le repas sans quitter ni démonter le journal', async () => {
    const user = userEvent.setup();
    const { entry } = await seedLunchEntry();
    renderJournal();

    await screen.findByText('Yaourt grec');
    await user.click(screen.getByRole('button', { name: 'Actions pour Yaourt grec' }));
    await user.click(screen.getByRole('button', { name: 'Modifier la quantité' }));

    const quantityInput = screen.getByLabelText('Quantité en g');
    await user.clear(quantityInput);
    await user.type(quantityInput, '80');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(async () => {
      const updated = await repositories.food.getEntryById(entry.id);
      expect(updated?.reference).toMatchObject({ inputQuantity: 80, normalizedAmount: 80 });
    });
    expect(await screen.findByText('Quantité mise à jour')).toBeInTheDocument();
    expect(screen.queryByLabelText('Chargement de la page')).not.toBeInTheDocument();
    expect(screen.getByText(/80 g · 96 kcal/)).toBeInTheDocument();
  });

  it('confirme une suppression dans un dialogue accessible', async () => {
    const user = userEvent.setup();
    const { entry } = await seedLunchEntry();
    renderJournal();

    await screen.findByText('Yaourt grec');
    await user.click(screen.getByRole('button', { name: 'Actions pour Yaourt grec' }));
    await user.click(screen.getByRole('button', { name: 'Supprimer' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Supprimer cette entrée ?');
    await user.click(within(dialog).getByRole('button', { name: 'Supprimer' }));

    await waitFor(async () => expect(await repositories.food.getEntryById(entry.id)).toBeUndefined());
    expect(await screen.findByText('Entrée supprimée')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('affiche une confirmation unique et cible le repas après un retour d’ajout', async () => {
    const { entry } = await seedLunchEntry();
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });

    renderJournal({
      pathname: '/food',
      search: '?date=2026-06-24',
      state: {
        foodJournalFeedback: {
          title: 'Aliment ajouté au déjeuner',
          mealSlot: 'lunch',
          entryId: entry.id,
        },
      },
    });

    expect(await screen.findByText('Aliment ajouté au déjeuner')).toBeInTheDocument();
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' }));
    expect(screen.getAllByText('Aliment ajouté au déjeuner')).toHaveLength(1);
  });
});
