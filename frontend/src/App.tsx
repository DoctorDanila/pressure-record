import { Component, useEffect, useMemo, useState, type ErrorInfo, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { request } from './lib/api';
import type { User } from './types';
import AppShell, { AuthContext } from './components/AppShell';
import LandingPage from './pages/LandingPage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import VerifyPage from './pages/VerifyPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import ErrorPage from './pages/ErrorPage';
import MethodologyPage from './pages/MethodologyPage';
import PolicyPage from './pages/PolicyPage';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    request<User>('/api/auth/me')
      .then((value) => {
        if (active) setUser(value);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const auth = useMemo(() => ({ user, setUser, loading }), [user, loading]);

  return (
    <AuthContext.Provider value={auth}>
      <AppShell>
        <AppErrorBoundary>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/methodic" element={<MethodologyPage />} />
            <Route path="/policy" element={<PolicyPage />} />
            <Route path="/login" element={user ? <Navigate to="/app" replace /> : <LoginPage />} />
            <Route path="/register" element={user ? <Navigate to="/app" replace /> : <RegisterPage />} />
            <Route path="/verify-email" element={<VerifyPage />} />
            <Route path="/app" element={<Protected loading={loading} user={user}><DashboardPage /></Protected>} />
            <Route path="/profile" element={<Protected loading={loading} user={user}><ProfilePage /></Protected>} />
            <Route path="*" element={<ErrorPage code="404" title="Такой страницы нет" />} />
          </Routes>
        </AppErrorBoundary>
      </AppShell>
    </AuthContext.Provider>
  );
}

function Protected({
  children,
  loading,
  user,
}: {
  children: ReactNode;
  loading: boolean;
  user: User | null;
}) {
  if (loading) {
    return <div className="page-loader"><span className="spinner" /> Проверяем сессию…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Pressure Record frontend error', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorPage code="500" title="Что-то пошло не так" />;
    }

    return this.props.children;
  }
}
