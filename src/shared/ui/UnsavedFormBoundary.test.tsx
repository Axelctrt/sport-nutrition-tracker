import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { UnsavedFormBoundary } from '@/shared/ui/UnsavedFormBoundary';

function Harness({ resetKey = 'initial' }: { resetKey?: string }) {
  const [dirty, setDirty] = useState(false);

  return (
    <>
      <output data-testid="dirty-state">{dirty ? 'dirty' : 'clean'}</output>
      <UnsavedFormBoundary resetKey={resetKey} onDirtyChange={setDirty}>
        <form>
          <label>
            Nom
            <input name="name" defaultValue="Initial" />
          </label>
          <button
            type="button"
            onClick={(event) => {
              const form = event.currentTarget.form;
              const input = form?.elements.namedItem('name');
              if (input instanceof HTMLInputElement) input.value = 'Programmatique';
            }}
          >
            Modifier
          </button>
        </form>
      </UnsavedFormBoundary>
    </>
  );
}

describe('UnsavedFormBoundary', () => {
  it('reste propre à l’initialisation puis détecte une saisie', async () => {
    render(<Harness />);

    await vi.waitFor(() => expect(screen.getByTestId('dirty-state')).toHaveTextContent('clean'));
    fireEvent.input(screen.getByRole('textbox', { name: 'Nom' }), {
      target: { value: 'Modifié' },
    });

    await vi.waitFor(() => expect(screen.getByTestId('dirty-state')).toHaveTextContent('dirty'));
  });

  it('détecte une modification programmatique déclenchée par un contrôle', async () => {
    render(<Harness />);

    await vi.waitFor(() => expect(screen.getByTestId('dirty-state')).toHaveTextContent('clean'));
    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }));

    await vi.waitFor(() => expect(screen.getByTestId('dirty-state')).toHaveTextContent('dirty'));
  });

  it('réinitialise la référence lorsque resetKey change', async () => {
    const { rerender } = render(<Harness resetKey="a" />);
    fireEvent.input(screen.getByRole('textbox', { name: 'Nom' }), {
      target: { value: 'Modifié' },
    });
    await vi.waitFor(() => expect(screen.getByTestId('dirty-state')).toHaveTextContent('dirty'));

    rerender(<Harness resetKey="b" />);

    await vi.waitFor(() => expect(screen.getByTestId('dirty-state')).toHaveTextContent('clean'));
  });
});
