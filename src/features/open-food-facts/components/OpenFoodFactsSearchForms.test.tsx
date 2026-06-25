import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OpenFoodFactsSearchForms } from '@/features/open-food-facts/components/OpenFoodFactsSearchForms';

afterEach(cleanup);

describe('OpenFoodFactsSearchForms', () => {
  it('affiche un seul mode à la fois et conserve une saisie mobile directe', async () => {
    const user = userEvent.setup();
    const onTextSearch = vi.fn(async () => undefined);
    const onBarcodeSearch = vi.fn(async () => undefined);
    render(
      <OpenFoodFactsSearchForms
        loading={false}
        onTextSearch={onTextSearch}
        onBarcodeSearch={onBarcodeSearch}
      />,
    );

    expect(screen.getByRole('searchbox', { name: /Nom ou marque/ })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /Code-barres/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Code-barres/ }));
    const barcode = screen.getByRole('textbox', { name: /Code-barres/ });
    await waitFor(() => expect(barcode).toHaveFocus());
    expect(screen.queryByRole('searchbox', { name: /Nom ou marque/ })).not.toBeInTheDocument();

    await user.type(barcode, '3017624010701');
    await user.click(screen.getByRole('button', { name: 'Rechercher le code' }));

    expect(onBarcodeSearch).toHaveBeenCalledWith('3017624010701');
    expect(onTextSearch).not.toHaveBeenCalled();
  });
});
