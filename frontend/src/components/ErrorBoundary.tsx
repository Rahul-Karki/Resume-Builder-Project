import React, { ReactNode, Component, ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component to catch React errors and prevent full app crash
 * 
 * Usage:
 * <ErrorBoundary onError={(error) => console.error(error)}>
 *   <YourComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState((prev) => ({
      ...prev,
      errorInfo,
    }));

    // Log to error reporting service
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Also log to console in development
    console.error("Error caught by boundary:", error);
    console.error("Error Info:", errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    // Reset error boundary if resetKeys change
    if (this.props.resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys![index]
      );

      if (hasResetKeyChanged && this.state.hasError) {
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
        });
      }
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div
          style={{
            padding: "40px 20px",
            textAlign: "center",
            minHeight: "200px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            background: "#fafafa",
            border: "1px solid #ddd",
            borderRadius: "8px",
            margin: "20px",
          }}
        >
          <h2 style={{ color: "#d32f2f", marginBottom: "10px" }}>
            Something went wrong
          </h2>
          <p style={{ color: "#666", marginBottom: "20px", maxWidth: "500px" }}>
            We encountered an unexpected error. Please refresh the page or contact support if the problem persists.
          </p>

          {import.meta.env.MODE === "development" && this.state.error && (
            <details
              style={{
                textAlign: "left",
                marginTop: "20px",
                padding: "10px",
                background: "#fff",
                border: "1px solid #ddd",
                borderRadius: "4px",
                maxWidth: "600px",
                overflow: "auto",
              }}
            >
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                Error Details (dev only)
              </summary>
              <pre
                style={{
                  fontSize: "12px",
                  color: "#666",
                  marginTop: "10px",
                  overflow: "auto",
                  maxHeight: "200px",
                }}
              >
                {this.state.error.toString()}
                {"\n\n"}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}

          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              background: "#1976d2",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Wrapper for specific sections (resume sections, form panels, etc.)
 * Provides isolated error handling without crashing entire UI
 */
export function SectionErrorBoundary({
  children,
  sectionName,
  onError,
}: {
  children: ReactNode;
  sectionName?: string;
  onError?: (error: Error, info: ErrorInfo) => void;
}) {
  return (
    <ErrorBoundary
      onError={onError}
      fallback={
        <div
          style={{
            padding: "20px",
            background: "#fff3e0",
            border: "1px solid #ffb74d",
            borderRadius: "4px",
            margin: "10px 0",
          }}
        >
          <p style={{ color: "#e65100", fontSize: "14px", margin: 0 }}>
            {sectionName ? `${sectionName} encountered an error` : "This section encountered an error"}. Please refresh or contact support.
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
