import { Component, type ErrorInfo, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { ErrorState } from "./ui";

interface Props {
  name: string;
  resetKey: string;
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

class Boundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }
  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.name}] render error`, error, info.componentStack);
  }
  override componentDidUpdate(prev: Props) {
    // Navigating to another route clears the failure.
    if (this.state.hasError && prev.resetKey !== this.props.resetKey) this.setState({ hasError: false });
  }
  override render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          title={`${this.props.name} is temporarily unavailable`}
          message="This section hit a problem, but the rest of the application is unaffected. You can try again or open another section."
          onRetry={() => this.setState({ hasError: false })}
        />
      );
    }
    return this.props.children;
  }
}

/** Wrap every module route (plan §6/§42): a crash in one page never blanks the app shell. */
export function ModuleBoundary({ name, children }: { name: string; children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <Boundary name={name} resetKey={pathname}>
      {children}
    </Boundary>
  );
}
