import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import { StoragePersistenceCard } from '@/features/backup/components/StoragePersistenceCard';

describe('StoragePersistenceCard', () => {
  it('affiche un stockage déjà protégé', async () => {
    render(
      <StoragePersistenceCard
        loadStatus={() =>
          Promise.resolve({
            state: 'persistent',
            canRequest: false,
          })
        }
      />,
    );

    expect(
      await screen.findByText(
        /Le navigateur protège davantage IndexedDB/,
      ),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole('button', {
        name: 'Renforcer la protection',
      }),
    ).not.toBeInTheDocument();
  });

  it('demande puis confirme localement la protection renforcée', async () => {
    const requestPersistence = vi.fn().mockResolvedValue({
      state: 'persistent',
      canRequest: false,
    });

    render(
      <StoragePersistenceCard
        loadStatus={() =>
          Promise.resolve({
            state: 'best-effort',
            canRequest: true,
          })
        }
        requestPersistence={requestPersistence}
      />,
    );

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Renforcer la protection',
      }),
    );

    await waitFor(() => {
      expect(requestPersistence).toHaveBeenCalledTimes(1);
      expect(
        screen.getByRole('status', { name: /Protection renforcée activée/i }),
      ).toBeInTheDocument();
    });
  });

  it('explique un refus du navigateur', async () => {
    render(
      <StoragePersistenceCard
        loadStatus={() =>
          Promise.resolve({
            state: 'best-effort',
            canRequest: true,
          })
        }
        requestPersistence={() =>
          Promise.resolve({
            state: 'best-effort',
            canRequest: true,
          })
        }
      />,
    );

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Renforcer la protection',
      }),
    );

    expect(
      await screen.findByText('Protection non accordée'),
    ).toBeInTheDocument();
  });

  it('affiche une erreur locale unique lorsque la demande échoue', async () => {
    render(
      <StoragePersistenceCard
        loadStatus={() =>
          Promise.resolve({
            state: 'best-effort',
            canRequest: true,
          })
        }
        requestPersistence={() => Promise.reject(new Error('Navigateur indisponible.'))}
      />,
    );

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Renforcer la protection',
      }),
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Demande impossible');
    expect(alert).toHaveTextContent('Navigateur indisponible.');
    expect(screen.getAllByText('Demande impossible')).toHaveLength(1);
  });

  it('reste explicite lorsque l’API est indisponible', async () => {
    render(
      <StoragePersistenceCard
        loadStatus={() =>
          Promise.resolve({
            state: 'unsupported',
            canRequest: false,
          })
        }
      />,
    );

    expect(
      await screen.findByText(
        /Ce navigateur ne permet pas de vérifier/,
      ),
    ).toBeInTheDocument();
  });
});
