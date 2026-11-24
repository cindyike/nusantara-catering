import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from './Login';

const {
  mockSignIn,
  mockSignOut,
  mockDoc,
  mockGetDoc,
  mockNavigate,
  mockAuthErrorMessage,
} = vi.hoisted(() => ({
  mockSignIn: vi.fn(),
  mockSignOut: vi.fn(),
  mockDoc: vi.fn(),
  mockGetDoc: vi.fn(),
  mockNavigate: vi.fn(),
  mockAuthErrorMessage: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: mockSignIn,
  signOut: mockSignOut,
}));

vi.mock('firebase/firestore', () => ({
  doc: mockDoc,
  getDoc: mockGetDoc,
}));

vi.mock('../lib/firebase', () => ({
  auth: {},
  db: {},
}));

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: null }),
}));

vi.mock('../components/AuthLayout', () => ({
  default: ({ children, footer }: any) => (
    <div>
      {children}
      {footer}
    </div>
  ),
}));

vi.mock('../lib/authErrors', () => ({
  authErrorMessage: mockAuthErrorMessage,
}));

describe('Login - Pengujian Unit dan Test Double', () => {
  const credential = {
    user: { uid: 'user-test-001' },
  };

  const activeAdmin = {
    role: 'admin',
    status: 'active',
  };

  const activeSuperadmin = {
    role: 'superadmin',
    status: 'active',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockSignIn.mockResolvedValue(credential);
    mockSignOut.mockResolvedValue(undefined);
    mockDoc.mockReturnValue({ id: 'role-reference' });

    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => activeAdmin,
    });

    mockAuthErrorMessage.mockImplementation(
      (_error: unknown, fallback: string) => fallback
    );
  });

  async function submitLogin(
    email = 'admin@catering.com',
    password = 'password123'
  ) {
    const user = userEvent.setup();

    render(<Login />);

    await user.type(
      screen.getByPlaceholderText('admin@catering.com'),
      email
    );

    await user.type(
      document.querySelector('input[type="password"]') as HTMLInputElement,
      password
    );

    await user.click(
      screen.getByRole('button', { name: /MASUK SEKARANG/i })
    );
  }

  it('TC-LOGIN-01: Memastikan input email wajib diisi', () => {
    render(<Login />);

    expect(
      screen.getByPlaceholderText('admin@catering.com')
    ).toBeRequired();
  });

  it('TC-LOGIN-02: Memastikan input password wajib diisi', () => {
    render(<Login />);

    expect(
      document.querySelector('input[type="password"]')
    ).toBeRequired();
  });

  it('TC-LOGIN-03: Login gagal ketika email atau password salah', async () => {
    mockSignIn.mockRejectedValue(new Error('auth/invalid-credential'));

    await submitLogin();

    await waitFor(() => {
      expect(mockAuthErrorMessage).toHaveBeenCalled();
      expect(screen.getByText(
        'Login gagal. Silakan periksa kredensial Anda.'
      )).toBeInTheDocument();
    });

    expect(mockGetDoc).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('TC-LOGIN-04: Menolak akun yang belum memiliki data role', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => false,
    });

    await submitLogin();

    await waitFor(() => {
      expect(screen.getByText(
        /Akun belum memiliki data role/
      )).toBeInTheDocument();
    });

    expect(mockSignOut).toHaveBeenCalledWith({});
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('TC-LOGIN-05: Menolak akun dengan status pending', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: 'admin', status: 'pending' }),
    });

    await submitLogin();

    await waitFor(() => {
      expect(screen.getByText(
        /menunggu persetujuan Superadmin/
      )).toBeInTheDocument();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('TC-LOGIN-06: Menolak akun dengan status rejected', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: 'admin', status: 'rejected' }),
    });

    await submitLogin();

    await waitFor(() => {
      expect(screen.getByText(
        /Pendaftaran akun Anda ditolak/
      )).toBeInTheDocument();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('TC-LOGIN-07: Menolak akun yang statusnya tidak aktif', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: 'admin', status: 'inactive' }),
    });

    await submitLogin();

    await waitFor(() => {
      expect(screen.getByText(
        /Akun belum memiliki akses aktif/
      )).toBeInTheDocument();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('TC-LOGIN-08: Menolak role selain admin dan superadmin', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: 'customer', status: 'active' }),
    });

    await submitLogin();

    await waitFor(() => {
      expect(screen.getByText(
        /Akun belum memiliki akses aktif/
      )).toBeInTheDocument();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('TC-LOGIN-09: Login berhasil untuk admin aktif', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => activeAdmin,
    });

    await submitLogin('  admin@catering.com  ', 'password123');

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', {
        replace: true,
      });
    });

    expect(mockSignIn).toHaveBeenCalledWith(
      {},
      'admin@catering.com',
      'password123'
    );

    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('TC-LOGIN-10: Login berhasil untuk superadmin aktif', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => activeSuperadmin,
    });

    await submitLogin('superadmin@catering.com', 'password123');

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', {
        replace: true,
      });
    });

    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('TC-LOGIN-11: Menangani kegagalan membaca data role Firestore', async () => {
    mockGetDoc.mockRejectedValue(new Error('Firestore unavailable'));

    await submitLogin();

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockAuthErrorMessage).toHaveBeenCalled();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});