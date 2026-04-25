import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { AuthContext } from '../context/AuthContext';
import { UserRole } from '../types';
import { describe, it, expect, vi } from 'vitest';

const MockComponent = () => <div>Protected Content</div>;
const LoginMock = () => <div>Login Page</div>;

const renderWithAuth = (authValue: any) => {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/protected" element={<ProtectedRoute><MockComponent /></ProtectedRoute>} />
          <Route path="/login" element={<LoginMock />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
};

describe('ProtectedRoute', () => {
  const defaultAuthValue = {
    user: null,
    token: null,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: false,
    isAdmin: false,
    isUser: false,
    isViewer: false,
  };

  it('redirects to login when not authenticated', () => {
    renderWithAuth({ ...defaultAuthValue, isAuthenticated: false });
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    renderWithAuth({ 
      ...defaultAuthValue, 
      isAuthenticated: true, 
      user: { username: 'testuser', role: UserRole.ADMIN, is_active: true } 
    });
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('shows loading state when isLoading is true', () => {
    const { container } = renderWithAuth({ ...defaultAuthValue, isLoading: true });
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
