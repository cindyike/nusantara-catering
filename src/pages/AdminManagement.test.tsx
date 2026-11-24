import React from 'react';
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react';
import AdminManagement from './AdminManagement';

const {
  mockOnSnapshot,
  mockCollection,
  mockDoc,
  mockOrderBy,
  mockQuery,
  mockServerTimestamp,
  mockUpdateDoc,
  mockHttpsCallable,
  mockCallable,
  mockUseAuth,
  mockToastSuccess,
  mockToastError,
  mockSnapshotDocs,
} = vi.hoisted(() => ({
  mockOnSnapshot: vi.fn(),
  mockCollection: vi.fn(),
  mockDoc: vi.fn(),
  mockOrderBy: vi.fn(),
  mockQuery: vi.fn(),
  mockServerTimestamp: vi.fn(),
  mockUpdateDoc: vi.fn(),
  mockHttpsCallable: vi.fn(),
  mockCallable: vi.fn(),
  mockUseAuth: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockSnapshotDocs: [] as any[],
}));

vi.mock('firebase/firestore', () => ({
  collection: mockCollection,
  doc: mockDoc,
  onSnapshot: mockOnSnapshot,
  orderBy: mockOrderBy,
  query: mockQuery,
  serverTimestamp: mockServerTimestamp,
  updateDoc: mockUpdateDoc,
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: mockHttpsCallable,
}));

vi.mock('../lib/firebase', () => ({
  db: {},
  functions: {},
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

const adminData = [
  {
    uid: 'admin-01',
    displayName: 'Admin Satu',
    email: 'admin1@gmail.com',
    role: 'admin',
    status: 'active',
  },
  {
    uid: 'admin-02',
    displayName: 'Admin Dua',
    email: 'admin2@gmail.com',
    role: 'admin',
    status: 'pending',
  },
  {
    uid: 'admin-03',
    displayName: 'Admin Tiga',
    email: 'admin3@gmail.com',
    role: 'admin',
    status: 'rejected',
  },
  {
    uid: 'super-01',
    displayName: 'Superadmin',
    email: 'super@gmail.com',
    role: 'superadmin',
    status: 'active',
  },
];

const renderComponent = () => render(<AdminManagement />);

const addAdminSnapshot = (admin: (typeof adminData)[number]) => {
  mockSnapshotDocs.push({
    id: admin.uid,
    data: () => ({
      displayName: admin.displayName,
      email: admin.email,
      role: admin.role,
      status: admin.status,
    }),
  });
};

const fillCreateForm = () => {
  fireEvent.click(
    screen.getByRole('button', { name: /Tambah Admin/i })
  );

  fireEvent.change(screen.getByPlaceholderText('Nama Admin'), {
    target: { value: 'Admin Baru' },
  });

  fireEvent.change(screen.getByPlaceholderText('admin@catering.com'), {
    target: { value: 'baru@gmail.com' },
  });

  fireEvent.change(screen.getByPlaceholderText('Minimal 8 karakter'), {
    target: { value: 'password123' },
  });
};

describe('Pengujian Fitur Manajemen Admin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSnapshotDocs.length = 0;

    mockUseAuth.mockReturnValue({
      user: {
        uid: 'superadmin-01',
        email: 'superadmin@gmail.com',
      },
    });

    mockCollection.mockReturnValue('collection-ref');
    mockDoc.mockReturnValue('document-ref');
    mockOrderBy.mockReturnValue('order-ref');
    mockQuery.mockReturnValue('query-ref');
    mockServerTimestamp.mockReturnValue('timestamp');

    mockUpdateDoc.mockResolvedValue(undefined);

    mockCallable.mockResolvedValue({
      data: { message: 'Operasi berhasil.' },
    });

    mockHttpsCallable.mockReturnValue(mockCallable);

    mockOnSnapshot.mockImplementation((q, success) => {
      success({ docs: mockSnapshotDocs });
      return vi.fn();
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('TC-ADM-01: Menampilkan daftar Admin dari Firestore', async () => {
    adminData.forEach(addAdminSnapshot);

    renderComponent();

    expect(await screen.findByText('Admin Satu')).toBeTruthy();
    expect(screen.getByText('Admin Tiga')).toBeTruthy();
    expect(screen.queryByText('super@gmail.com')).toBeNull();
  });

  it('TC-ADM-02: Menampilkan pesan ketika daftar Admin kosong', async () => {
    renderComponent();

    expect(
      await screen.findByText('Belum ada akun Admin')
    ).toBeTruthy();
  });

  it('TC-ADM-03: Menangani kegagalan memuat data Admin', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    mockOnSnapshot.mockImplementation((q, success, error) => {
      error(new Error('Firestore gagal dimuat'));
      return vi.fn();
    });

    renderComponent();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        'Gagal memuat daftar Admin. Pastikan akun ini memiliki role Superadmin.'
      );
    });
  });

  it('TC-ADM-04: Memfilter Admin berdasarkan nama', async () => {
    addAdminSnapshot(adminData[0]);
    addAdminSnapshot(adminData[2]);

    renderComponent();

    fireEvent.change(
      screen.getByPlaceholderText('Cari nama atau email...'),
      { target: { value: 'Admin Satu' } }
    );

    expect(screen.getByText('Admin Satu')).toBeTruthy();
    expect(screen.queryByText('Admin Tiga')).toBeNull();
  });

  it('TC-ADM-05: Memfilter Admin berdasarkan email', async () => {
    addAdminSnapshot(adminData[0]);
    addAdminSnapshot(adminData[2]);

    renderComponent();

    fireEvent.change(
      screen.getByPlaceholderText('Cari nama atau email...'),
      { target: { value: 'admin3@gmail.com' } }
    );

    expect(screen.getByText('Admin Tiga')).toBeTruthy();
    expect(screen.queryByText('Admin Satu')).toBeNull();
  });

  it('TC-ADM-06: Menampilkan permintaan Admin berstatus pending', async () => {
    addAdminSnapshot(adminData[1]);

    renderComponent();

    expect(
      await screen.findByText('Permintaan Pendaftaran (1)')
    ).toBeTruthy();

    expect(screen.getByText('Admin Dua')).toBeTruthy();
  });

  it('TC-ADM-07: Menyetujui permintaan pendaftaran Admin', async () => {
    addAdminSnapshot(adminData[1]);

    renderComponent();

    fireEvent.click(
      await screen.findByRole('button', { name: /Setujui/i })
    );

    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'document-ref',
        expect.objectContaining({
          status: 'active',
          reviewedBy: 'superadmin-01',
          updatedAt: 'timestamp',
        })
      );

      expect(mockToastSuccess).toHaveBeenCalledWith(
        'Admin Dua disetujui sebagai Admin.'
      );
    });
  });

  it('TC-ADM-08: Menolak permintaan pendaftaran Admin', async () => {
    addAdminSnapshot(adminData[1]);

    renderComponent();

    fireEvent.click(
      await screen.findByRole('button', { name: /Tolak/i })
    );

    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'document-ref',
        expect.objectContaining({
          status: 'rejected',
          reviewedBy: 'superadmin-01',
          updatedAt: 'timestamp',
        })
      );

      expect(mockToastSuccess).toHaveBeenCalledWith(
        'Pendaftaran Admin Dua ditolak.'
      );
    });
  });

  it('TC-ADM-09: Menangani kegagalan persetujuan Admin', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUpdateDoc.mockRejectedValueOnce(new Error('Update gagal'));

    addAdminSnapshot(adminData[1]);

    renderComponent();

    fireEvent.click(
      await screen.findByRole('button', { name: /Setujui/i })
    );

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        'Gagal memproses permintaan. Pastikan rules Firestore terbaru sudah di-deploy.'
      );
    });
  });

  it('TC-ADM-10: Membuka form tambah Admin', () => {
    renderComponent();

    fireEvent.click(
      screen.getByRole('button', { name: /Tambah Admin/i })
    );

    expect(screen.getByText('Tambah Akun Admin')).toBeTruthy();
    expect(screen.getByPlaceholderText('Nama Admin')).toBeTruthy();
    expect(screen.getByPlaceholderText('admin@catering.com')).toBeTruthy();
  });

  it('TC-ADM-11: Membuka form ubah Admin dengan data yang dipilih', async () => {
    addAdminSnapshot(adminData[0]);

    renderComponent();

    fireEvent.click(await screen.findByTitle('Ubah Admin'));

    expect(screen.getByText('Ubah Akun Admin')).toBeTruthy();
    expect(screen.getByDisplayValue('Admin Satu')).toBeTruthy();
    expect(screen.getByDisplayValue('admin1@gmail.com')).toBeTruthy();
    expect(
      screen.getByPlaceholderText('Kosongkan jika tidak diubah')
    ).toBeTruthy();
  });

  it('TC-ADM-12: Berhasil menambahkan Admin', async () => {
    renderComponent();

    fillCreateForm();

    fireEvent.click(
      screen.getByRole('button', { name: /Buat Akun/i })
    );

    await waitFor(() => {
      expect(mockHttpsCallable).toHaveBeenCalledWith(
        {},
        'createAdmin'
      );

      expect(mockCallable).toHaveBeenCalledWith({
        displayName: 'Admin Baru',
        email: 'baru@gmail.com',
        password: 'password123',
      });

      expect(mockToastSuccess).toHaveBeenCalledWith(
        'Operasi berhasil.'
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Tambah Akun Admin')).toBeNull();
    });
  });

  it('TC-ADM-13: Menangani kegagalan penambahan Admin', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCallable.mockRejectedValueOnce(
      new Error('Gagal membuat akun')
    );

    renderComponent();

    fillCreateForm();

    fireEvent.click(
      screen.getByRole('button', { name: /Buat Akun/i })
    );

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        'Gagal membuat akun'
      );
    });
  });

  it('TC-ADM-14: Berhasil mengubah data Admin', async () => {
    addAdminSnapshot(adminData[0]);

    renderComponent();

    fireEvent.click(await screen.findByTitle('Ubah Admin'));

    fireEvent.change(screen.getByDisplayValue('Admin Satu'), {
      target: { value: 'Admin Diperbarui' },
    });

    fireEvent.change(screen.getByDisplayValue('admin1@gmail.com'), {
      target: { value: 'update@gmail.com' },
    });

    fireEvent.change(
      screen.getByPlaceholderText('Kosongkan jika tidak diubah'),
      { target: { value: 'passwordbaru' } }
    );

    fireEvent.click(
      screen.getByRole('button', { name: /Simpan Perubahan/i })
    );

    await waitFor(() => {
      expect(mockHttpsCallable).toHaveBeenCalledWith(
        {},
        'updateAdmin'
      );

      expect(mockCallable).toHaveBeenCalledWith({
        uid: 'admin-01',
        displayName: 'Admin Diperbarui',
        email: 'update@gmail.com',
        password: 'passwordbaru',
      });

      expect(mockToastSuccess).toHaveBeenCalledWith(
        'Operasi berhasil.'
      );
    });
  });

  it('TC-ADM-15: Menangani kegagalan perubahan data Admin', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCallable.mockRejectedValueOnce(
      new Error('Gagal mengubah Admin')
    );

    addAdminSnapshot(adminData[0]);

    renderComponent();

    fireEvent.click(await screen.findByTitle('Ubah Admin'));

    fireEvent.click(
      screen.getByRole('button', { name: /Simpan Perubahan/i })
    );

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        'Gagal mengubah Admin'
      );
    });
  });

  it('TC-ADM-16: Membatalkan penghapusan Admin', async () => {
    const confirmSpy = vi
      .spyOn(window, 'confirm')
      .mockReturnValue(false);

    addAdminSnapshot(adminData[0]);

    renderComponent();

    fireEvent.click(await screen.findByTitle('Hapus Admin'));

    expect(confirmSpy).toHaveBeenCalled();
    expect(mockHttpsCallable).not.toHaveBeenCalled();
  });

  it('TC-ADM-17: Berhasil menghapus Admin', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    addAdminSnapshot(adminData[0]);

    renderComponent();

    fireEvent.click(await screen.findByTitle('Hapus Admin'));

    await waitFor(() => {
      expect(mockHttpsCallable).toHaveBeenCalledWith(
        {},
        'deleteAdmin'
      );

      expect(mockCallable).toHaveBeenCalledWith({
        uid: 'admin-01',
      });

      expect(mockToastSuccess).toHaveBeenCalledWith(
        'Operasi berhasil.'
      );
    });
  });

  it('TC-ADM-18: Menangani kegagalan penghapusan Admin', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    mockCallable.mockRejectedValueOnce(
      new Error('Gagal menghapus Admin')
    );

    addAdminSnapshot(adminData[0]);

    renderComponent();

    fireEvent.click(await screen.findByTitle('Hapus Admin'));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        'Gagal menghapus Admin'
      );
    });
  });
});