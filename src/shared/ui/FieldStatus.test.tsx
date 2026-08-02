import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FieldStatus } from '@/shared/ui/FieldStatus';

describe('FieldStatus', () => {
  it.each([
    ['checking', 'Vérification en cours…'],
    ['valid', 'Identifiant disponible.'],
    ['invalid', 'Format incorrect.'],
    ['unavailable', 'Identifiant indisponible.'],
    ['error', 'Vérification impossible.'],
  ] as const)('rend l’état %s dans une région polie', (state, message) => {
    render(<FieldStatus state={state}>{message}</FieldStatus>);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-atomic', 'true');
    expect(status).toHaveAttribute('data-field-status', state);
    expect(status).toHaveTextContent(message);
  });
});
