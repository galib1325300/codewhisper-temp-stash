import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    // Éviter la déconnexion en cas d'erreur API ou de génération
    if (error.message.includes('OpenAI') || 
        error.message.includes('API') || 
        error.message.includes('génération') ||
        error.message.includes('clé') ||
        error.message.includes('timeout')) {
      console.warn('Erreur API capturée, évitement de la déconnexion');
      this.setState({ hasError: false, error: null });
      return;
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-sm p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Une erreur est survenue
            </h2>
            <p className="text-gray-600 mb-4">
              Nous nous excusons pour la gêne occasionnée. Veuillez rafraîchir la page ou réessayer plus tard.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Rafraîchir la page
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Réessayer
              </button>
            </div>
            {this.state.error && (
              <details className="mt-4">
                <summary className="text-sm text-gray-500 cursor-pointer">
                  Détails de l'erreur
                </summary>
                <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}