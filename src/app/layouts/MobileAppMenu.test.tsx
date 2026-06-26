import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { MobileAppMenu } from '@/app/layouts/MobileAppMenu';

function renderMenu(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <MobileAppMenu />
    </MemoryRouter>,
  );
}

describe('MobileAppMenu', () => {
  it('rend accessibles les écrans absents de la navigation basse', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: 'Ouvrir le menu de l’application' }));

    expect(screen.getByRole('dialog', { name: 'Menu SportPilot' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Mes entraînements/ })).toHaveAttribute(
      'href',
      '/strength/sessions',
    );
    expect(screen.getByRole('link', { name: /Historique/ })).toHaveAttribute('href', '/history');
    expect(screen.getByRole('link', { name: /Sauvegarde/ })).toHaveAttribute('href', '/backup');
    expect(screen.getByRole('link', { name: /Informations sur les calculs/ })).toHaveAttribute(
      'href',
      '/information/calculations',
    );
  });

  it('se ferme avec Échap et restitue le focus au bouton d’origine', async () => {
    const user = userEvent.setup();
    renderMenu();

    const trigger = screen.getByRole('button', { name: 'Ouvrir le menu de l’application' });
    await user.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('indique qu’une route secondaire est active', () => {
    renderMenu('/strength/sessions');

    expect(screen.getByRole('button', { name: 'Ouvrir le menu de l’application' })).toHaveClass(
      'bg-brand-100',
    );
  });
});
