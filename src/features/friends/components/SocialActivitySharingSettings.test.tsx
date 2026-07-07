import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import {
  DEFAULT_SOCIAL_ACTIVITY_GLOBAL_SHARING_POLICY,
  type SocialActivityGlobalSharingPolicy,
  type SocialActivitySharingOverride,
} from '@/domain/friends/socialActivitySharingPolicy';
import {
  SocialActivityGlobalSharingSettings,
  SocialActivityOverrideSettings,
} from '@/features/friends/components/SocialActivitySharingSettings';

function GlobalHarness() {
  const [value, setValue] = useState<SocialActivityGlobalSharingPolicy>(
    DEFAULT_SOCIAL_ACTIVITY_GLOBAL_SHARING_POLICY,
  );
  return <SocialActivityGlobalSharingSettings value={value} onChange={setValue} />;
}

function OverrideHarness() {
  const [value, setValue] = useState<SocialActivitySharingOverride>({ mode: 'inherit' });
  return <SocialActivityOverrideSettings family="strength" value={value} onChange={setValue} />;
}

describe('SocialActivitySharingSettings', () => {
  it('permet de choisir une politique globale personnalisée sans proposer les notes privées', async () => {
    const user = userEvent.setup();
    render(<GlobalHarness />);

    await user.click(screen.getByRole('button', { name: 'Personnalisé' }));

    expect(screen.getByLabelText('Calories')).toBeInTheDocument();
    expect(screen.getByLabelText('Charges')).toBeInTheDocument();
    expect(screen.queryByLabelText(/notes/i)).not.toBeInTheDocument();
    expect(screen.getByText(/restent toujours privés/u)).toBeInTheDocument();
  });

  it('limite les champs personnalisés à la famille musculation pour une séance', async () => {
    const user = userEvent.setup();
    render(<OverrideHarness />);

    await user.click(screen.getByRole('button', { name: 'Personnalisée' }));

    expect(screen.getByLabelText('Charges')).toBeInTheDocument();
    expect(screen.queryByLabelText('Distance')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Personnalisée' })).toHaveAttribute('aria-pressed', 'true');
  });
});
