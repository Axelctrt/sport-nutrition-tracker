import { useState } from 'react';
import { render, screen } from '@testing-library/react';
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
      <p id="otp-help">Six caractères alphanumériques.</p>
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
  it('rend un seul champ accessible et six cellules visuelles', () => {
    render(<OtpHarness />);

    const input = screen.getByRole('textbox', { name: 'Code de connexion' });
    expect(input).toHaveAttribute('autocomplete', 'one-time-code');
    expect(input).toHaveAttribute('inputmode', 'text');
    expect(input).toHaveAttribute('autocapitalize', 'none');
    expect(input).toHaveAttribute('aria-describedby', 'otp-help');
    expect(screen.getAllByTestId(/otp-cell-/)).toHaveLength(6);
  });

  it('conserve uniquement six caractères alphanumériques', async () => {
    const user = userEvent.setup();
    render(<OtpHarness />);

    const input = screen.getByRole('textbox', { name: 'Code de connexion' });
    await user.type(input, 'A1-B 2C3D');

    expect(input).toHaveValue('A1B2C3');
    expect(screen.getByTestId('otp-value')).toHaveTextContent('A1B2C3');
  });

  it('accepte le collage complet puis la correction native', async () => {
    const user = userEvent.setup();
    render(<OtpHarness />);

    const input = screen.getByRole('textbox', { name: 'Code de connexion' });
    await user.click(input);
    await user.paste('A1B2C3');

    expect(input).toHaveValue('A1B2C3');

    input.setSelectionRange(2, 4);
    await user.keyboard('ZZ');

    expect(input).toHaveValue('A1ZZC3');

    await user.keyboard('{Backspace}');
    expect(input).toHaveValue('A1ZC3');
  });

  it('redonne le focus au champ réel depuis une cellule', async () => {
    const user = userEvent.setup();
    render(<OtpHarness />);

    const input = screen.getByRole('textbox', { name: 'Code de connexion' });
    input.blur();

    await user.click(screen.getByTestId('otp-cell-3'));

    expect(input).toHaveFocus();
  });

  it('propage les états invalide et désactivé', () => {
    render(<OtpHarness disabled invalid />);

    const input = screen.getByRole('textbox', { name: 'Code de connexion' });
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });
});
