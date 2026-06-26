import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from 'react';
import { Home, RefreshCw } from 'lucide-react';
import { routePaths } from '@/app/routePaths';
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

  private returnToDashboard = (): void => {
    window.location.hash = `#${routePaths.dashboard}`;
    this.setState({ hasError: false });
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="grid min-h-screen place-items-center p-4 sm:p-6">
          <section
            role="alert"
            className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-5 shadow-sm sm:p-6 dark:border-red-900 dark:bg-slate-900"
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">
              Erreur de l’application
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
              Une erreur inattendue est survenue.
            </h1>
            <p className="mt-3 text-slate-600 dark:text-slate-300">
              Vos données locales n’ont pas été supprimées. Revenez à l’accueil pour quitter l’écran en erreur ou rechargez complètement l’application.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <Button variant="secondary" onClick={this.returnToDashboard}>
                <Home aria-hidden="true" className="size-4" />
                Retour à l’accueil
              </Button>
              <Button onClick={() => window.location.reload()}>
                <RefreshCw aria-hidden="true" className="size-4" />
                Recharger
              </Button>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
