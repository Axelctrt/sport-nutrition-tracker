import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { FoodProductEditorPage } from '@/features/products/pages/FoodProductEditorPage';

describe('FoodProductEditorPage', () => {
  it('préremplit le code-barres après un scan inconnu', async () => {
    render(
      <MemoryRouter initialEntries={['/food/products/new?returnDate=2026-06-24&returnSlot=lunch&barcode=3017624010701']}>
        <Routes>
          <Route path="/food/products/new" element={<FoodProductEditorPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText('Code-barres')).toHaveValue('3017624010701');
    expect(screen.getByRole('link', { name: 'Retour au choix de l’aliment' })).toHaveAttribute(
      'href',
      '/food/select?date=2026-06-24&slot=lunch',
    );
  });
});
