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
  it('rend accessibles les réglages absents de la navigation basse', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: 'Ouvrir le menu de l’application' }));

    expect(screen.getByRole('dialog', { name: 'Menu SportPilot' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Compte et appareils/ })).toHaveAttribute(
      'href',
      '/settings/account-devices',
    );
    expect(screen.getByRole('link', { name: /Sauvegarde/ })).toHaveAttribute('href', '/backup');
    expect(screen.getByRole('link', { name: /Comprendre les calculs/ })).toHaveAttribute(
      'href',
      '/information/calculations',
    );
  });

  it('regroupe les destinations par usage sans dupliquer Sport et Progression', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: 'Ouvrir le menu de l’application' }));

    expect(screen.getByRole('heading', { name: 'Compte' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Application' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Données' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Informations' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sport' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Progression' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Planning hebdomadaire/ })).not.toBeInTheDocument();
  });

  it('se ferme avec Échap et restitue le focus au bouton d’origine', async () => {
    const user = userEvent.setup();
    renderMenu();

    const trigger = screen.getByRole('button', { name: 'Ouvrir le menu de l’application' });
    expect(trigger).toHaveClass('size-[var(--sp-touch-target)]');
    await user.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('indique qu’une route secondaire regroupée est active', () => {
    renderMenu('/settings/account-sync');

    expect(screen.getByRole('button', { name: 'Ouvrir le menu de l’application' })).toHaveClass(
      'bg-brand-100',
    );
  });


  it('ne sélectionne que Rappels sur sa route dédiée', async () => {
    const user = userEvent.setup();
    renderMenu('/settings/notifications-routines');

    await user.click(screen.getByRole('button', { name: 'Ouvrir le menu de l’application' }));

    expect(screen.getByRole('link', { name: /^Rappels/ })).toHaveClass(
      'bg-brand-50',
    );
    expect(screen.getByRole('link', { name: /Affichage de l’Accueil/ })).not.toHaveClass(
      'bg-brand-50',
    );
  });

  it('ne sélectionne que Corbeille sur sa route dédiée', async () => {
    const user = userEvent.setup();
    renderMenu('/backup/trash');

    await user.click(screen.getByRole('button', { name: 'Ouvrir le menu de l’application' }));

    expect(screen.getByRole('link', { name: /Corbeille/ })).toHaveClass(
      'bg-brand-50',
    );
    expect(screen.getByRole('link', { name: /^Sauvegarde/ })).not.toHaveClass(
      'bg-brand-50',
    );
  });

  it.each(['/profile', '/settings'])(
    'ne marque pas le menu complet sur les routes dédiées %s',
    (initialEntry) => {
      renderMenu(initialEntry);

      expect(
        screen.getByRole('button', {
          name: 'Ouvrir le menu de l’application',
        }),
      ).not.toHaveClass('bg-brand-100');
    },
  );
});
