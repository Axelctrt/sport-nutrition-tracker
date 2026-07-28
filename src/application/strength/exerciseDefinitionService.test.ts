import { describe, expect, it, vi } from 'vitest';

import {
  createCustomExercise,
  findSimilarExerciseDefinitions,
  normalizeExerciseName,
} from './exerciseDefinitionService';
import type { ExerciseDefinition } from '@/domain/models/strength';

const exercise = (id: string, name: string): ExerciseDefinition => ({
  id,
  name,
  primaryMuscleGroup: 'back',
  secondaryMuscleGroups: [],
  equipment: 'cable',
  category: 'strength',
  movementType: 'compound',
  loadUnit: 'kg',
  source: 'user',
  isArchived: false,
  createdAt: '2026-07-28T12:00:00.000Z',
  updatedAt: '2026-07-28T12:00:00.000Z',
});

describe('noms d’exercices personnels', () => {
  it('normalise accents, casse, ponctuation et espaces', () => {
    expect(normalizeExerciseName('  ÉLÉVATIONS   latérales  ')).toBe(
      'elevations laterales',
    );
  });

  it('propose les exercices proches avant une création', () => {
    const similar = findSimilarExerciseDefinitions([
      exercise('one', 'Tirage poulie unilatéral'),
      exercise('two', 'Développé couché'),
    ], 'tirage unilateral poulie');
    expect(similar.map(({ id }) => id)).toEqual(['one']);
  });

  it('refuse un doublon exact après normalisation', async () => {
    const repository = {
      listAll: vi.fn(async () => [exercise('one', 'Élévations latérales')]),
      create: vi.fn(),
    };
    await expect(createCustomExercise(repository as never, {
      name: 'elevations   laterales',
      primaryMuscleGroup: 'other',
      secondaryMuscleGroups: [],
      equipment: 'other',
      category: 'other',
      movementType: 'other',
      loadUnit: 'none',
      trackingMode: 'repetitions',
    })).rejects.toThrow('existe déjà');
    expect(repository.create).not.toHaveBeenCalled();
  });
});
