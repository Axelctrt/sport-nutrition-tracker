import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { HistoryPeriodControls } from '@/features/history/components/HistoryPeriodControls';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-06-25T12:00:00.000Z'));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('HistoryPeriodControls', () => {
  it('propose des périodes rapides adaptées au mobile', () => {
    const onChange = vi.fn();

    render(<HistoryPeriodControls from="2026-05-29" to="2026-06-25" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '7 jours' }));
    expect(onChange).toHaveBeenCalledWith('2026-06-19', '2026-06-25');
    expect(screen.getByText('Période personnalisée')).toBeInTheDocument();
  });
});
