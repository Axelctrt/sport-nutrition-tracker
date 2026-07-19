import { MoreHorizontal } from 'lucide-react';
import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/utils/cn';

interface ActionMenuProps {
  readonly label: string;
  readonly children: ReactNode;
  readonly width?: 'default' | 'wide';
  readonly triggerClassName?: string;
}

interface MenuPosition {
  left: number;
  top: number;
  maxHeight: number;
}

const VIEWPORT_MARGIN = 8;
const MENU_GAP = 4;
const DEFAULT_MENU_WIDTH = 208;
const WIDE_MENU_WIDTH = 224;

function viewportSize(): { width: number; height: number } {
  return {
    width: Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
    height: Math.max(document.documentElement.clientHeight, window.innerHeight || 0),
  };
}

export function ActionMenu({
  label,
  children,
  width = 'default',
  triggerClassName,
}: ActionMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition>();
  const menuId = useId();
  const menuWidth = width === 'wide' ? WIDE_MENU_WIDTH : DEFAULT_MENU_WIDTH;

  const close = (restoreFocus = false) => {
    setOpen(false);
    setPosition(undefined);
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  };

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;

      const triggerRect = trigger.getBoundingClientRect();
      const { width: viewportWidth, height: viewportHeight } = viewportSize();
      const measuredHeight = menu.getBoundingClientRect().height || menu.scrollHeight || 160;
      const spaceBelow = viewportHeight - triggerRect.bottom - MENU_GAP - VIEWPORT_MARGIN;
      const spaceAbove = triggerRect.top - MENU_GAP - VIEWPORT_MARGIN;
      const placeAbove = measuredHeight > spaceBelow && spaceAbove > spaceBelow;
      const availableHeight = Math.max(96, placeAbove ? spaceAbove : spaceBelow);
      const renderedHeight = Math.min(measuredHeight, availableHeight);
      const left = Math.min(
        viewportWidth - menuWidth - VIEWPORT_MARGIN,
        Math.max(VIEWPORT_MARGIN, triggerRect.right - menuWidth),
      );
      const top = placeAbove
        ? Math.max(VIEWPORT_MARGIN, triggerRect.top - MENU_GAP - renderedHeight)
        : Math.min(
            viewportHeight - VIEWPORT_MARGIN - renderedHeight,
            triggerRect.bottom + MENU_GAP,
          );

      setPosition({ left, top, maxHeight: availableHeight });
    };

    updatePosition();
    const frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [menuWidth, open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      close(true);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !position) return;
    const firstAction = menuRef.current?.querySelector<HTMLElement>(
      'a[href], button:not(:disabled), [role="menuitem"]',
    );
    firstAction?.focus();
  }, [open, position]);

  const handleMenuClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target as Element;
    if (target.closest('a[href], button, [role="menuitem"]')) close();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        className={cn(
          'grid size-11 shrink-0 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30 dark:text-slate-300 dark:hover:bg-slate-800',
          triggerClassName,
        )}
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontal aria-hidden="true" className="size-5" />
      </button>

      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label={label}
              className={cn(
                'fixed z-[120] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900',
                !position && 'invisible',
              )}
              style={{
                left: position?.left ?? VIEWPORT_MARGIN,
                top: position?.top ?? VIEWPORT_MARGIN,
                width: menuWidth,
                maxHeight: position?.maxHeight ?? 'calc(100dvh - 1rem)',
              }}
              onClick={handleMenuClick}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
