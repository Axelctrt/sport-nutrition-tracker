import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProfileImpactPreview as ProfileImpactPreviewModel } from '@/application/profile/profileImpactService';
import { ProfileImpactPreview } from '@/features/profile/components/ProfileImpactPreview';

const preview: ProfileImpactPreviewModel = {
  date: '2026-07-10',
  changedFields: ['goal', 'targetWeeklyWeightChangePercent'],
  changedFieldLabels: ['objectif', 'variation hebdomadaire'],
  before: {
    targetCaloriesKcal: 2400,
    macros: { proteinGrams: 108, carbohydratesGrams: 322, fatGrams: 54 },
    calculationWeightKg: 60,
  },
  after: {
    targetCaloriesKcal: 2180,
    macros: { proteinGrams: 108, carbohydratesGrams: 267, fatGrams: 54 },
    calculationWeightKg: 60,
  },
};

afterEach(cleanup);

describe('ProfileImpactPreview', () => {
  it('affiche les calories, macros et exige une confirmation', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ProfileImpactPreview
        preview={preview}
        isSaving={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Vérifier l’impact avant d’enregistrer' })).toBeInTheDocument();
    expect(screen.getByText('2 400 kcal')).toBeInTheDocument();
    expect(screen.getByText('2 180 kcal')).toBeInTheDocument();
    expect(screen.getByText(/objectif, variation hebdomadaire/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmer les changements' }));
    fireEvent.click(screen.getByRole('button', { name: 'Revenir au formulaire' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
