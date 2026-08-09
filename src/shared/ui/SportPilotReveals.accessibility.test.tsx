import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState, type ReactNode } from 'react';

import { SportPilotBadgeReveal } from '@/shared/ui/SportPilotBadgeReveal';
import { SportPilotDailyCompletionReveal } from '@/shared/ui/SportPilotDailyCompletionReveal';
import { SportPilotEventReveal } from '@/shared/ui/SportPilotEventReveal';
import { SportPilotOnboardingCompleteReveal } from '@/shared/ui/SportPilotOnboardingCompleteReveal';
import motionCss from '@/shared/ui/uxMotionPolish.css?raw';

interface RevealCase {
  key: string;
  dialogName: string;
  initialFocusName: string;
  renderReveal: (onContinue: () => void) => ReactNode;
}

const revealCases: RevealCase[] = [
  {
    key: 'badge',
    dialogName: 'Série régulière',
    initialFocusName: 'Continuer',
    renderReveal: (onContinue) => (
      <SportPilotBadgeReveal
        name="Série régulière"
        description="Sept jours consécutifs"
        onContinue={onContinue}
        onViewRewards={vi.fn()}
      />
    ),
  },
  {
    key: 'daily-completion',
    dialogName: 'Journée complétée',
    initialFocusName: 'Continuer',
    renderReveal: (onContinue) => (
      <SportPilotDailyCompletionReveal onContinue={onContinue} />
    ),
  },
  {
    key: 'event',
    dialogName: 'Mission accomplie',
    initialFocusName: 'Continuer',
    renderReveal: (onContinue) => (
      <SportPilotEventReveal
        eyebrow="Mission hebdomadaire"
        title="Mission accomplie"
        description="La mission est terminée."
        primaryLabel="Voir le bilan"
        onPrimary={vi.fn()}
        onContinue={onContinue}
      />
    ),
  },
  {
    key: 'onboarding-complete',
    dialogName: 'Tout est prêt',
    initialFocusName: 'Découvrir mon accueil',
    renderReveal: (onContinue) => (
      <SportPilotOnboardingCompleteReveal onContinue={onContinue} />
    ),
  },
];

afterEach(() => {
  vi.restoreAllMocks();
});

function RevealHarness({
  reveal,
  onContinue,
}: {
  reveal: RevealCase;
  onContinue: () => void;
}) {
  const [open, setOpen] = useState(false);
  const close = () => {
    onContinue();
    setOpen(false);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Ouvrir {reveal.key}
      </button>
      <button type="button">Action arrière-plan</button>
      {open ? reveal.renderReveal(close) : null}
    </>
  );
}

describe.each(revealCases)('$key', (reveal) => {
  it('applique le contrat modal clavier et restaure le contexte à la fermeture', async () => {
    const onContinue = vi.fn();
    render(<RevealHarness reveal={reveal} onContinue={onContinue} />);

    const trigger = screen.getByRole('button', { name: `Ouvrir ${reveal.key}` });
    const appRoot = trigger.parentElement;
    if (!appRoot) throw new Error('Racine de test absente.');
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole('dialog', { name: reveal.dialogName });
    const initialFocus = within(dialog).getByRole('button', {
      name: reveal.initialFocusName,
    });
    await waitFor(() => expect(initialFocus).toHaveFocus());
    expect(document.body.style.overflow).toBe('hidden');
    expect(appRoot.inert).toBe(true);
    expect(appRoot).toHaveAttribute('aria-hidden', 'true');

    const buttons = within(dialog).getAllByRole('button');
    const first = buttons[0];
    const last = buttons.at(-1);
    if (!first || !last) throw new Error('Actions du reveal absentes.');

    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(first).toHaveFocus();

    first.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onContinue).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
    expect(appRoot.inert).toBeFalsy();
    expect(appRoot).not.toHaveAttribute('aria-hidden');
  });

  it('ferme par l’action prévue et restitue le focus au déclencheur', async () => {
    const onContinue = vi.fn();
    render(<RevealHarness reveal={reveal} onContinue={onContinue} />);

    const trigger = screen.getByRole('button', { name: `Ouvrir ${reveal.key}` });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: reveal.dialogName });
    const action = within(dialog).getByRole('button', {
      name: reveal.initialFocusName,
    });
    await waitFor(() => expect(action).toHaveFocus());

    fireEvent.click(action);

    expect(onContinue).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });

  it('retire son listener clavier au démontage', () => {
    const onContinue = vi.fn();
    const addEventListener = vi.spyOn(document, 'addEventListener');
    const removeEventListener = vi.spyOn(document, 'removeEventListener');
    const view = render(reveal.renderReveal(onContinue));
    const keydownRegistration = addEventListener.mock.calls
      .filter(([eventName]) => eventName === 'keydown')
      .at(-1);
    if (!keydownRegistration) throw new Error('Listener clavier non enregistré.');

    view.unmount();

    expect(removeEventListener).toHaveBeenCalledWith(
      'keydown',
      keydownRegistration[1],
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onContinue).not.toHaveBeenCalled();
    expect(document.body.style.overflow).toBe('');
  });
});

describe('reduced motion des reveals', () => {
  it('désactive les animations Badge et Daily Completion dans le contrat CSS', () => {
    const reducedMotionBlock = motionCss.slice(
      motionCss.indexOf('@media (prefers-reduced-motion: reduce)'),
    );

    expect(reducedMotionBlock).toContain('.sp-badge-reveal');
    expect(reducedMotionBlock).toContain('.sp-daily-completion');
    expect(reducedMotionBlock).toContain('animation: none !important');
  });

  it.each([
    revealCases.find(({ key }) => key === 'event'),
    revealCases.find(({ key }) => key === 'onboarding-complete'),
  ])('limite l’animation de $key à motion-safe', (reveal) => {
    if (!reveal) throw new Error('Reveal de test absent.');
    render(reveal.renderReveal(vi.fn()));

    expect(screen.getByRole('dialog', { name: reveal.dialogName }).className)
      .toContain('motion-safe:animate-');
  });
});
