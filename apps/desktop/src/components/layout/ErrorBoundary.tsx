import { Component, type ErrorInfo, type ReactNode } from 'react';
import { CANVAS, STATUS, RADIUS } from '@forge-os/canvas-components';

interface ErrorBoundaryProps {
  /** Panel type for error reporting context */
  panelType?: string;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React ErrorBoundary that catches rendering errors in panel components.
 * Shows a styled fallback with error details and a retry button.
 * MARA-HIGH-1/2: Every panel wrapped to prevent cascading failures.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary] ${this.props.panelType ?? 'unknown'} panel crashed:`, error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: 24,
            background: CANVAS.bg,
            color: CANVAS.text,
            textAlign: 'center',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: STATUS.danger }}>
            Panel Error
          </div>
          <div style={{ fontSize: 12, color: CANVAS.label, maxWidth: 300, lineClamp: 3 }}>
            {this.state.error?.message ?? 'An unexpected error occurred'}
          </div>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '6px 16px',
              fontSize: 12,
              background: CANVAS.bgElevated,
              color: CANVAS.text,
              border: `1px solid ${CANVAS.border}`,
              borderRadius: RADIUS.pill,
              cursor: 'pointer',
              minHeight: 32,
              minWidth: 32,
            }}
            aria-label="Retry loading panel"
            tabIndex={0}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
