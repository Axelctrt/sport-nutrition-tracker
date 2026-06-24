import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from 'react';
import { Button } from '@/shared/ui/Button';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundaryProvider extends Component<
  PropsWithChildren,
  ErrorBoundaryState
> {
  public override state: ErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Erreur React non interceptée', error, info);
  }

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="grid min-h-screen place-items-center p-6">
          <section className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-900 dark:bg-slate-900">
            <p className="text-sm font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">
              Erreur de l’application
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
              Une erreur inattendue est survenue.
            </h1>
            <p className="mt-3 text-slate-600 dark:text-slate-300">
              Rechargez l’application. Les données locales ne sont pas supprimées par cette action.
            </p>
            <Button className="mt-6" onClick={() => window.location.reload()}>
              Recharger
            </Button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
