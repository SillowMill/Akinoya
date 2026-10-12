import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { VipAccessProvider } from './context/VipAccessContext';
import { AuthProvider } from './context/AuthContext';
import { AuthModal } from './components/AuthModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <VipAccessProvider>
      <AuthProvider>
        <App />
        <AuthModal />
      </AuthProvider>
    </VipAccessProvider>
  </ErrorBoundary>
);
