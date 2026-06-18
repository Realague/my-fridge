import { AlertTriangle, Home, RotateCcw } from 'lucide-react';
import { Component, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';

type T = (key: string, fallback?: string) => string;

interface BoundaryProps {
  children: ReactNode;
  t: T;
  resetKey?: string;
  onHome?: () => void;
}

interface BoundaryState {
  error: Error | null;
}

class ErrorBoundaryClass extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary]', error, info.componentStack);
    } else {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary]', error.message);
    }
  }

  componentDidUpdate(prevProps: BoundaryProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    const { t, onHome } = this.props;
    const { error } = this.state;

    return (
      <div
        role="alert"
        className="flex min-h-[60vh] items-center justify-center bg-background p-6"
      >
        <div className="w-full max-w-md rounded-lg border bg-card/80 backdrop-blur-sm p-8 shadow-lg">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            {t('messages.error.boundary.title', "L'écran a cassé.")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('messages.error.boundary.description', 'Recharge la page pour repartir.')}
          </p>
          {import.meta.env.DEV && (
            <pre className="mt-4 max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs text-foreground/80">
              {error.message}
              {error.stack ? `\n\n${error.stack.split('\n').slice(0, 6).join('\n')}` : null}
            </pre>
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              variant="green"
              onClick={() => window.location.reload()}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {t('messages.error.boundary.reload', 'Recharger')}
            </Button>
            {onHome ? (
              <Button variant="outline" onClick={onHome} className="gap-2">
                <Home className="h-4 w-4" aria-hidden="true" />
                {t('messages.error.boundary.home', 'Tableau de bord')}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }
}

export const ErrorBoundary = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  return <ErrorBoundaryClass t={t}>{children}</ErrorBoundaryClass>;
};

export const RouteErrorBoundary = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <ErrorBoundaryClass
      t={t}
      resetKey={`${location.pathname}${location.search}`}
      onHome={() => navigate('/dashboard')}
    >
      {children}
    </ErrorBoundaryClass>
  );
};
