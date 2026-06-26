import { cleanup, render, screen } from '@testing-library/react';
import { CalibrationAdjustmentCard } from '@/features/weekly-review/components/CalibrationAdjustmentCard';
import { createAcceptedAdjustment } from '@/test/factories/weeklyReviewFactory';

afterEach(cleanup);

describe('CalibrationAdjustmentCard', () => {
  it('affiche la variation, le cumul et le statut', () => {
    render(<CalibrationAdjustmentCard adjustment={createAcceptedAdjustment()} />);

    expect(screen.getByText('Actif')).toBeInTheDocument();
    expect(screen.getAllByText('+100 kcal/j')).toHaveLength(2);
    expect(screen.getByText(/À partir du/)).toBeInTheDocument();
  });
});
