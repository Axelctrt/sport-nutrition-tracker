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

  it('ne présente plus de réglage social lors de l’enregistrement', async () => {
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

    expect(screen.queryByText('Partage avec les amis')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Privée' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Résumé' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(onSubmit.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      socialSharing: { mode: 'inherit' },
    }));
  });


  it('conserve une liaison explicite lorsque l’activité réelle change de date', async () => {
    const user = userEvent.setup();
    const settings = createDefaultAppSettings();
    const onSubmit = vi.fn(async (_values: ActivityFormValues) => undefined);
    const initialValues = {
      ...defaultActivityFormValues('running', settings),
      date: '2026-07-14',
    };

    render(
      <ActivityForm
        initialValues={initialValues}
        allowedTypes={['running']}
        settings={settings}
        calculationWeightKg={70}
        calculationWeightSource="poids de test"
        submitLabel="Enregistrer"
        onDateChange={vi.fn()}
        plannedActivityOptions={[{
          key: 'endurancePlanning:planned-run',
          reference: { source: 'endurancePlanning', sourceId: 'planned-run' },
          title: 'Footing prévu',
          date: '2026-07-13',
          activityType: 'running',
        }]}
        onSubmit={onSubmit}
      />,
    );

    const linkSelect = screen.getByLabelText('Séance prévue associée');
    await user.selectOptions(linkSelect, 'endurancePlanning:planned-run');
    await user.clear(screen.getByLabelText(/Date/));
    await user.type(screen.getByLabelText(/Date/), '2026-07-15');

    expect(linkSelect).toHaveValue('endurancePlanning:planned-run');

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(onSubmit.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      date: '2026-07-15',
      plannedActivityKey: 'endurancePlanning:planned-run',
    }));
  });

});
