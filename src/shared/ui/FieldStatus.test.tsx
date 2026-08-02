import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FieldStatus } from '@/shared/ui/FieldStatus';

describe('FieldStatus', () => {
  it.each([
    ['checking', 'Vérification…'],
    ['valid', 'Identifiant disponible.'],
  ] as const)('rend l’état %s dans une région de statut polie avec son icône', (state, message) => {
    render(<FieldStatus state={state}>{message}</FieldStatus>);

    const status = screen.getByRole('status');
    const icon = status.querySelector(`[data-field-status-icon="${state}"]`);
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-atomic', 'true');
    expect(status).toHaveAttribute('data-field-status', state);
    expect(status).toHaveTextContent(message);
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });

  it.each([
    ['invalid', 'Format incorrect.'],
    ['unavailable', 'Identifiant indisponible.'],
    ['error', 'Vérification impossible.'],
  ] as const)('rend l’état %s comme alerte explicite, textuelle et illustrée', (state, message) => {
    render(<FieldStatus state={state}>{message}</FieldStatus>);

    const alert = screen.getByRole('alert');
    const icon = alert.querySelector(`[data-field-status-icon="${state}"]`);
    expect(alert).toHaveAttribute('aria-live', 'polite');
    expect(alert).toHaveAttribute('aria-atomic', 'true');
    expect(alert).toHaveAttribute('data-field-status', state);
    expect(alert).toHaveTextContent(message);
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });

  it('distingue visuellement une erreur de service d’un identifiant invalide', () => {
    const { rerender } = render(<FieldStatus state="error">Service indisponible.</FieldStatus>);
    expect(screen.getByRole('alert')).toHaveClass('text-amber-800', 'dark:text-amber-200');

    rerender(<FieldStatus state="invalid">Format incorrect.</FieldStatus>);
    expect(screen.getByRole('alert')).toHaveClass('text-red-700', 'dark:text-red-300');
  });
});
