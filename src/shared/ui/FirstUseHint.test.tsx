import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FirstUseHint } from '@/shared/ui/FirstUseHint';

beforeEach(() => window.localStorage.clear());

it('affiche l’aide une fois puis la conserve derrière une icône accessible', async () => {
  const user = userEvent.setup();
  const { rerender } = render(
    <FirstUseHint hintKey="nutrition-test" title="Composer un repas">
      Ajoute plusieurs éléments avant de terminer.
    </FirstUseHint>,
  );

  expect(screen.getByText('Ajoute plusieurs éléments avant de terminer.')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Compris' }));
  expect(screen.getByRole('button', { name: 'Aide : Composer un repas' })).toBeInTheDocument();

  rerender(
    <FirstUseHint hintKey="nutrition-test" title="Composer un repas">
      Ajoute plusieurs éléments avant de terminer.
    </FirstUseHint>,
  );
  expect(screen.queryByRole('button', { name: 'Compris' })).not.toBeInTheDocument();
});
