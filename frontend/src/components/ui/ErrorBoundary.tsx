import { Component, type ErrorInfo, type ReactNode } from 'react';
import i18n from '../../i18n';

interface State { error: Error | null }

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('[ErrorBoundary]', error, info.componentStack); }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="card card-pad" style={{ maxWidth: 440, textAlign: 'center' }}>
          <h2 style={{ marginBottom: 8 }}>{i18n.t('errors.boundaryTitle')}</h2>
          <p className="t-3 t-sm mb-4">{this.state.error.message}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>{i18n.t('errors.reload')}</button>
        </div>
      </div>
    );
  }
}
