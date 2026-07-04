import { saveProductEntry } from '@/application/food/foodJournalService';
import type { EntityId, LocalDate } from '@/domain/models/common';
import type { FoodEntry, FoodProduct, MealSlot, NutritionValues } from '@/domain/models/food';
import type { FoodRepository } from '@/infrastructure/repositories/contracts/FoodRepository';
import { repositories } from '@/infrastructure/repositories/repositories';

export interface PhotoNutritionEstimate { name: string; amount: number; nutrition: NutritionValues }
export interface PhotoNutritionAnalysisResult { estimate: PhotoNutritionEstimate }
export interface PhotoNutritionAnalysisPort { analyze(file: File, signal?: AbortSignal): Promise<PhotoNutritionAnalysisResult> }
export interface SavePhotoNutritionEstimateInput { date: LocalDate; mealSlot: MealSlot; estimate: PhotoNutritionEstimate }
export interface SavePhotoNutritionEstimateResult { product: FoodProduct; entry: FoodEntry }
export interface PhotoNutritionEstimationDependencies { food: FoodRepository }

const round = (value: number): number => Math.round(value * 10) / 10;
function assertPhoto(file: File): void {
  if (file.size <= 0) throw new Error('Photo illisible.');
}
function estimateFor(): PhotoNutritionAnalysisResult {
  return { estimate: { name: 'Repas à vérifier', amount: 250, nutrition: { caloriesKcal: 450, proteinGrams: 22, carbohydratesGrams: 48, fatGrams: 16 } } };
}
export const localPhotoNutritionAnalysisPort: PhotoNutritionAnalysisPort = { async analyze() { return estimateFor(); } };
export function createPhotoEstimatedProductData(estimate: PhotoNutritionEstimate): Omit<FoodProduct, 'id' | 'createdAt' | 'updatedAt'> {
  const ratio = 100 / estimate.amount, nutrition = estimate.nutrition;
  return { name: estimate.name.trim() || 'Repas à vérifier', brand: 'Estimation photo', basisUnit: 'g', nutritionPer100: { caloriesKcal: round(nutrition.caloriesKcal * ratio), proteinGrams: round(nutrition.proteinGrams * ratio), carbohydratesGrams: round(nutrition.carbohydratesGrams * ratio), fatGrams: round(nutrition.fatGrams * ratio) }, servingSize: estimate.amount, source: { type: 'manual' }, isNutritionComplete: false, isFavorite: false, isArchived: false };
}
export async function analyzePhotoNutrition(file: File, port: PhotoNutritionAnalysisPort = localPhotoNutritionAnalysisPort, signal?: AbortSignal): Promise<PhotoNutritionAnalysisResult> {
  if (signal?.aborted) throw new Error('Analyse photo annulée.');
  assertPhoto(file);
  try { return await port.analyze(file, signal); } catch (error) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) throw new Error('Réseau indisponible');
    throw error instanceof Error ? error : new Error('Repas non reconnu.');
  }
}
export async function savePhotoNutritionEstimateToJournal(input: SavePhotoNutritionEstimateInput, dependencies: PhotoNutritionEstimationDependencies = { food: repositories.food }): Promise<SavePhotoNutritionEstimateResult> {
  if (input.estimate.amount <= 0) throw new Error('Quantité approximative invalide.');
  const product = await dependencies.food.createProduct(createPhotoEstimatedProductData(input.estimate));
  const entry = await saveProductEntry({ date: input.date, mealSlot: input.mealSlot, productId: product.id as EntityId, inputMode: 'amount', inputQuantity: input.estimate.amount }, dependencies);
  return { product, entry };
}
