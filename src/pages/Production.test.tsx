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

import Production from './Production';

// Mock data dan fungsi
const mocks = vi.hoisted(() => ({
  collections: {
    production: [] as any[],
    orders: [] as any[],
    ingredients: [] as any[],
  },
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  deductStockForOrder: vi.fn(),
  createIncomeTransaction: vi.fn(),
  calculateRequiredItems: vi.fn(),
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
  where: vi.fn(),

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
  getDocs: vi.fn(),
  runTransaction: vi.fn(),
  getDoc: vi.fn(),
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

vi.mock('../lib/stockService', () => ({
  deductStockForOrder: mocks.deductStockForOrder,
  createIncomeTransaction: mocks.createIncomeTransaction,
  calculateRequiredItems: mocks.calculateRequiredItems,
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
        <p>Hapus Jadwal Produksi?</p>
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
const productionData = {
  id: 'prod-001',
  orderId: 'order-001',
  customerName: 'Budi Santoso',
  productionDate: '2026-11-26',
  menuItems: [
    {
      name: 'Nasi Ayam Bakar',
      quantity: 10,
    },
  ],
  quantity: 10,
  assignedTo: 'Andi',
  status: 'scheduled',
};

const orderData = {
  id: 'order-001',
  customerName: 'Budi Santoso',
  orderDate: '2026-11-26',
  menuItems: [
    {
      name: 'Nasi Ayam Bakar',
      quantity: 10,
    },
  ],
  status: 'pending',
};

const ingredientData = {
  id: 'ing-001',
  name: 'Beras',
  quantity: 20,
  unit: 'kg',
};

describe('Unit Testing Fitur Produksi', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.collections.production = [{ ...productionData }];
    mocks.collections.orders = [{ ...orderData }];
    mocks.collections.ingredients = [{ ...ingredientData }];

    mocks.addDoc.mockResolvedValue({
      id: 'prod-new',
    });

    mocks.updateDoc.mockResolvedValue(undefined);
    mocks.deleteDoc.mockResolvedValue(undefined);

    mocks.deductStockForOrder.mockResolvedValue({
      alreadyDeducted: false,
    });

    mocks.createIncomeTransaction.mockResolvedValue(true);

    mocks.calculateRequiredItems.mockResolvedValue([
      {
        id: 'ing-001',
        name: 'Beras',
        quantity: 5,
        unit: 'kg',
      },
    ]);

    mocks.createNotification.mockResolvedValue(undefined);

    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  // TC-PRO-01
  it('TC-PRO-01 - Menampilkan data jadwal produksi', async () => {
    render(<Production />);

    expect(
      await screen.findByText('Kontrol Produksi')
    ).toBeInTheDocument();

    expect(
      screen.getAllByText('Andi').length
    ).toBeGreaterThan(0);

    expect(
      screen.getAllByText(/Nasi Ayam Bakar/i).length
    ).toBeGreaterThan(0);
  });

  // TC-PRO-02
  it('TC-PRO-02 - Mencari jadwal produksi berdasarkan nama pelanggan', async () => {
    render(<Production />);

    const searchInput = screen.getByPlaceholderText(
      'Cari pelanggan, menu, ID pesanan...'
    );

    fireEvent.change(searchInput, {
      target: { value: 'Budi Santoso' },
    });

    expect(
      screen.getAllByText('Andi').length
    ).toBeGreaterThan(0);

    fireEvent.change(searchInput, {
      target: { value: 'Nama Tidak Ada' },
    });

    await waitFor(() => {
      expect(
        screen.getAllByText(
          'Data produksi tidak ditemukan.'
        ).length
      ).toBeGreaterThan(0);
    });
  });

  // TC-PRO-03
  it('TC-PRO-03 - Memfilter jadwal berdasarkan status produksi', async () => {
    render(<Production />);

    const statusFilter = screen.getAllByRole('combobox')[0];

    fireEvent.change(statusFilter, {
      target: { value: 'scheduled' },
    });

    expect(
      screen.getAllByText('Andi').length
    ).toBeGreaterThan(0);

    fireEvent.change(statusFilter, {
      target: { value: 'completed' },
    });

    await waitFor(() => {
      expect(
        screen.getAllByText(
          'Data produksi tidak ditemukan.'
        ).length
      ).toBeGreaterThan(0);
    });
  });

  // TC-PRO-04
  it('TC-PRO-04 - Menambahkan jadwal produksi baru', async () => {
    render(<Production />);

    fireEvent.click(
      screen.getByRole('button', {
        name: /Rencanakan Produksi/i,
      })
    );

    const orderSearch = screen.getByPlaceholderText(
      'Cari berdasarkan pelanggan atau indeks pesanan...'
    );

    fireEvent.change(orderSearch, {
      target: { value: 'Budi' },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: /Budi Santoso/i,
      })
    );

    fireEvent.change(
      screen.getByPlaceholderText('Masukkan nama staf'),
      {
        target: { value: 'Rina' },
      }
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: /Konfirmasi Rencana/i,
      })
    );

    await waitFor(() => {
      expect(mocks.addDoc).toHaveBeenCalled();
      expect(mocks.updateDoc).toHaveBeenCalled();

      expect(mocks.toast.success).toHaveBeenCalledWith(
        'Jadwal produksi ditambahkan'
      );
    });
  });

  // TC-PRO-05
  it('TC-PRO-05 - Menolak penambahan jadwal tanpa memilih pesanan', async () => {
    render(<Production />);

    fireEvent.click(
      screen.getByRole('button', {
        name: /Rencanakan Produksi/i,
      })
    );

    fireEvent.change(
      screen.getByPlaceholderText('Masukkan nama staf'),
      {
        target: { value: 'Rina' },
      }
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: /Konfirmasi Rencana/i,
      })
    );

    expect(mocks.toast.error).toHaveBeenCalledWith(
      'Silakan pilih pesanan terlebih dahulu'
    );

    expect(mocks.addDoc).not.toHaveBeenCalled();
  });

  // TC-PRO-06
  it('TC-PRO-06 - Mengubah data jadwal produksi', async () => {
    const { container } = render(<Production />);

    await waitFor(() => {
      expect(screen.getAllByText('Andi').length).toBeGreaterThan(0);
    });

    // Mencari tombol edit berdasarkan class tombol pada tampilan mobile/desktop
    const editButton = Array.from(
      container.querySelectorAll('button')
    ).find((button) => {
      const className = button.className;
      return (
        className.includes('bg-blue-50') ||
        className.includes('hover:bg-blue-50')
      );
    });

    expect(editButton).toBeTruthy();

    fireEvent.click(editButton!);

    expect(
      await screen.findByRole('heading', {
        name: 'Perhalus Rencana Produksi',
      })
    ).toBeInTheDocument();

    fireEvent.change(
      screen.getByPlaceholderText('Masukkan nama staf'),
      {
        target: { value: 'Rina' },
      }
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: /Ubah Rencana/i,
      })
    );

    await waitFor(() => {
      expect(mocks.updateDoc).toHaveBeenCalled();

      expect(mocks.toast.success).toHaveBeenCalledWith(
        'Jadwal produksi diperbarui'
      );
    });
  });

  // TC-PRO-07
  it('TC-PRO-07 - Menghapus jadwal produksi setelah konfirmasi', async () => {
    const { container } = render(<Production />);

    const deleteButton = Array.from(
      container.querySelectorAll('button')
    ).find((button) => {
      const icon = button.querySelector('svg');
      const iconClass = icon?.getAttribute('class') || '';

      return iconClass.includes('trash');
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
        'Jadwal produksi berhasil dihapus'
      );
    });
  });

  // TC-PRO-08
  it('TC-PRO-08 - Mengubah status produksi menjadi sedang diproses', async () => {
    render(<Production />);

    const statusSelects = screen.getAllByRole('combobox');

    fireEvent.change(statusSelects[1], {
      target: { value: 'in progress' },
    });

    await waitFor(() => {
      expect(mocks.updateDoc).toHaveBeenCalled();

      expect(mocks.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Produksi Dimulai',
          type: 'production_today',
        })
      );
    });
  });

  // TC-PRO-09
  it('TC-PRO-09 - Menyelesaikan proses produksi', async () => {
    render(<Production />);

    const completeButtons = screen.getAllByRole('button', {
      name: /Selesaikan/i,
    });

    fireEvent.click(completeButtons[0]);

    await waitFor(() => {
      expect(mocks.deductStockForOrder).toHaveBeenCalledWith(
        'order-001',
        productionData.menuItems
      );

      expect(mocks.updateDoc).toHaveBeenCalled();

      expect(mocks.toast.success).toHaveBeenCalledWith(
        'Produksi selesai dan stok diperbarui!'
      );
    });
  });

  // TC-PRO-10
  it('TC-PRO-10 - Mengurangi stok bahan ketika produksi selesai', async () => {
    render(<Production />);

    const completeButtons = screen.getAllByRole('button', {
      name: /Selesaikan/i,
    });

    fireEvent.click(completeButtons[0]);

    await waitFor(() => {
      expect(mocks.deductStockForOrder).toHaveBeenCalledTimes(1);

      expect(mocks.createIncomeTransaction).toHaveBeenCalledWith(
        'order-001',
        expect.objectContaining({
          orderId: 'order-001',
        })
      );
    });
  });

  // TC-PRO-11
  it('TC-PRO-11 - Menampilkan preview kebutuhan bahan produksi', async () => {
    render(<Production />);

    const previewButtons = screen.getAllByRole('button', {
      name: /Bahan|Penggunaan/i,
    });

    fireEvent.click(previewButtons[0]);

    expect(
      await screen.findByText('Kebutuhan Dapur')
    ).toBeInTheDocument();

    expect(mocks.calculateRequiredItems).toHaveBeenCalledWith(
      productionData.menuItems
    );

    expect(screen.getByText('Beras')).toBeInTheDocument();
    expect(screen.getByText('DIBUTUHKAN')).toBeInTheDocument();
  });

  // TC-PRO-12
  it('TC-PRO-12 - Menampilkan pesan error ketika penyelesaian produksi gagal', async () => {
    mocks.deductStockForOrder.mockRejectedValue(
      new Error('Stok bahan tidak mencukupi')
    );

    render(<Production />);

    const completeButtons = screen.getAllByRole('button', {
      name: /Selesaikan/i,
    });

    fireEvent.click(completeButtons[0]);

    await waitFor(() => {
      expect(mocks.toast.error).toHaveBeenCalledWith(
        'Stok bahan tidak mencukupi'
      );
    });

    expect(
      mocks.createIncomeTransaction
    ).not.toHaveBeenCalled();
  });
});