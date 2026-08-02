import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FieldStatus } from '@/shared/ui/FieldStatus';

describe('FieldStatus', () => {
  it.each([
    ['checking', 'Vérification…'],
    ['valid', 'Identifiant disponible.'],
  ] as const)('rend l’état %s dans une région de statut polie', (state, message) => {
    render(<FieldStatus state={state}>{message}</FieldStatus>);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-atomic', 'true');
    expect(status).toHaveAttribute('data-field-status', state);
    expect(status).toHaveTextContent(message);
  });

  it.each([
    ['invalid', 'Format incorrect.'],
    ['unavailable', 'Identifiant indisponible.'],
    ['error', 'Vérification impossible.'],
  ] as const)('rend l’état %s comme alerte explicite et polie', (state, message) => {
    render(<FieldStatus state={state}>{message}</FieldStatus>);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'polite');
    expect(alert).toHaveAttribute('aria-atomic', 'true');
    expect(alert).toHaveAttribute('data-field-status', state);
    expect(alert).toHaveTextContent(message);
  });
});
