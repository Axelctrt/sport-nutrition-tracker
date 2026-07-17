import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { useOnboardingFlow } from '@/features/onboarding/hooks/useOnboardingFlow';

const steps = [{ id: 'one' }, { id: 'two' }] as const;

function FlowHarness({ operation }: { operation: () => Promise<void> }) {
  const flow = useOnboardingFlow({ steps });
  const [result, setResult] = useState('idle');

  return (
    <div>
      <h1 ref={flow.headingRef} tabIndex={-1}>{flow.state.currentStepId}</h1>
      <button type="button" onClick={flow.goNext}>Suivant</button>
      <button
        type="button"
        onClick={() => {
          void flow.runSubmission(operation).then((started) => {
            setResult(started ? 'started' : 'blocked');
          });
        }}
      >
        Envoyer
      </button>
      <output>{flow.state.submissionStatus}:{result}</output>
    </div>
  );
}

describe('useOnboardingFlow', () => {
  it('focalise le titre sans déplacer la page après une transition', async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });

    render(<FlowHarness operation={async () => undefined} />);
    await user.click(screen.getByRole('button', { name: 'Suivant' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'two' })).toHaveFocus();
    });
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('empêche une double soumission concurrente', async () => {
    const user = userEvent.setup();
    let resolveOperation: () => void = () => undefined;
    const operation = vi.fn(() => new Promise<void>((resolve) => {
      resolveOperation = resolve;
    }));

    render(<FlowHarness operation={operation} />);
    const submitButton = screen.getByRole('button', { name: 'Envoyer' });

    await user.click(submitButton);
    await user.click(submitButton);

    expect(operation).toHaveBeenCalledTimes(1);
    expect(screen.getByText('submitting:blocked')).toBeInTheDocument();

    resolveOperation();
    await act(async () => undefined);
    expect(screen.getByText('idle:started')).toBeInTheDocument();
  });
});
