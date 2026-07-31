import { render, screen } from '@testing-library/react';

import {
  GlobalBannerCoordinatorProvider,
  type GlobalBannerKind,
  useGlobalBannerVisibility,
} from '@/shared/global-banner/GlobalBannerCoordinator';

function BannerProbe({
  id,
  kind,
  active = true,
  label,
}: {
  id: string;
  kind: GlobalBannerKind;
  active?: boolean;
  label: string;
}) {
  const visible = useGlobalBannerVisibility(id, kind, active);
  return visible ? <p>{label}</p> : null;
}

describe('GlobalBannerCoordinator', () => {
  it('n’affiche que la bannière active de plus haute priorité', async () => {
    render(
      <GlobalBannerCoordinatorProvider>
        <BannerProbe id="routine" kind="routine-reminder" label="Rappel" />
        <BannerProbe id="update" kind="pwa-update" label="Mise à jour" />
        <BannerProbe id="offline" kind="offline" label="Hors ligne" />
      </GlobalBannerCoordinatorProvider>,
    );

    expect(await screen.findByText('Hors ligne')).toBeInTheDocument();
    expect(screen.queryByText('Mise à jour')).not.toBeInTheDocument();
    expect(screen.queryByText('Rappel')).not.toBeInTheDocument();
  });

  it('révèle automatiquement la priorité suivante lorsque la première disparaît', async () => {
    const { rerender } = render(
      <GlobalBannerCoordinatorProvider>
        <BannerProbe id="update" kind="pwa-update" label="Mise à jour" />
        <BannerProbe id="offline" kind="offline" label="Hors ligne" />
      </GlobalBannerCoordinatorProvider>,
    );

    expect(await screen.findByText('Hors ligne')).toBeInTheDocument();

    rerender(
      <GlobalBannerCoordinatorProvider>
        <BannerProbe id="update" kind="pwa-update" label="Mise à jour" />
        <BannerProbe id="offline" kind="offline" active={false} label="Hors ligne" />
      </GlobalBannerCoordinatorProvider>,
    );

    expect(await screen.findByText('Mise à jour')).toBeInTheDocument();
    expect(screen.queryByText('Hors ligne')).not.toBeInTheDocument();
  });

  it('préserve le rendu autonome hors du fournisseur', () => {
    render(<BannerProbe id="standalone" kind="pwa-ready" label="Autonome" />);
    expect(screen.getByText('Autonome')).toBeInTheDocument();
  });
});
