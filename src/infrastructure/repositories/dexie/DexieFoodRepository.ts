import { RepositoryError } from '@/domain/errors/RepositoryError';
import type {
  EntityChanges,
  EntityId,
  LocalDate,
  NewEntity,
} from '@/domain/models/common';
import type {
  DailyJournalStatus,
  FavoriteMeal,
  FoodEntry,
  FoodProduct,
  Meal,
  MealSlot,
} from '@/domain/models/food';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { FoodRepository } from '@/infrastructure/repositories/contracts/FoodRepository';
import { runRepositoryOperation } from '@/infrastructure/repositories/dexie/repositoryOperation';
import { createEntity, updateEntity } from '@/shared/utils/entities';
import { normalizeOpenFoodFactsBarcode } from '@/infrastructure/open-food-facts/barcode';

export class DexieFoodRepository implements FoodRepository {
  private readonly database: AppDatabase;

  constructor(database: AppDatabase) {
    this.database = database;
  }

  getProductById(id: EntityId): Promise<FoodProduct | undefined> {
    return runRepositoryOperation(
      'read',
      'Impossible de lire cet aliment.',
      () => this.database.foodProducts.get(id),
    );
  }


  listProducts(includeArchived = false): Promise<FoodProduct[]> {
    return runRepositoryOperation(
      'read',
      'Impossible de charger les aliments locaux.',
      async () => {
        const products = await this.database.foodProducts.orderBy('name').toArray();
        return products
          .filter((product) => includeArchived || !product.isArchived)
          .sort((left, right) => left.name.localeCompare(right.name, 'fr'));
      },
    );
  }

  findProductByBarcode(barcode: string): Promise<FoodProduct | undefined> {
    return runRepositoryOperation(
      'read',
      'Impossible de rechercher ce code-barres.',
      async () => {
        const normalizedBarcode = normalizeOpenFoodFactsBarcode(barcode);
        const exact = await this.database.foodProducts.where('barcode').equals(normalizedBarcode).first();
        if (exact) return exact;

        return this.database.foodProducts
          .filter((product) => (
            product.barcode !== undefined
            && normalizeOpenFoodFactsBarcode(product.barcode) === normalizedBarcode
          ))
          .first();
      },
    );
  }

  searchProducts(query: string, limit = 20): Promise<FoodProduct[]> {
    return runRepositoryOperation(
      'read',
      'Impossible de rechercher les aliments locaux.',
      async () => {
        const normalizedQuery = query.trim().toLocaleLowerCase('fr');
        const products = normalizedQuery.length === 0
          ? await this.database.foodProducts.orderBy('name').toArray()
          : await this.database.foodProducts
              .filter((product) => {
                const haystack = `${product.name} ${product.brand ?? ''}`.toLocaleLowerCase('fr');
                return haystack.includes(normalizedQuery);
              })
              .toArray();

        return products
          .filter((product) => !product.isArchived)
          .sort((left, right) => left.name.localeCompare(right.name, 'fr'))
          .slice(0, limit);
      },
    );
  }

  createProduct(data: NewEntity<FoodProduct>): Promise<FoodProduct> {
    return runRepositoryOperation(
      'create',
      'Impossible de créer cet aliment.',
      async () => {
        const product = createEntity<FoodProduct>(data);
        await this.database.foodProducts.add(product);
        return product;
      },
    );
  }

  updateProduct(
    id: EntityId,
    changes: EntityChanges<FoodProduct>,
  ): Promise<FoodProduct> {
    return runRepositoryOperation(
      'update',
      'Impossible de modifier cet aliment.',
      async () => {
        const current = await this.database.foodProducts.get(id);

        if (!current) {
          throw new RepositoryError('Aliment introuvable.', 'update');
        }

        const updated = updateEntity(current, changes);
        await this.database.foodProducts.put(updated);
        return updated;
      },
    );
  }

  archiveProduct(id: EntityId): Promise<FoodProduct> {
    return this.updateProduct(id, { isArchived: true });
  }

  getMealById(id: EntityId): Promise<Meal | undefined> {
    return runRepositoryOperation(
      'read',
      'Impossible de lire ce repas.',
      () => this.database.meals.get(id),
    );
  }

  getOrCreateMeal(date: LocalDate, slot: MealSlot, title?: string): Promise<Meal> {
    return runRepositoryOperation(
      'create',
      'Impossible de préparer ce repas.',
      async () => {
        const current = await this.database.meals
          .where('[date+slot]')
          .equals([date, slot])
          .first();

        if (current) {
          if (title !== undefined && title !== current.title) {
            const updated = updateEntity(current, { title });
            await this.database.meals.put(updated);
            return updated;
          }

          return current;
        }

        const mealData: NewEntity<Meal> = title === undefined
          ? { date, slot }
          : { date, slot, title };
        const meal = createEntity<Meal>(mealData);
        await this.database.meals.add(meal);
        return meal;
      },
    );
  }

  listMealsByDate(date: LocalDate): Promise<Meal[]> {
    return runRepositoryOperation(
      'read',
      'Impossible de charger les repas de cette journée.',
      () => this.database.meals.where('date').equals(date).sortBy('slot'),
    );
  }

  deleteMeal(id: EntityId): Promise<void> {
    return runRepositoryOperation(
      'delete',
      'Impossible de supprimer ce repas.',
      () => this.database.transaction(
        'rw',
        this.database.meals,
        this.database.foodEntries,
        async () => {
          await this.database.foodEntries.where('mealId').equals(id).delete();
          await this.database.meals.delete(id);
        },
      ),
    );
  }

  getEntryById(id: EntityId): Promise<FoodEntry | undefined> {
    return runRepositoryOperation(
      'read',
      'Impossible de lire cette entrée alimentaire.',
      () => this.database.foodEntries.get(id),
    );
  }

  createEntry(data: NewEntity<FoodEntry>): Promise<FoodEntry> {
    return runRepositoryOperation(
      'create',
      'Impossible d’ajouter cet aliment au journal.',
      async () => {
        const entry = createEntity<FoodEntry>(data);
        await this.database.foodEntries.add(entry);
        return entry;
      },
    );
  }

  updateEntry(id: EntityId, changes: EntityChanges<FoodEntry>): Promise<FoodEntry> {
    return runRepositoryOperation(
      'update',
      'Impossible de modifier cette entrée alimentaire.',
      async () => {
        const current = await this.database.foodEntries.get(id);

        if (!current) {
          throw new RepositoryError('Entrée alimentaire introuvable.', 'update');
        }

        const updated = updateEntity(current, changes);
        await this.database.foodEntries.put(updated);
        return updated;
      },
    );
  }

  listEntriesByDate(date: LocalDate): Promise<FoodEntry[]> {
    return runRepositoryOperation(
      'read',
      'Impossible de charger le journal alimentaire.',
      () => this.database.foodEntries.where('date').equals(date).toArray(),
    );
  }

  listEntriesBetween(from: LocalDate, to: LocalDate): Promise<FoodEntry[]> {
    return runRepositoryOperation(
      'read',
      'Impossible de charger l’historique alimentaire.',
      () => this.database.foodEntries.where('date').between(from, to, true, true).sortBy('date'),
    );
  }

  listEntriesByMeal(mealId: EntityId): Promise<FoodEntry[]> {
    return runRepositoryOperation(
      'read',
      'Impossible de charger les aliments de ce repas.',
      () => this.database.foodEntries.where('mealId').equals(mealId).toArray(),
    );
  }

  deleteEntry(id: EntityId): Promise<void> {
    return runRepositoryOperation(
      'delete',
      'Impossible de supprimer cette entrée alimentaire.',
      () => this.database.foodEntries.delete(id),
    );
  }

  getJournalStatus(date: LocalDate): Promise<DailyJournalStatus | undefined> {
    return runRepositoryOperation(
      'read',
      'Impossible de lire l’état du journal alimentaire.',
      () => this.database.dailyJournalStatuses.where('date').equals(date).first(),
    );
  }

  listJournalStatusesBetween(from: LocalDate, to: LocalDate): Promise<DailyJournalStatus[]> {
    return runRepositoryOperation(
      'read',
      'Impossible de charger l’historique des journées alimentaires.',
      () => this.database.dailyJournalStatuses.where('date').between(from, to, true, true).sortBy('date'),
    );
  }

  upsertJournalStatus(
    data: NewEntity<DailyJournalStatus>,
  ): Promise<DailyJournalStatus> {
    return runRepositoryOperation(
      'update',
      'Impossible de modifier l’état du journal alimentaire.',
      async () => {
        const current = await this.database.dailyJournalStatuses
          .where('date')
          .equals(data.date)
          .first();
        const status = current
          ? updateEntity(current, data)
          : createEntity<DailyJournalStatus>(data);
        await this.database.dailyJournalStatuses.put(status);
        return status;
      },
    );
  }

  getFavoriteMealById(id: EntityId): Promise<FavoriteMeal | undefined> {
    return runRepositoryOperation(
      'read',
      'Impossible de lire ce repas favori.',
      () => this.database.favoriteMeals.get(id),
    );
  }

  createFavoriteMeal(data: NewEntity<FavoriteMeal>): Promise<FavoriteMeal> {
    return runRepositoryOperation(
      'create',
      'Impossible d’enregistrer ce repas favori.',
      async () => {
        const favoriteMeal = createEntity<FavoriteMeal>(data);
        await this.database.favoriteMeals.add(favoriteMeal);
        return favoriteMeal;
      },
    );
  }

  listFavoriteMeals(): Promise<FavoriteMeal[]> {
    return runRepositoryOperation(
      'read',
      'Impossible de charger les repas favoris.',
      () => this.database.favoriteMeals.orderBy('name').toArray(),
    );
  }

  deleteFavoriteMeal(id: EntityId): Promise<void> {
    return runRepositoryOperation(
      'delete',
      'Impossible de supprimer ce repas favori.',
      () => this.database.favoriteMeals.delete(id),
    );
  }
}
