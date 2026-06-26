import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { vi } from 'vitest';
import { useCenterExpandedContent } from '@/shared/hooks/useCenterExpandedContent';

function ExpandableHarness() {
  useCenterExpandedContent();
  const [open, setOpen] = useState(false);

  return (
    <section>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="content"
        onClick={() => setOpen((current) => !current)}
      >
        Détails
      </button>
      {open ? <div id="content">Contenu développé</div> : null}
    </section>
  );
}

describe('useCenterExpandedContent', () => {
  it('centre le contenu après son ouverture', async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: scrollIntoView,
    });

    render(<ExpandableHarness />);
    await user.click(screen.getByRole('button', { name: 'Détails' }));

    await vi.waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: 'center' }));
    });
  });
});
