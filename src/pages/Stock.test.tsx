import React from 'react';
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';

import Stock from './Stock';

// Mock data dan fungsi
const mocks = vi.hoisted(() => ({
  collections: {
    ingredients: [] as any[],
    packaging: [] as any[],
    stock_logs: [] as any[],
  },
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  createNotification: vi.fn(),
  handleFirestoreError: vi.fn(),
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  collection: (_db: any, name: string) => ({ name }),
  query: (ref: any) => ref,
  orderBy: vi.fn(),
  limit: vi.fn(),

  onSnapshot: vi.fn((ref: any, callback: any) => {
    const docs =
      mocks.collections[
        ref.name as keyof typeof mocks.collections
      ].map((item: any) => ({
        id: item.id,
        data: () => {
          const { id, ...data } = item;
          return data;
        },
      }));

    callback({ docs });
    return vi.fn();
  }),

  addDoc: mocks.addDoc,
  updateDoc: mocks.updateDoc,
  deleteDoc: mocks.deleteDoc,

  doc: (_db: any, collectionName: string, id: string) => ({
    collectionName,
    id,
  }),

  serverTimestamp: vi.fn(() => 'mock-timestamp'),
}));

vi.mock('../lib/firebase', () => ({
  db: {},
  handleFirestoreError: mocks.handleFirestoreError,
  OperationType: {
    LIST: 'list',
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
  },
}));

vi.mock('../lib/notificationService', () => ({
  createNotification: mocks.createNotification,
}));

vi.mock('sonner', () => ({
  toast: mocks.toast,
}));

vi.mock('motion/react', () => ({
  motion: {
    div: 'div',
  },
  AnimatePresence: ({ children }: any) => children,
}));

vi.mock('../components/ConfirmModal', () => ({
  default: ({ isOpen, onConfirm, onClose }: any) =>
    isOpen ? (
      <div>
        <p>Konfirmasi Hapus Stok</p>
        <button onClick={onConfirm}>
          Konfirmasi Hapus
        </button>
        <button onClick={onClose}>
          Batal Hapus
        </button>
      </div>
    ) : null,
}));

// Data pengujian
const ingredientData = {
  id: 'ing-001',
  name: 'Beras',
  quantity: 20,
  unit: 'kg',
  minimumThreshold: 5,
  status: 'safe',
};

const packagingData = {
  id: 'pack-001',
  name: 'Kotak Makan',
  quantity: 100,
  unit: 'pcs',
  minimumThreshold: 20,
  status: 'safe',
};

const lowStockData = {
  id: 'ing-002',
  name: 'Gula',
  quantity: 2,
  unit: 'kg',
  minimumThreshold: 5,
  status: 'low stock',
};

const stockLogData = {
  id: 'log-001',
  ingredientName: 'Beras',
  previousQuantity: 20,
  usedQuantity: 5,
  remainingQuantity: 15,
  productionId: 'prod-001',
  createdAt: {
    toDate: () => new Date('2026-11-25T08:00:00'),
  },
};

// Helper mengisi form
const fillStockForm = () => {
  const inputs = screen.getAllByRole('spinbutton');

  fireEvent.change(
    screen.getByPlaceholderText(
      'misal: Beras, Ayam, Bumbu Halus'
    ),
    { target: { value: 'Tepung' } }
  );

  fireEvent.change(inputs[0], {
    target: { value: '30' },
  });

  fireEvent.change(
    screen.getByPlaceholderText(
      'kg, potong, pcs, liter'
    ),
    { target: { value: 'kg' } }
  );

  fireEvent.change(inputs[1], {
    target: { value: '5' },
  });
};

describe('Unit Testing Fitur Stok', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.collections.ingredients = [
      { ...ingredientData },
    ];

    mocks.collections.packaging = [
      { ...packagingData },
    ];

    mocks.collections.stock_logs = [];

    mocks.addDoc.mockResolvedValue({
      id: 'stock-new',
    });

    mocks.updateDoc.mockResolvedValue(undefined);
    mocks.deleteDoc.mockResolvedValue(undefined);
    mocks.createNotification.mockResolvedValue(undefined);

    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  // TC-STK-01
  it('TC-STK-01 - Menampilkan data bahan baku', async () => {
    render(<Stock />);

    expect(
      await screen.findByText('Manajemen Inventaris')
    ).toBeInTheDocument();

    expect(
      screen.getByText('Beras')
    ).toBeInTheDocument();

    expect(
      screen.getByText('20 kg')
    ).toBeInTheDocument();
  });

  // TC-STK-02
  it('TC-STK-02 - Menampilkan data kemasan', async () => {
    render(<Stock />);

    fireEvent.click(
      screen.getByRole('button', {
        name: /Kemasan/i,
      })
    );

    expect(
      await screen.findByText('Kotak Makan')
    ).toBeInTheDocument();

    expect(
      screen.getByText('100 pcs')
    ).toBeInTheDocument();
  });

  // TC-STK-03
  it('TC-STK-03 - Menampilkan peringatan stok rendah', async () => {
    mocks.collections.ingredients = [
      { ...ingredientData },
      { ...lowStockData },
    ];

    render(<Stock />);

    expect(
      await screen.findByText(
        'Kritis: Peringatan Stok Rendah'
      )
    ).toBeInTheDocument();

    // Gula muncul di tabel inventaris dan daftar stok rendah
    expect(
      screen.getAllByText('Gula')
    ).toHaveLength(2);
  });

  // TC-STK-04
  it('TC-STK-04 - Menambahkan bahan baku baru', async () => {
    render(<Stock />);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Baru',
      })
    );

    fillStockForm();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Konfirmasi Barang',
      })
    );

    await waitFor(() => {
      expect(mocks.addDoc).toHaveBeenCalled();

      expect(mocks.toast.success).toHaveBeenCalledWith(
        'Barang stok baru ditambahkan'
      );
    });
  });

  // TC-STK-05
  it('TC-STK-05 - Menambahkan kemasan baru', async () => {
    render(<Stock />);

    fireEvent.click(
      screen.getByRole('button', {
        name: /Kemasan/i,
      })
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Baru',
      })
    );

    fillStockForm();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Konfirmasi Barang',
      })
    );

    await waitFor(() => {
      expect(mocks.addDoc).toHaveBeenCalled();

      expect(mocks.toast.success).toHaveBeenCalledWith(
        'Barang kemasan baru ditambahkan'
      );
    });
  });

  // TC-STK-06
  it('TC-STK-06 - Mengubah data stok', async () => {
    const { container } = render(<Stock />);

    await screen.findByText('Beras');

    const editButton = Array.from(
      container.querySelectorAll('button')
    ).find((button) =>
      button.className.includes('hover:bg-primary/10')
    );

    expect(editButton).toBeTruthy();

    fireEvent.click(editButton!);

    expect(
      await screen.findByRole('heading', {
        name: 'Edit Bahan',
      })
    ).toBeInTheDocument();

    const quantityInput = screen.getAllByRole('spinbutton')[0];

    fireEvent.change(quantityInput, {
      target: { value: '40' },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Simpan Perubahan',
      })
    );

    await waitFor(() => {
      expect(mocks.updateDoc).toHaveBeenCalled();

      expect(mocks.toast.success).toHaveBeenCalledWith(
        'Barang stok diperbarui'
      );
    });
  });

  // TC-STK-07
  it('TC-STK-07 - Membuat notifikasi ketika stok rendah', async () => {
    render(<Stock />);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Baru',
      })
    );

    const inputs = screen.getAllByRole('spinbutton');

    fireEvent.change(
      screen.getByPlaceholderText(
        'misal: Beras, Ayam, Bumbu Halus'
      ),
      { target: { value: 'Gula' } }
    );

    fireEvent.change(inputs[0], {
      target: { value: '2' },
    });

    fireEvent.change(
      screen.getByPlaceholderText(
        'kg, potong, pcs, liter'
      ),
      { target: { value: 'kg' } }
    );

    fireEvent.change(inputs[1], {
      target: { value: '5' },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Konfirmasi Barang',
      })
    );

    await waitFor(() => {
      expect(mocks.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Stok Hampir Habis',
          type: 'low_stock',
        })
      );
    });
  });

  // TC-STK-08
  it('TC-STK-08 - Menampilkan pesan error ketika penyimpanan gagal', async () => {
    mocks.addDoc.mockRejectedValue(
      new Error('Gagal menyimpan data')
    );

    render(<Stock />);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Baru',
      })
    );

    fillStockForm();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Konfirmasi Barang',
      })
    );

    await waitFor(() => {
      expect(mocks.handleFirestoreError).toHaveBeenCalled();

      expect(mocks.toast.error).toHaveBeenCalledWith(
        'Gagal menyimpan barang stok'
      );
    });
  });

  // TC-STK-09
  it('TC-STK-09 - Menghapus barang setelah konfirmasi', async () => {
    const { container } = render(<Stock />);

    await screen.findByText('Beras');

    const deleteButton = Array.from(
      container.querySelectorAll('button')
    ).find((button) => {
      const icon = button.querySelector('svg');
      return icon?.getAttribute('class')?.includes('trash');
    });

    expect(deleteButton).toBeTruthy();

    fireEvent.click(deleteButton!);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Konfirmasi Hapus',
      })
    );

    await waitFor(() => {
      expect(mocks.deleteDoc).toHaveBeenCalled();

      expect(mocks.toast.success).toHaveBeenCalledWith(
        'Bahan berhasil dihapus'
      );
    });
  });

  // TC-STK-10
  it('TC-STK-10 - Menampilkan pesan error ketika penghapusan gagal', async () => {
    mocks.deleteDoc.mockRejectedValue(
      new Error('Gagal menghapus data')
    );

    const { container } = render(<Stock />);

    await screen.findByText('Beras');

    const deleteButton = Array.from(
      container.querySelectorAll('button')
    ).find((button) => {
      const icon = button.querySelector('svg');
      return icon?.getAttribute('class')?.includes('trash');
    });

    expect(deleteButton).toBeTruthy();

    fireEvent.click(deleteButton!);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Konfirmasi Hapus',
      })
    );

    await waitFor(() => {
      expect(mocks.handleFirestoreError).toHaveBeenCalled();

      expect(mocks.toast.error).toHaveBeenCalledWith(
        'Gagal menghapus barang'
      );
    });
  });

  // TC-STK-11
  it('TC-STK-11 - Menampilkan riwayat pergerakan stok', async () => {
    mocks.collections.stock_logs = [
      { ...stockLogData },
    ];

    render(<Stock />);

    fireEvent.click(
      screen.getByRole('button', {
        name: /Riwayat/i,
      })
    );

    expect(
      await screen.findByText('Pergerakan Terkini')
    ).toBeInTheDocument();

    expect(
      screen.getByText('Beras')
    ).toBeInTheDocument();

    expect(
      screen.getByText('-5')
    ).toBeInTheDocument();
  });

  // TC-STK-12
  it('TC-STK-12 - Menampilkan pesan ketika riwayat stok kosong', async () => {
    mocks.collections.stock_logs = [];

    render(<Stock />);

    fireEvent.click(
      screen.getByRole('button', {
        name: /Riwayat/i,
      })
    );

    expect(
      await screen.findByText(
        'Tidak ada log pergerakan yang ditemukan.'
      )
    ).toBeInTheDocument();
  });
});