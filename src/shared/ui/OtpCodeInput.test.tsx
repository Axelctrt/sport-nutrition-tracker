import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OtpCodeInput } from '@/shared/ui/OtpCodeInput';

function OtpHarness({
  disabled = false,
  invalid = false,
}: {
  disabled?: boolean;
  invalid?: boolean;
}) {
  const [value, setValue] = useState('');

  return (
    <div>
      <label htmlFor="otp-code">Code de connexion</label>
      <p id="otp-help">Huit caractères alphanumériques.</p>
      <OtpCodeInput
        aria-describedby="otp-help"
        aria-invalid={invalid}
        autoFocus
        disabled={disabled}
        id="otp-code"
        onValueChange={setValue}
        value={value}
      />
      <output data-testid="otp-value">{value}</output>
    </div>
  );
}

describe('OtpCodeInput', () => {
  it('rend un seul champ accessible et huit cellules visuelles', () => {
    render(<OtpHarness />);

    const input = screen.getByRole('textbox', { name: 'Code de connexion' });
    expect(input).toHaveAttribute('autocomplete', 'one-time-code');
    expect(input).toHaveAttribute('inputmode', 'text');
    expect(input).toHaveAttribute('autocapitalize', 'none');
    expect(input).toHaveAttribute('aria-describedby', 'otp-help');
    expect(screen.getAllByTestId(/otp-cell-/)).toHaveLength(8);
  });

  it('conserve uniquement huit caractères alphanumériques', async () => {
    const user = userEvent.setup();
    render(<OtpHarness />);

    const input = screen.getByRole('textbox', { name: 'Code de connexion' });
    await user.type(input, 'A1-B 2C3D4E5');

    expect(input).toHaveValue('A1B2C3D4');
    expect(screen.getByTestId('otp-value')).toHaveTextContent('A1B2C3D4');
  });

  it('accepte le collage complet puis la correction native', async () => {
    const user = userEvent.setup();
    render(<OtpHarness />);

    const input = screen.getByRole('textbox', {
      name: 'Code de connexion',
    }) as HTMLInputElement;
    await user.click(input);
    await user.paste('A1B2C3D4');

    expect(input).toHaveValue('A1B2C3D4');

    input.setSelectionRange(2, 4);
    await user.keyboard('ZZ');

    expect(input).toHaveValue('A1ZZC3D4');

    await user.keyboard('{Backspace}');
    expect(input).toHaveValue('A1ZC3D4');
  });

  it('conserve le focus natif et positionne le curseur depuis la zone touchée', async () => {
    render(<OtpHarness />);

    const input = screen.getByRole('textbox', {
      name: 'Code de connexion',
    }) as HTMLInputElement;
    input.blur();
    vi.spyOn(input, 'getBoundingClientRect').mockReturnValue({
      bottom: 48,
      height: 48,
      left: 0,
      right: 320,
      top: 0,
      width: 320,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.click(input, { clientX: 140 });

    expect(input).toHaveFocus();
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(0);
  });

  it('laisse le champ réel sélectionnable pour le copier-coller natif', async () => {
    const user = userEvent.setup();
    render(<OtpHarness />);

    const input = screen.getByRole('textbox', {
      name: 'Code de connexion',
    }) as HTMLInputElement;
    await user.type(input, 'A1B2C3D4');
    input.setSelectionRange(0, 8);

    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(8);
    expect(input).toHaveValue('A1B2C3D4');
  });

  it('propage les états invalide et désactivé', () => {
    render(<OtpHarness disabled invalid />);

    const input = screen.getByRole('textbox', { name: 'Code de connexion' });
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });
});
