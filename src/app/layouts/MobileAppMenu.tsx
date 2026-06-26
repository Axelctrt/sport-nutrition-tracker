import { CircleCheck, Menu, Share, Smartphone, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router-dom';
import { mobileMoreNavigation } from '@/app/navigation';
import { usePwaEnvironment } from '@/pwa/usePwaEnvironment';
import { InstallPwaButton } from '@/shared/ui/InstallPwaButton';
import { cn } from '@/shared/utils/cn';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function pathIsActive(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function MobileAppMenu() {
  const location = useLocation();
  const { isIos, isStandalone } = usePwaEnvironment();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const isMenuRouteActive = mobileMoreNavigation.some((section) =>
    section.items.some((item) => pathIsActive(location.pathname, item.path)),
  );

  const closeMenu = () => {
    triggerRef.current?.focus();
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(() => closeRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Ouvrir le menu de l’application"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={cn(
          'inline-flex size-10 items-center justify-center rounded-xl transition-colors lg:hidden',
          isMenuRouteActive
            ? 'bg-brand-100 text-brand-900 dark:bg-brand-900/50 dark:text-brand-100'
            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
        )}
        onClick={() => setIsOpen(true)}
      >
        <Menu aria-hidden="true" className="size-5" />
      </button>

      {isOpen && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4 lg:hidden">
              <button
                type="button"
                aria-label="Fermer le menu"
                className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
                onClick={closeMenu}
              />
              <section
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="mobile-app-menu-title"
                className="safe-area-bottom relative max-h-[calc(100dvh-1rem)] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:rounded-3xl sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                      Navigation complète
                    </p>
                    <h2
                      id="mobile-app-menu-title"
                      className="mt-1 text-2xl font-bold text-slate-950 dark:text-white"
                    >
                      Menu SportPilot
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      Retrouvez les écrans moins fréquents sans encombrer la navigation basse.
                    </p>
                  </div>
                  <button
                    ref={closeRef}
                    type="button"
                    aria-label="Fermer le menu de l’application"
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    onClick={closeMenu}
                  >
                    <X aria-hidden="true" className="size-5" />
                  </button>
                </div>

                <div className="mt-6 space-y-6">
                  {mobileMoreNavigation.map((section) => (
                    <div key={section.title}>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {section.title}
                      </h3>
                      <div className="mt-2 grid gap-2">
                        {section.items.map((item) => {
                          const Icon = item.icon;
                          return (
                            <NavLink
                              key={item.path}
                              to={item.path}
                              onClick={() => setIsOpen(false)}
                              className={({ isActive }) =>
                                cn(
                                  'flex min-h-16 items-center gap-3 rounded-2xl border px-3 py-3 transition-colors',
                                  isActive
                                    ? 'border-brand-300 bg-brand-50 text-brand-950 dark:border-brand-700 dark:bg-brand-950/50 dark:text-brand-50'
                                    : 'border-slate-200 bg-slate-50/70 text-slate-800 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:hover:bg-slate-800',
                                )
                              }
                            >
                              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-300">
                                <Icon aria-hidden="true" className="size-5" />
                              </span>
                              <span className="min-w-0">
                                <span className="block font-semibold">{item.label}</span>
                                {item.description ? (
                                  <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                                    {item.description}
                                  </span>
                                ) : null}
                              </span>
                            </NavLink>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-100">
                      {isStandalone ? (
                        <CircleCheck aria-hidden="true" className="size-5" />
                      ) : isIos ? (
                        <Share aria-hidden="true" className="size-5" />
                      ) : (
                        <Smartphone aria-hidden="true" className="size-5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-950 dark:text-white">
                        {isStandalone
                          ? 'SportPilot est installé'
                          : isIos
                            ? 'Installer sur l’iPhone'
                            : 'Installer SportPilot'}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {isStandalone
                          ? 'L’application fonctionne déjà depuis l’écran d’accueil et reste disponible hors connexion.'
                          : isIos
                            ? 'Dans Safari, touchez Partager, puis Ajouter à l’écran d’accueil et confirmez avec Ajouter.'
                            : 'L’installation permet un accès plein écran et conserve les ressources principales hors connexion.'}
                      </p>
                      {!isStandalone && !isIos ? (
                        <InstallPwaButton
                          className="mt-3 w-full sm:w-auto"
                          label="Installer l’application"
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
