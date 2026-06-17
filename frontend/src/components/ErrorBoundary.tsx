import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React lifecycle error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
          <div className="w-full max-w-md border border-border bg-card/60 backdrop-blur-md p-6 rounded-xl shadow-xl text-center space-y-4">
            <div className="p-3 bg-destructive/10 text-destructive rounded-full inline-block">
              <AlertCircle className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-lg font-bold">Something went wrong</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                An unexpected error occurred in the user interface. Please try reloading the page.
              </p>
              {this.state.error && (
                <div className="p-2.5 rounded bg-secondary/50 text-[10px] text-left text-muted-foreground font-mono overflow-auto max-h-24 select-text border border-border/50">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <button
              onClick={this.handleReset}
              className="w-full py-2 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
