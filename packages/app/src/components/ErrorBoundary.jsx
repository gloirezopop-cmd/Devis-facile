import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', backgroundColor: '#f8d7da', color: '#721c24', fontFamily: 'monospace', margin: '2rem', borderRadius: '8px' }}>
          <h2 style={{ color: '#721c24', fontSize: '1.5rem', marginBottom: '1rem' }}>Une erreur s'est produite dans l'application.</h2>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.6rem 1.2rem',
              backgroundColor: '#721c24',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginBottom: '1rem',
              minHeight: '44px',
            }}
          >
            Recharger la page
          </button>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            <summary style={{ fontWeight: 'bold', cursor: 'pointer' }}>Voir les détails de l'erreur</summary>
            <br />
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
