import { render, screen } from '@testing-library/react';
import { CalculationsInformationPage } from '@/features/information/pages/CalculationsInformationPage';

describe('CalculationsInformationPage', () => {
  it('documente les calculs de musculation et leur caractère estimatif', () => {
    render(<CalculationsInformationPage />);

    expect(screen.getByRole('heading', { name: 'Musculation et progression' })).toBeInTheDocument();
    expect(screen.getByText(/Volume d’une série = charge × répétitions/)).toBeInTheDocument();
    expect(screen.getByText(/1RM estimé selon Epley/)).toBeInTheDocument();
    expect(screen.getByText(/Une hausse de charge est seulement proposée/)).toBeInTheDocument();
  });
});
