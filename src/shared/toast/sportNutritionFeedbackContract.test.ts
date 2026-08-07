import { describe, expect, it } from 'vitest';

import enduranceTemplatesSource from '@/features/endurance-templates/pages/EnduranceTemplatesPage.tsx?raw';
import favoriteMealsSource from '@/features/favorite-meals/pages/FavoriteMealsPage.tsx?raw';
import goalEditorSource from '@/features/goals/components/GoalEditor.tsx?raw';
import goalsPageSource from '@/features/goals/pages/GoalsPage.tsx?raw';
import foodProductEditorSource from '@/features/products/pages/FoodProductEditorPage.tsx?raw';
import foodProductsSource from '@/features/products/pages/FoodProductsPage.tsx?raw';
import recipesSource from '@/features/recipes/pages/RecipesPage.tsx?raw';
import weightSource from '@/features/weight/pages/WeightPage.tsx?raw';

describe('feedback Sport et Nutrition', () => {
  it('garde les erreurs Objectifs locales et les succès transitoires', () => {
    for (const source of [goalEditorSource, goalsPageSource]) {
      expect(source).toContain('actionToast.success');
      expect(source).not.toContain('actionToast.error');
      expect(source).toContain('InlineNotice');
    }
  });

  it('garde Poids entièrement local', () => {
    expect(weightSource).not.toContain('useActionToast');
    expect(weightSource).not.toContain('actionToast.');
    expect(weightSource).toContain('setFeedback');
    expect(weightSource).toContain('InlineNotice');
  });

  it('réserve les toasts Aliments aux transitions ou disparitions', () => {
    expect(foodProductEditorSource).toContain('actionToast.success');
    expect(foodProductEditorSource).not.toContain('food-product-refresh:');
    expect(foodProductEditorSource).not.toContain('actionToast.error');
    expect(foodProductEditorSource).toContain('setActionErrorMessage');
    expect(foodProductEditorSource).toContain('setFeedback');

    expect(foodProductsSource).toContain('food-product-archive:');
    expect(foodProductsSource).toContain('food-product-return:');
    expect(foodProductsSource).not.toContain('actionToast.error');
    expect(foodProductsSource).toContain('InlineNotice');
  });

  it('sépare le retour d’éditeur et la suppression Recettes', () => {
    expect(recipesSource).toContain('recipe-return:');
    expect(recipesSource).not.toContain('recipe-delete:');
    expect(recipesSource).not.toContain('actionToast.error');
    expect(recipesSource).toContain("setFeedback('Recette supprimée')");
    expect(recipesSource).toContain('InlineNotice');
  });

  it('garde l’ajout Favoris local et la suppression transitoire', () => {
    expect(favoriteMealsSource).not.toContain('favorite-meal-apply:');
    expect(favoriteMealsSource).toContain('favorite-meal-delete:');
    expect(favoriteMealsSource).not.toContain('actionToast.error');
    expect(favoriteMealsSource).toContain('setSuccess');
    expect(favoriteMealsSource).toContain('InlineNotice');
  });

  it('garde les erreurs Endurance locales', () => {
    expect(enduranceTemplatesSource).toContain('actionToast.success');
    expect(enduranceTemplatesSource).not.toContain('actionToast.error');
    expect(enduranceTemplatesSource).toContain('setErrorMessage');
    expect(enduranceTemplatesSource).toContain('InlineNotice');
  });
});
