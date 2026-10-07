import { Component, type ReactNode } from 'react';

/** Last line of defense: never a white screen. Offers a reload that keeps the room code (rejoin by token). */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="landing">
        <div className="card card--pad-lg" style={{ display: 'grid', gap: 12, maxWidth: 420, textAlign: 'center' }}>
          <h2 className="display-md">Oops, the pencil snapped</h2>
          <p className="dim">Something went wrong on this screen. Reloading puts you back in your seat.</p>
          <button type="button" className="btn btn--primary" onClick={() => location.reload()}>Reload</button>
          <a href="/" className="mute">Back to start</a>
        </div>
      </div>
    );
  }
}
