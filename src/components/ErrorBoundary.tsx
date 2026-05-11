import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info);
    this.setState({ error, info });
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            padding: 24,
            fontFamily: "system-ui, sans-serif",
            background: "#F6F1E6",
            color: "#1F1C19",
          }}
        >
          <h1 style={{ fontSize: 20 }}>FrictionMap couldn’t render</h1>
          <p style={{ opacity: 0.85 }}>
            Open the browser devtools console (⌥⌘J) for the full error. Common fixes: hard-refresh, try another port, or
            unregister service workers for this host.
          </p>
          <pre
            style={{
              marginTop: 16,
              padding: 16,
              background: "#1F1C19",
              color: "#FFFCF5",
              borderRadius: 8,
              overflow: "auto",
              fontSize: 13,
            }}
          >
            {this.state.error.toString()}
            {this.state.info?.componentStack ?? ""}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
