import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import { ActivityForm } from '@/features/activities/components/ActivityForm';
import type { ActivityFormValues } from '@/features/activities/schemas/activityFormSchema';
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

  it('enregistre une surcharge privée spécifique à l’activité', async () => {
    const user = userEvent.setup();
    const settings = createDefaultAppSettings();
    const onSubmit = vi.fn(async (_values: ActivityFormValues) => undefined);

    render(
      <ActivityForm
        initialValues={defaultActivityFormValues('running', settings)}
        allowedTypes={['running']}
        settings={settings}
        calculationWeightKg={60}
        calculationWeightSource="poids de test"
        submitLabel="Enregistrer"
        onDateChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Privée' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(onSubmit.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      socialSharing: { mode: 'private' },
    }));
  });

});
