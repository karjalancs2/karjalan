import { Component, ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private readonly children: ReactNode;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.children = props.children;
  }

  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Unhandled page error:", error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.children;

    return (
      <main className="w-full max-w-2xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-white mb-3">
          Something went wrong
        </h1>
        <p className="text-neutral-400 mb-8">
          We could not load this page. Please return home and try again.
        </p>
        <button
          type="button"
          onClick={() => window.location.assign("/")}
          className="bg-white text-black font-bold px-6 py-3 rounded-sm hover:bg-neutral-200"
        >
          Go Home
        </button>
      </main>
    );
  }
}
