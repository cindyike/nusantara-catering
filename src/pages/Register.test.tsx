import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Register from './Register';

const {
  mockCreateUser,
  mockUpdateProfile,
  mockSignOut,
  mockUserDelete,
  mockDoc,
  mockSetDoc,
  mockServerTimestamp,
  mockNavigate,
  mockAuthErrorMessage,
  mockCredential,
} = vi.hoisted(() => {
  const mockUserDelete = vi.fn();

  const mockCredential = {
    user: {
      uid: 'uid-123',
      email: 'ike@example.com',
      delete: mockUserDelete,
    },
  };

  return {
    mockCreateUser: vi.fn(),
    mockUpdateProfile: vi.fn(),
    mockSignOut: vi.fn(),
    mockUserDelete,
    mockDoc: vi.fn(),
    mockSetDoc: vi.fn(),
    mockServerTimestamp: vi.fn(),
    mockNavigate: vi.fn(),
    mockAuthErrorMessage: vi.fn(),
    mockCredential,
  };
});

vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: mockCreateUser,
  updateProfile: mockUpdateProfile,
  signOut: mockSignOut,
}));

vi.mock('firebase/firestore', () => ({
  doc: mockDoc,
  setDoc: mockSetDoc,
  serverTimestamp: mockServerTimestamp,
}));

vi.mock('../lib/firebase', () => ({
  auth: {},
  db: {},
}));

vi.mock('react-router-dom', () => ({
  Link: ({ to, children }: any) => <a href={to}>{children}</a>,
  useNavigate: () => mockNavigate,
}));

vi.mock('../components/AuthLayout', () => ({
  default: ({ title, subtitle, children, footer }: any) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
      {footer}
    </div>
  ),
}));

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

vi.mock('../lib/authErrors', () => ({
  authErrorMessage: mockAuthErrorMessage,
}));

const fillForm = async (
  user: ReturnType<typeof userEvent.setup>,
  data = {
    name: 'Ike Puspita',
    email: 'ike@example.com',
    password: 'password123',
    confirm: 'password123',
  },
) => {
  await user.type(screen.getByPlaceholderText('Nama Anda'), data.name);
  await user.type(screen.getByPlaceholderText('nama@email.com'), data.email);
  await user.type(screen.getByPlaceholderText('Minimal 8 karakter'), data.password);
  await user.type(screen.getByPlaceholderText('Ulangi kata sandi'), data.confirm);
};

describe('Pengujian Fitur Registrasi', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockCreateUser.mockResolvedValue(mockCredential);
    mockUpdateProfile.mockResolvedValue(undefined);
    mockSignOut.mockResolvedValue(undefined);
    mockUserDelete.mockResolvedValue(undefined);
    mockDoc.mockReturnValue({ id: 'role-document' });
    mockSetDoc.mockResolvedValue(undefined);
    mockServerTimestamp.mockReturnValue('server-timestamp');
    mockAuthErrorMessage.mockReturnValue('Terjadi kesalahan pendaftaran.');
  });

  it('TC-REG-01: Memastikan field nama wajib diisi', () => {
    render(<Register />);

    expect(screen.getByPlaceholderText('Nama Anda')).toBeRequired();
  });

  it('TC-REG-02: Memastikan field email wajib diisi dan bertipe email', () => {
    render(<Register />);

    const email = screen.getByPlaceholderText('nama@email.com');

    expect(email).toBeRequired();
    expect(email).toHaveAttribute('type', 'email');
  });

  it('TC-REG-03: Memastikan kata sandi minimal 8 karakter', () => {
    render(<Register />);

    const password = screen.getByPlaceholderText('Minimal 8 karakter');

    expect(password).toBeRequired();
    expect(password).toHaveAttribute('minLength', '8');
  });

  it('TC-REG-04: Menolak nama yang kurang dari 3 karakter', async () => {
    const user = userEvent.setup();
    render(<Register />);

    await fillForm(user, {
      name: 'Ik',
      email: 'ike@example.com',
      password: 'password123',
      confirm: 'password123',
    });

    await user.click(screen.getByRole('button', { name: /DAFTAR/i }));

    expect(screen.getByText('Nama lengkap minimal 3 karakter.')).toBeInTheDocument();
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it('TC-REG-05: Menolak kata sandi yang kurang dari 8 karakter', async () => {
    const user = userEvent.setup();
    render(<Register />);

    await fillForm(user, {
      name: 'Ike Puspita',
      email: 'ike@example.com',
      password: '1234567',
      confirm: '1234567',
    });

    await user.click(screen.getByRole('button', { name: /DAFTAR/i }));

    expect(screen.getByText('Kata sandi minimal 8 karakter.')).toBeInTheDocument();
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it('TC-REG-06: Menolak konfirmasi kata sandi yang tidak cocok', async () => {
    const user = userEvent.setup();
    render(<Register />);

    await fillForm(user, {
      name: 'Ike Puspita',
      email: 'ike@example.com',
      password: 'password123',
      confirm: 'password456',
    });

    await user.click(screen.getByRole('button', { name: /DAFTAR/i }));

    expect(screen.getByText('Konfirmasi kata sandi tidak cocok.')).toBeInTheDocument();
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it('TC-REG-07: Berhasil mendaftarkan akun dan menyimpan role admin berstatus pending', async () => {
    const user = userEvent.setup();
    render(<Register />);

    await fillForm(user);

    await user.click(screen.getByRole('button', { name: /DAFTAR/i }));

    await waitFor(() => {
      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.anything(),
        'ike@example.com',
        'password123',
      );
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        mockCredential.user,
        { displayName: 'Ike Puspita' },
      );
      expect(mockSetDoc).toHaveBeenCalledWith(
        { id: 'role-document' },
        expect.objectContaining({
          uid: 'uid-123',
          displayName: 'Ike Puspita',
          email: 'ike@example.com',
          role: 'admin',
          status: 'pending',
          createdAt: 'server-timestamp',
        }),
      );
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        state: { registered: true },
      });
    });

    expect(mockUserDelete).not.toHaveBeenCalled();
  });

  it('TC-REG-08: Menampilkan pesan ketika pembuatan akun Firebase gagal', async () => {
    const user = userEvent.setup();
    mockCreateUser.mockRejectedValueOnce(new Error('Email already in use'));

    render(<Register />);
    await fillForm(user);

    await user.click(screen.getByRole('button', { name: /DAFTAR/i }));

    await waitFor(() => {
      expect(mockAuthErrorMessage).toHaveBeenCalled();
      expect(screen.getByText('Terjadi kesalahan pendaftaran.')).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('TC-REG-09: Menghapus akun jika update profil gagal', async () => {
    const user = userEvent.setup();
    mockUpdateProfile.mockRejectedValueOnce(new Error('Profile update failed'));

    render(<Register />);
    await fillForm(user);

    await user.click(screen.getByRole('button', { name: /DAFTAR/i }));

    await waitFor(() => {
      expect(mockUserDelete).toHaveBeenCalled();
      expect(mockAuthErrorMessage).toHaveBeenCalled();
    });

    expect(mockSetDoc).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('TC-REG-10: Menghapus akun jika penyimpanan role Firestore gagal', async () => {
    const user = userEvent.setup();
    mockSetDoc.mockRejectedValueOnce(new Error('Firestore unavailable'));

    render(<Register />);
    await fillForm(user);

    await user.click(screen.getByRole('button', { name: /DAFTAR/i }));

    await waitFor(() => {
      expect(mockSetDoc).toHaveBeenCalled();
      expect(mockUserDelete).toHaveBeenCalled();
      expect(mockAuthErrorMessage).toHaveBeenCalled();
    });

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('TC-REG-11: Menampilkan pesan ketika proses logout setelah registrasi gagal', async () => {
    const user = userEvent.setup();
    mockSignOut.mockRejectedValueOnce(new Error('Sign out failed'));

    render(<Register />);
    await fillForm(user);

    await user.click(screen.getByRole('button', { name: /DAFTAR/i }));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockAuthErrorMessage).toHaveBeenCalled();
      expect(screen.getByText('Terjadi kesalahan pendaftaran.')).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});