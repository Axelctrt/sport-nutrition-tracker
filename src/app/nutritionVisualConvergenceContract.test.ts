import { describe, expect, it } from 'vitest';

import favoriteMealsSource from '@/features/favorite-meals/pages/FavoriteMealsPage.tsx?raw';
import methodGridSource from '@/features/food-journal/components/FoodAddMethodGrid.tsx?raw';
import journalSource from '@/features/food-journal/pages/FoodJournalPage.tsx?raw';
import selectorSource from '@/features/food-journal/pages/MealFoodSelectorPage.tsx?raw';
import photoNutritionSource from '@/features/photo-nutrition/pages/PhotoNutritionEstimatePage.tsx?raw';
import productsSource from '@/features/products/pages/FoodProductsPage.tsx?raw';
import recipeCardSource from '@/features/recipes/components/RecipeLibraryCard.tsx?raw';
import recipesSource from '@/features/recipes/pages/RecipesPage.tsx?raw';

describe('convergence visuelle du journal Nutrition', () => {
  it('centralise les méthodes d’ajout sur Card interactive et les tokens sémantiques', () => {
    expect(methodGridSource).toContain("import { Card } from '@/shared/ui/Card'");
    expect(methodGridSource).toContain('variant="interactive"');
    expect(methodGridSource).toContain('var(--sp-surface-muted)');
    expect(methodGridSource).toContain('var(--sp-text-primary)');
    expect(methodGridSource).toContain('var(--sp-text-secondary)');
    expect(methodGridSource).toContain('var(--sp-accent-primary)');
    expect(methodGridSource).not.toContain('border-brand-500 bg-brand-50');
    expect(methodGridSource).not.toContain('bg-brand-700 text-white');
  });

  it('préserve les destinations des méthodes d’ajout', () => {
    expect(methodGridSource).toContain('to={barcodeScannerPath(date, mealSlot)}');
    expect(methodGridSource).toContain('to={favoriteMealsForMealPath(date, mealSlot)}');
    expect(methodGridSource).toContain('to={photoNutritionEstimatePath(date, mealSlot)}');
    expect(methodGridSource).toContain('to={recipesForMealPath(date, mealSlot)}');
    expect(methodGridSource).toContain('to={newFoodProductForMealPath(date, mealSlot)}');
    expect(methodGridSource).toContain("onSelectSource('openFoodFacts')");
  });

  it('converge la carte Bibliothèque sans changer son ouverture ni ses destinations', () => {
    expect(journalSource).toContain('variant="interactive"');
    expect(journalSource).toContain('onClick={() => setLibraryOpen(true)}');
    expect(journalSource).toContain('var(--sp-surface-muted)');
    expect(journalSource).toContain('var(--sp-text-primary)');
    expect(journalSource).toContain('var(--sp-text-secondary)');
    expect(journalSource).toContain('routePaths.foodProducts');
    expect(journalSource).toContain('routePaths.recipes');
    expect(journalSource).toContain('routePaths.favoriteMeals');
  });

  it('aligne le CTA de création du sélecteur sur le contrat bouton', () => {
    expect(selectorSource).toContain('className="sp-button inline-flex min-h-[var(--sp-control-height-md)]');
    expect(selectorSource).toContain('rounded-[var(--sp-radius-control)]');
    expect(selectorSource).toContain('to={newFoodProductForMealPath(date, mealSlot, {');
    expect(selectorSource).toContain('state={location.state}');
    expect(selectorSource).not.toContain('className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-700');
  });
});

describe('convergence visuelle des bibliothèques Nutrition', () => {
  it('utilise le contrat bouton et SegmentedControl dans les aliments locaux sans changer les routes', () => {
    expect(productsSource).toContain("import { SegmentedControl } from '@/shared/ui/SegmentedControl'");
    expect(productsSource).toContain('label="Filtrer les aliments"');
    expect(productsSource).toContain('items={filterItems}');
    expect(productsSource).toContain('value={filter}');
    expect(productsSource).toContain('onChange={(value) => setFilter(value as ProductFilter)}');
    expect(productsSource).toContain('sp-button sp-button--secondary');
    expect(productsSource).toContain('sp-button inline-flex min-h-[var(--sp-control-height-lg)]');
    expect(productsSource).toContain('to={routePaths.foodSearch}');
    expect(productsSource).toContain('to={routePaths.newFoodProduct}');
    expect(productsSource).toContain('state={navigationState}');
    expect(productsSource).not.toContain('border-brand-700 bg-brand-700 text-white');
  });

  it('aligne les CTA de la bibliothèque de recettes sans modifier les destinations', () => {
    expect(recipesSource).toContain('sp-button min-h-[var(--sp-control-height-lg)]');
    expect(recipesSource).toContain('sp-button inline-flex min-h-[var(--sp-control-height-md)]');
    expect(recipesSource).toContain('sp-button sp-button--secondary');
    expect(recipesSource).toContain('to={routePaths.newRecipe}');
    expect(recipesSource).toContain('to={routePaths.foodProducts}');
    expect(recipesSource).toContain('state={navigationState}');
    expect(recipesSource).not.toContain('rounded-xl bg-brand-700 px-4 font-semibold text-white');
  });

  it('aligne les CTA des repas favoris en conservant la date cible', () => {
    expect(favoriteMealsSource).toContain('sp-button sp-button--secondary');
    expect(favoriteMealsSource).toContain('sp-button inline-flex min-h-[var(--sp-control-height-md)]');
    expect(favoriteMealsSource).toContain('to={foodJournalPath(targetDate)}');
    expect(favoriteMealsSource).not.toContain('rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white');
  });

  it('aligne le CTA Ajouter au journal des recettes sans modifier route ni state', () => {
    expect(recipeCardSource).toContain('className="sp-button mt-4 inline-flex min-h-[var(--sp-control-height-md)]');
    expect(recipeCardSource).toContain('to={addRecipeToJournalPath(recipe.id, targetDate, targetSlot)}');
    expect(recipeCardSource).toContain('state={journalNavigationState}');
    expect(recipeCardSource).not.toContain('rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white');
  });
});

describe('convergence visuelle de Photo Nutrition', () => {
  it('réutilise les primitives et tokens partagés pour la photo et le formulaire', () => {
    expect(photoNutritionSource).toContain("import { inputClassName } from '@/shared/forms/formStyles'");
    expect(photoNutritionSource).toContain("import { IconAction } from '@/shared/ui/IconAction'");
    expect(photoNutritionSource).toContain('var(--sp-surface-muted)');
    expect(photoNutritionSource).toContain('var(--sp-border-subtle)');
    expect(photoNutritionSource).toContain('var(--sp-text-primary)');
    expect(photoNutritionSource).toContain('var(--sp-text-secondary)');
    expect(photoNutritionSource).toContain('var(--sp-accent-primary)');
    expect(photoNutritionSource).toContain('label="Supprimer la photo sélectionnée"');
    expect(photoNutritionSource).not.toContain('border-brand-200 bg-brand-50');
    expect(photoNutritionSource).not.toContain('border-emerald-200 bg-emerald-50');
    expect(photoNutritionSource).not.toContain('className="min-h-11 rounded-xl border border-slate-300 bg-white px-3');
  });

  it('préserve l’activation explicite et les paramètres de l’analyse IA', () => {
    expect(photoNutritionSource).toContain('role="switch"');
    expect(photoNutritionSource).toContain('aria-checked={useRemoteAi}');
    expect(photoNutritionSource).toContain('disabled={!aiConfig.enabled || isAnalyzing || isSaving}');
    expect(photoNutritionSource).toContain('onClick={() => setUseRemoteAi((current) => !current)}');
    expect(photoNutritionSource).toContain('setUseRemoteAi(false)');
    expect(photoNutritionSource).toContain('endpointUrl: aiConfig.endpointUrl');
    expect(photoNutritionSource).toContain('timeoutMs: aiConfig.timeoutMs');
    expect(photoNutritionSource).toContain('setAnalysis(await analyzePhoto(selectedFile, remotePort))');
  });

  it('conserve les routes compte/journal et la sauvegarde métier', () => {
    expect(photoNutritionSource).toContain('to={routePaths.syncPrototype}');
    expect(photoNutritionSource).toContain('sp-button sp-button--secondary');
    expect(photoNutritionSource).toContain('foodJournalCancelPath(');
    expect(photoNutritionSource).toContain('createFoodJournalRestoreState(navigationState?.foodJournalReturn)');
    expect(photoNutritionSource).toContain('saveEstimate({ date, mealSlot, estimate: nextEstimate })');
    expect(photoNutritionSource).toContain('createFoodJournalFeedbackState(returnContext, {');
  });
});
