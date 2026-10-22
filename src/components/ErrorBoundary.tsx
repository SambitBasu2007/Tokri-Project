import { Component, type ErrorInfo, type ReactNode } from 'react';
import styles from './ui.module.css';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[Tokri] render error', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <main className={`container ${styles.errorPage}`}>
          <h1>Something broke</h1>
          <p className={styles.errorText}>{this.state.error.message}</p>
          <button
            type="button"
            className="btn"
            onClick={() => {
              this.setState({ error: null });
              window.location.assign('/');
            }}
          >
            Back to the catalog
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}
