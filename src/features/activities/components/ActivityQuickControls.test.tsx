import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ActivityQuickControls } from '@/features/activities/components/ActivityQuickControls';

describe('ActivityQuickControls', () => {
  it('applique un raccourci de durée et une intensité', async () => {
    const user = userEvent.setup();
    const onDurationChange = vi.fn();
    const onIntensityChange = vi.fn();

    render(
      <ActivityQuickControls
        durationMinutes={45}
        intensity="moderate"
        onDurationChange={onDurationChange}
        onIntensityChange={onIntensityChange}
      />,
    );

    expect(screen.getByRole('button', { name: '45 minutes' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Modérée' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: '60 minutes' }));
    await user.click(screen.getByRole('button', { name: 'Élevée' }));

    expect(onDurationChange).toHaveBeenCalledWith(60);
    expect(onIntensityChange).toHaveBeenCalledWith('high');
  });
});
