import { LoaderCircle, MoreHorizontal, type LucideIcon } from 'lucide-react';
import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Link, type LinkProps } from 'react-router-dom';
import { BottomSheet } from '@/shared/ui/BottomSheet';
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

export type ActionMenuItemTone = 'default' | 'danger';

interface CanonicalActionProps {
  readonly children: ReactNode;
  readonly icon?: LucideIcon | undefined;
  readonly tone?: ActionMenuItemTone;
  readonly loading?: boolean;
  readonly loadingLabel?: string | undefined;
}

export interface ActionMenuItemProps
  extends CanonicalActionProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {}

export interface ActionMenuLinkProps
  extends CanonicalActionProps,
    Omit<LinkProps, 'children'> {}

export interface ActionMenuGroupProps extends HTMLAttributes<HTMLDivElement> {
  readonly label?: string;
}

const VIEWPORT_MARGIN = 8;
const MENU_GAP = 4;
const DEFAULT_MENU_WIDTH = 208;
const WIDE_MENU_WIDTH = 224;
const TABLET_BREAKPOINT_PX = 640;
const MENU_ITEM_SELECTOR = [
  '[role="menuitem"]:not([aria-disabled="true"])',
  'button:not(:disabled)',
  'a[href]',
].join(',');

function viewportSize(): { width: number; height: number } {
  return {
    width: Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
    height: Math.max(document.documentElement.clientHeight, window.innerHeight || 0),
  };
}

function isTabletViewport(): boolean {
  if (typeof window === 'undefined') return true;
  return Math.max(document.documentElement.clientWidth, window.innerWidth || 0)
    >= TABLET_BREAKPOINT_PX;
}

function useTabletViewport(): boolean {
  const [tablet, setTablet] = useState(isTabletViewport);

  useEffect(() => {
    const update = () => setTablet(isTabletViewport());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return tablet;
}

function canonicalActionClassName(tone: ActionMenuItemTone): string {
  return cn(
    'flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30',
    'disabled:cursor-not-allowed disabled:opacity-60',
    tone === 'danger'
      ? 'text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40'
      : 'text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800',
  );
}

function CanonicalActionContent({
  children,
  icon: Icon,
  loading = false,
  loadingLabel,
}: CanonicalActionProps) {
  return (
    <>
      {loading ? (
        <LoaderCircle
          aria-hidden="true"
          className="size-5 shrink-0 motion-safe:animate-spin motion-reduce:animate-none"
        />
      ) : Icon ? (
        <Icon aria-hidden="true" className="size-5 shrink-0" />
      ) : null}
      <span className="min-w-0 flex-1">{loading && loadingLabel ? loadingLabel : children}</span>
    </>
  );
}

export function ActionMenuItem({
  children,
  className,
  icon,
  tone = 'default',
  loading = false,
  loadingLabel,
  disabled,
  type = 'button',
  ...props
}: ActionMenuItemProps) {
  return (
    <button
      type={type}
      role="menuitem"
      data-action-menu-item
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(canonicalActionClassName(tone), className)}
      {...props}
    >
      <CanonicalActionContent
        icon={icon}
        tone={tone}
        loading={loading}
        loadingLabel={loadingLabel}
      >
        {children}
      </CanonicalActionContent>
    </button>
  );
}

export function ActionMenuLink({
  children,
  className,
  icon,
  tone = 'default',
  loading = false,
  loadingLabel,
  ...props
}: ActionMenuLinkProps) {
  return (
    <Link
      role="menuitem"
      data-action-menu-item
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      className={cn(canonicalActionClassName(tone), loading && 'pointer-events-none opacity-60', className)}
      {...props}
    >
      <CanonicalActionContent
        icon={icon}
        tone={tone}
        loading={loading}
        loadingLabel={loadingLabel}
      >
        {children}
      </CanonicalActionContent>
    </Link>
  );
}

export function ActionMenuGroup({
  children,
  className,
  label,
  ...props
}: ActionMenuGroupProps) {
  return (
    <div
      role={label ? 'group' : 'none'}
      aria-label={label}
      className={cn('grid gap-1', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function ActionMenuSeparator({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="separator"
      className={cn('my-1 border-t border-slate-200 dark:border-slate-700', className)}
      {...props}
    />
  );
}

function focusRelativeMenuItem(container: HTMLElement, current: Element, direction: 1 | -1) {
  const items = Array.from(container.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR));
  if (items.length === 0) return;
  const currentIndex = items.findIndex((item) => item === current || item.contains(current));
  const nextIndex = currentIndex < 0
    ? direction > 0 ? 0 : items.length - 1
    : (currentIndex + direction + items.length) % items.length;
  items[nextIndex]?.focus();
}

function handleMenuNavigation(event: React.KeyboardEvent<HTMLElement>) {
  const container = event.currentTarget;
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    focusRelativeMenuItem(container, event.target as Element, event.key === 'ArrowDown' ? 1 : -1);
    return;
  }
  if (event.key !== 'Home' && event.key !== 'End') return;
  event.preventDefault();
  const items = Array.from(container.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR));
  const target = event.key === 'Home' ? items[0] : items.at(-1);
  target?.focus();
}

export function ActionMenu({
  label,
  children,
  width = 'default',
  triggerClassName,
}: ActionMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const desktopInitialFocusAppliedRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition>();
  const menuId = useId();
  const tabletViewport = useTabletViewport();
  const menuWidth = width === 'wide' ? WIDE_MENU_WIDTH : DEFAULT_MENU_WIDTH;

  const close = (restoreFocus = false) => {
    setOpen(false);
    setPosition(undefined);
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  };

  useLayoutEffect(() => {
    if (!open || !tabletViewport) return;

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
  }, [menuWidth, open, tabletViewport]);

  useEffect(() => {
    if (!open || !tabletViewport) return;

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
  }, [open, tabletViewport]);

  useEffect(() => {
    desktopInitialFocusAppliedRef.current = false;
  }, [open, tabletViewport]);

  useEffect(() => {
    if (
      !open
      || !tabletViewport
      || !position
      || desktopInitialFocusAppliedRef.current
    ) return;
    desktopInitialFocusAppliedRef.current = true;
    menuRef.current?.querySelector<HTMLElement>(MENU_ITEM_SELECTOR)?.focus();
  }, [open, position, tabletViewport]);

  useEffect(() => {
    if (!open || tabletViewport) return;
    const frame = window.requestAnimationFrame(() => {
      mobileMenuRef.current?.querySelector<HTMLElement>(MENU_ITEM_SELECTOR)?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, tabletViewport]);

  const handleMenuClick = (event: ReactMouseEvent<HTMLElement>) => {
    const target = event.target as Element;
    if (target.closest('a[href], button, [role="menuitem"]')) close();
  };

  const actionSurface = (
    <div
      ref={tabletViewport ? undefined : mobileMenuRef}
      role="menu"
      aria-label={label}
      className="grid gap-1"
      onClick={handleMenuClick}
      onKeyDown={handleMenuNavigation}
    >
      {children}
    </div>
  );

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

      {!tabletViewport ? (
        <BottomSheet
          open={open}
          title={label}
          closeLabel="Fermer les actions"
          initialFocusSelector={MENU_ITEM_SELECTOR}
          onClose={() => close()}
          className="max-w-none"
        >
          <div id={menuId}>{actionSurface}</div>
        </BottomSheet>
      ) : open && typeof document !== 'undefined' ? (
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
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
          >
            {actionSurface}
          </div>,
          document.body,
        )
      ) : null}
    </>
  );
}
