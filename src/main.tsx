import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { VipAccessProvider } from './context/VipAccessContext';
import { AuthProvider } from './context/AuthContext';
import { AuthModal } from './components/AuthModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import { applyPerformanceTier } from './utils/performance';

// Flag older / low-power devices so CSS can drop heavy blurs, glows & shadows
applyPerformanceTier();

// Safari / WebKit Hard Cache Invalidator
if (typeof window !== 'undefined') {
  const BUILD_VERSION = '1.0.2-20261105-1950';
  try {
    const storedVersion = localStorage.getItem('akinoya_app_build_version');
    if (storedVersion && storedVersion !== BUILD_VERSION) {
      localStorage.setItem('akinoya_app_build_version', BUILD_VERSION);
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
    } else if (!storedVersion) {
      localStorage.setItem('akinoya_app_build_version', BUILD_VERSION);
    }
  } catch {}
}

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
