import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './lib/api'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('Hotbox Root ErrorBoundary caught an error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#062419] p-6 text-white font-sans">
          <div className="max-w-lg w-full bg-[#0a3827] rounded-2xl p-8 border border-emerald-500/40 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center text-2xl font-bold">
              !
            </div>
            <h2 className="text-xl font-black text-emerald-300">Hotbox Portal Client Recovered</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              A client rendering exception was caught. Click below to refresh your local session with verified PostgreSQL data.
            </p>
            <pre className="p-3 bg-[#062419] rounded-xl text-left text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-36 border border-emerald-900/50">
              {this.state.error?.message || String(this.state.error)}
            </pre>
            <button
              onClick={() => {
                localStorage.removeItem('dropboxz_user');
                window.location.reload();
              }}
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-[#062419] rounded-xl text-xs font-bold transition shadow-lg cursor-pointer"
            >
              Refresh Portal
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
