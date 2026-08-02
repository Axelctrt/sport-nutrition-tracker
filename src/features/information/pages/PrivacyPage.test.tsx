import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProfileContext } from '@/app/providers/profile/ProfileContext';
import { PrivacyPage } from '@/features/information/pages/PrivacyPage';

function renderPage(hasProfile = false) {
  return render(
    <ProfileContext.Provider
      value={{
        status: 'ready',
        profile: hasProfile ? ({} as never) : undefined,
        errorMessage: undefined,
        saveProfile: vi.fn(),
        clearProfile: vi.fn(),
        refreshProfile: vi.fn(),
      }}
    >
      <MemoryRouter>
        <PrivacyPage />
      </MemoryRouter>
    </ProfileContext.Provider>,
  );
}

describe('PrivacyPage', () => {
  it('explique le stockage local, Open Food Facts, les usages photo et la suppression', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Confidentialité' })).toBeInTheDocument();
    expect(screen.getByText(/IndexedDB sur cet appareil/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Open Food Facts' })).toBeInTheDocument();
    expect(screen.getByRole('heading', {
      name: 'Caméra, scanner et photos',
    })).toBeInTheDocument();
    expect(screen.getByText(/L’analyse nutritionnelle reste locale par défaut/i)).toBeInTheDocument();
    expect(screen.getByText(/Google Gemini après ton consentement explicite/i)).toBeInTheDocument();
    expect(screen.getByText(/jamais analysées par une IA/i)).toBeInTheDocument();
    expect(screen.getByText(/ne remplace pas un médecin/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Retour à la création du profil' })).toHaveAttribute(
      'href',
      '/onboarding',
    );
  });

  it('propose un retour aux paramètres et la gestion des photos lorsqu’un profil existe', () => {
    renderPage(true);

    expect(screen.getByRole('link', { name: 'Retour aux paramètres' })).toHaveAttribute(
      'href',
      '/settings',
    );
    expect(screen.getByRole('link', { name: 'Gérer mes photos' })).toHaveAttribute(
      'href',
      '/progression/photos',
    );
  });
});
