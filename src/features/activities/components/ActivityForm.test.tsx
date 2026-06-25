import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import { ActivityForm } from '@/features/activities/components/ActivityForm';
import { defaultActivityFormValues } from '@/features/activities/utils/activityForm';

describe('ActivityForm', () => {
  it('ne demande plus de RPE général pour les activités', () => {
    const settings = createDefaultAppSettings();

    render(
      <ActivityForm
        initialValues={defaultActivityFormValues('running', settings)}
        allowedTypes={['running', 'swimming', 'strengthTraining', 'cycling', 'walking', 'otherCardio']}
        settings={settings}
        calculationWeightKg={60}
        calculationWeightSource="poids de test"
        submitLabel="Enregistrer"
        onDateChange={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
      />,
    );

    expect(screen.queryByLabelText(/RPE/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/effort maximal/i)).not.toBeInTheDocument();
  });
});
