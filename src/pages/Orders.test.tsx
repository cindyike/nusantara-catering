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
  within,
} from '@testing-library/react';
import Orders from './Orders';

const {
  mockCollection,
  mockQuery,
  mockOrderBy,
  mockWhere,
  mockOnSnapshot,
  mockAddDoc,
  mockUpdateDoc,
  mockDeleteDoc,
  mockDoc,
  mockGetDocs,
  mockWriteBatch,
  mockServerTimestamp,
  mockHandleFirestoreError,
  mockCreateNotification,
  mockToastSuccess,
  mockToastError,
  mockSnapshotData,
  mockBatchDelete,
  mockBatchCommit,
} = vi.hoisted(() => ({
  mockCollection: vi.fn(),
  mockQuery: vi.fn(),
  mockOrderBy: vi.fn(),
  mockWhere: vi.fn(),
  mockOnSnapshot: vi.fn(),
  mockAddDoc: vi.fn(),
  mockUpdateDoc: vi.fn(),
  mockDeleteDoc: vi.fn(),
  mockDoc: vi.fn(),
  mockGetDocs: vi.fn(),
  mockWriteBatch: vi.fn(),
  mockServerTimestamp: vi.fn(),
  mockHandleFirestoreError: vi.fn(),
  mockCreateNotification: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockSnapshotData: {
    orders: [] as any[],
    menu: [] as any[],
    customers: [] as any[],
  },
  mockBatchDelete: vi.fn(),
  mockBatchCommit: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: mockCollection,
  query: mockQuery,
  orderBy: mockOrderBy,
  where: mockWhere,
  onSnapshot: mockOnSnapshot,
  addDoc: mockAddDoc,
  updateDoc: mockUpdateDoc,
  deleteDoc: mockDeleteDoc,
  doc: mockDoc,
  getDocs: mockGetDocs,
  writeBatch: mockWriteBatch,
  serverTimestamp: mockServerTimestamp,
}));

vi.mock('../lib/firebase', () => ({
  db: {},
  handleFirestoreError: mockHandleFirestoreError,
  OperationType: {
    LIST: 'LIST',
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
  },
}));

vi.mock('../lib/stockService', () => ({
  deductStockForOrder: vi.fn(),
  createIncomeTransaction: vi.fn(),
}));

vi.mock('../lib/notificationService', () => ({
  createNotification: mockCreateNotification,
}));

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

vi.mock('motion/react', () => ({
  motion: {
    div: 'div',
  },
  AnimatePresence: ({ children }: any) => children,
}));

vi.mock('../components/ConfirmModal', () => ({
  default: ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    isLoading,
  }: any) =>
    isOpen ? (
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
        <button onClick={onClose}>Batal Hapus</button>
        <button onClick={onConfirm} disabled={isLoading}>
          Konfirmasi Hapus
        </button>
      </div>
    ) : null,
}));

const orderData = [
  {
    id: 'order-001',
    customerId: 'customer-001',
    customerName: 'Pelanggan Satu',
    customerPhone: '081234567890',
    orderDate: '2026-11-25',
    deliveryAddress: 'Malang',
    status: 'pending',
    note: '',
    totalPrice: 50000,
    menuItems: [
      {
        menuId: 'menu-001',
        name: 'Nasi Box',
        price: 25000,
        quantity: 2,
      },
    ],
  },
  {
    id: 'order-002',
    customerId: 'customer-002',
    customerName: 'Pelanggan Dua',
    customerPhone: '081234567891',
    orderDate: '2026-11-26',
    deliveryAddress: 'Batu',
    status: 'completed',
    note: '',
    totalPrice: 75000,
    menuItems: [
      {
        menuId: 'menu-002',
        name: 'Ayam Bakar',
        price: 75000,
        quantity: 1,
      },
    ],
  },
];

const menuData = [
  {
    id: 'menu-001',
    name: 'Nasi Box',
    category: 'Makanan',
    price: 25000,
  },
  {
    id: 'menu-002',
    name: 'Ayam Bakar',
    category: 'Makanan',
    price: 75000,
  },
];

const makeSnapshot = (data: any[]) => ({
  docs: data.map((item) => ({
    id: item.id,
    ref: { id: item.id },
    data: () => {
      const { id, ...rest } = item;
      return rest;
    },
  })),
});

const renderComponent = () => render(<Orders />);

const openCreateForm = () => {
  fireEvent.click(
    screen.getByRole('button', { name: /Tambah Pesanan Baru/i })
  );
};

const selectMenu = (name = 'Nasi Box') => {
  fireEvent.change(
    screen.getByPlaceholderText('Cari item menu...'),
    { target: { value: name } }
  );

  fireEvent.click(
    screen.getByRole('button', { name: new RegExp(name) })
  );
};

const setOrderDate = (container: HTMLElement) => {
  const dateInput = container.querySelector(
    'input[type="date"]'
  ) as HTMLInputElement;

  if (!dateInput) {
    throw new Error('Input tanggal pesanan tidak ditemukan');
  }

  fireEvent.change(dateInput, {
    target: { value: '2026-11-25' },
  });
};

const fillRequiredFields = (container: HTMLElement) => {
  fireEvent.change(
    screen.getByPlaceholderText('Cari atau ketik nama...'),
    { target: { value: 'Pelanggan Baru' } }
  );

  fireEvent.click(
    screen.getByRole('button', {
      name: /Teruskan sebagai data baru/i,
    })
  );

  fireEvent.change(screen.getByPlaceholderText('0812345...'), {
    target: { value: '081234567899' },
  });

  fireEvent.change(
    screen.getByPlaceholderText('Alamat pengiriman lengkap...'),
    { target: { value: 'Malang' } }
  );

  setOrderDate(container);
};

describe('Pengujian Fitur Manajemen Pesanan', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSnapshotData.orders = [];
    mockSnapshotData.menu = [];
    mockSnapshotData.customers = [];

    mockCollection.mockImplementation((_db, name) => ({
      name,
    }));

    mockQuery.mockImplementation((ref, ...conditions) => ({
      collection: ref.name,
      conditions,
    }));

    mockOrderBy.mockReturnValue('order-by-createdAt');
    mockWhere.mockReturnValue('where-condition');

    mockDoc.mockImplementation((_db, collectionName, id) => ({
      collection: collectionName,
      id,
    }));

    mockServerTimestamp.mockReturnValue('timestamp');

    mockOnSnapshot.mockImplementation((ref, success) => {
      const collectionName = ref.collection || ref.name;

      const data =
        collectionName === 'orders'
          ? mockSnapshotData.orders
          : collectionName === 'menu'
            ? mockSnapshotData.menu
            : collectionName === 'customers'
              ? mockSnapshotData.customers
              : [];

      success(makeSnapshot(data));

      return vi.fn();
    });

    mockGetDocs.mockResolvedValue({
      empty: true,
      docs: [],
      forEach: vi.fn(),
    });

    mockAddDoc.mockImplementation(async (ref) => ({
      id: `${ref.name}-baru`,
    }));

    mockUpdateDoc.mockResolvedValue(undefined);
    mockDeleteDoc.mockResolvedValue(undefined);

    mockBatchDelete.mockReset();
    mockBatchCommit.mockResolvedValue(undefined);

    mockWriteBatch.mockReturnValue({
      delete: mockBatchDelete,
      commit: mockBatchCommit,
    });

    mockCreateNotification.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // TC-ORD-01
  it('TC-ORD-01: Menampilkan daftar pesanan dari Firestore', async () => {
    mockSnapshotData.orders = orderData;

    renderComponent();

    expect(await screen.findByText('Pelanggan Satu')).toBeTruthy();
    expect(screen.getByText('Pelanggan Dua')).toBeTruthy();
  });

  // TC-ORD-02
  it('TC-ORD-02: Menampilkan pesan ketika pesanan kosong', async () => {
    renderComponent();

    expect(
      await screen.findByText('Pesanan tidak ditemukan.')
    ).toBeTruthy();
  });

  // TC-ORD-03
  it('TC-ORD-03: Menangani kegagalan memuat pesanan', async () => {
    mockOnSnapshot.mockImplementation((ref, success, error) => {
      if (ref.collection === 'orders') {
        error(new Error('Gagal memuat pesanan'));
      } else {
        success(makeSnapshot([]));
      }

      return vi.fn();
    });

    renderComponent();

    await waitFor(() => {
      expect(mockHandleFirestoreError).toHaveBeenCalledWith(
        expect.any(Error),
        'LIST',
        'orders'
      );
    });
  });

  // TC-ORD-04
  it('TC-ORD-04: Memfilter pesanan berdasarkan nama pelanggan', () => {
    mockSnapshotData.orders = orderData;

    renderComponent();

    fireEvent.change(
      screen.getByPlaceholderText(
        'Cari berdasarkan ID atau nama pelanggan...'
      ),
      { target: { value: 'Pelanggan Satu' } }
    );

    expect(screen.getByText('Pelanggan Satu')).toBeTruthy();
    expect(screen.queryByText('Pelanggan Dua')).toBeNull();
  });

  // TC-ORD-05
  it('TC-ORD-05: Memfilter pesanan berdasarkan ID', () => {
    mockSnapshotData.orders = orderData;

    renderComponent();

    fireEvent.change(
      screen.getByPlaceholderText(
        'Cari berdasarkan ID atau nama pelanggan...'
      ),
      { target: { value: 'order-001' } }
    );

    expect(screen.getByText('Pelanggan Satu')).toBeTruthy();
    expect(screen.queryByText('Pelanggan Dua')).toBeNull();
  });

  // TC-ORD-06
  it('TC-ORD-06: Memfilter pesanan berdasarkan status', () => {
    mockSnapshotData.orders = orderData;

    renderComponent();

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'completed' },
    });

    expect(screen.getByText('Pelanggan Dua')).toBeTruthy();
    expect(screen.queryByText('Pelanggan Satu')).toBeNull();
  });

  // TC-ORD-07
  it('TC-ORD-07: Membuka form tambah pesanan', () => {
    renderComponent();

    openCreateForm();

    expect(
      screen.getByRole('heading', {
        name: 'Tambah Pesanan Baru',
      })
    ).toBeTruthy();

    expect(
      screen.getByPlaceholderText('Cari atau ketik nama...')
    ).toBeTruthy();

    expect(
      screen.getByPlaceholderText('0812345...')
    ).toBeTruthy();

    expect(
      screen.getByPlaceholderText('Alamat pengiriman lengkap...')
    ).toBeTruthy();
  });

  // TC-ORD-08
  it('TC-ORD-08: Menangani pesanan tanpa item menu', async () => {
    const { container } = renderComponent();

    openCreateForm();
    fillRequiredFields(container);

    fireEvent.click(
      screen.getByRole('button', { name: 'BUAT PESANAN' })
    );

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        'Silakan tambahkan setidaknya satu item menu'
      );
    });

    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  // TC-ORD-09
  it('TC-ORD-09: Menambahkan item menu ke pesanan', () => {
    mockSnapshotData.menu = menuData;

    renderComponent();

    openCreateForm();
    selectMenu('Nasi Box');

    expect(screen.getByText('Nasi Box')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
  });

  // TC-ORD-10
  it('TC-ORD-10: Menambahkan jumlah item menu yang sama', () => {
    mockSnapshotData.menu = menuData;

    renderComponent();

    openCreateForm();
    selectMenu('Nasi Box');
    selectMenu('Nasi Box');

    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText(/50\.000/)).toBeTruthy();
  });

  // TC-ORD-11
  it('TC-ORD-11: Menambah jumlah item menu', () => {
    mockSnapshotData.menu = menuData;

    renderComponent();

    openCreateForm();
    selectMenu('Nasi Box');

    const quantity = screen.getByText('1');
    const container = quantity.parentElement;

    expect(container).toBeTruthy();

    const buttons = within(container!).getAllByRole('button');

    fireEvent.click(buttons[1]);

    expect(screen.getByText('2')).toBeTruthy();
  });

  // TC-ORD-12
  it('TC-ORD-12: Memastikan jumlah item tidak kurang dari satu', () => {
    mockSnapshotData.menu = menuData;

    renderComponent();

    openCreateForm();
    selectMenu('Nasi Box');

    const quantity = screen.getByText('1');
    const container = quantity.parentElement;

    expect(container).toBeTruthy();

    const buttons = within(container!).getAllByRole('button');

    fireEvent.click(buttons[0]);

    expect(screen.getByText('1')).toBeTruthy();
  });

  // TC-ORD-13
  it('TC-ORD-13: Menghapus item menu dari pesanan', () => {
    mockSnapshotData.menu = menuData;

    renderComponent();

    openCreateForm();
    selectMenu('Nasi Box');

    const quantity = screen.getByText('1');
    const container = quantity.parentElement?.parentElement;

    expect(container).toBeTruthy();

    const buttons = within(container!).getAllByRole('button');

    fireEvent.click(buttons[2]);

    expect(screen.queryByText('Nasi Box')).toBeNull();
    expect(screen.getByText(/Belum ada menu/)).toBeTruthy();
  });

  // TC-ORD-14
  it('TC-ORD-14: Membuka form edit pesanan dengan data terpilih', async () => {
    mockSnapshotData.orders = orderData;

    renderComponent();

    const row = (
      await screen.findByText('Pelanggan Satu')
    ).closest('tr');

    expect(row).toBeTruthy();

    const buttons = within(row!).getAllByRole('button');

    fireEvent.click(buttons[0]);

    expect(
      screen.getByRole('heading', { name: 'Edit Pesanan' })
    ).toBeTruthy();

    expect(
      screen.getByDisplayValue('Pelanggan Satu')
    ).toBeTruthy();

    expect(
      screen.getByDisplayValue('081234567890')
    ).toBeTruthy();
  });

  // TC-ORD-15
  it('TC-ORD-15: Berhasil menambahkan pesanan baru', async () => {
    mockSnapshotData.menu = menuData;

    const { container } = renderComponent();

    openCreateForm();
    fillRequiredFields(container);
    selectMenu('Nasi Box');

    fireEvent.click(
      screen.getByRole('button', { name: 'BUAT PESANAN' })
    );

    await waitFor(() => {
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Pesanan Baru Diterima',
          type: 'order_pending',
        })
      );

      expect(mockToastSuccess).toHaveBeenCalledWith(
        'Pesanan berhasil dibuat'
      );

      expect(mockToastSuccess).toHaveBeenCalledWith(
        'Jadwal produksi otomatis dibuat'
      );
    });

    expect(mockAddDoc).toHaveBeenCalled();
  });

  // TC-ORD-16
  it('TC-ORD-16: Menangani kegagalan menyimpan pesanan', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    mockSnapshotData.menu = menuData;

    mockAddDoc.mockRejectedValueOnce(
      new Error('Gagal menyimpan')
    );

    const { container } = renderComponent();

    openCreateForm();
    fillRequiredFields(container);
    selectMenu('Nasi Box');

    fireEvent.click(
      screen.getByRole('button', { name: 'BUAT PESANAN' })
    );

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        'Gagal menyimpan pesanan'
      );
    });
  });

  // TC-ORD-17
  it('TC-ORD-17: Membatalkan penghapusan pesanan', async () => {
    mockSnapshotData.orders = orderData;

    renderComponent();

    const row = (
      await screen.findByText('Pelanggan Satu')
    ).closest('tr');

    const buttons = within(row!).getAllByRole('button');

    fireEvent.click(buttons[1]);

    expect(screen.getByText('Hapus Pesanan?')).toBeTruthy();

    fireEvent.click(
      screen.getByRole('button', { name: 'Batal Hapus' })
    );

    expect(screen.queryByText('Hapus Pesanan?')).toBeNull();
    expect(mockDeleteDoc).not.toHaveBeenCalled();
  });

  // TC-ORD-18
  it('TC-ORD-18: Berhasil menghapus pesanan dan data terkait', async () => {
    mockSnapshotData.orders = orderData;

    renderComponent();

    const row = (
      await screen.findByText('Pelanggan Satu')
    ).closest('tr');

    const buttons = within(row!).getAllByRole('button');

    fireEvent.click(buttons[1]);

    fireEvent.click(
      screen.getByRole('button', { name: 'Konfirmasi Hapus' })
    );

    await waitFor(() => {
      expect(mockDeleteDoc).toHaveBeenCalledWith({
        collection: 'orders',
        id: 'order-001',
      });

      expect(mockBatchCommit).toHaveBeenCalled();

      expect(mockToastSuccess).toHaveBeenCalledWith(
        'Pesanan dan data terkait berhasil dihapus'
      );
    });
  });

  // TC-ORD-19
  it('TC-ORD-19: Menggunakan data pelanggan yang sudah terdaftar', async () => {
    mockSnapshotData.menu = menuData;

    mockGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{ id: 'customer-existing' }],
    });

    const { container } = renderComponent();

    openCreateForm();
    fillRequiredFields(container);
    selectMenu('Nasi Box');

    fireEvent.click(
      screen.getByRole('button', { name: 'BUAT PESANAN' })
    );

    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        {
          collection: 'customers',
          id: 'customer-existing',
        },
        expect.objectContaining({
          name: 'Pelanggan Baru',
          phone: '081234567899',
        })
      );

      expect(mockToastSuccess).toHaveBeenCalledWith(
        'Pesanan berhasil dibuat'
      );
    });
  });

  // TC-ORD-20
  it('TC-ORD-20: Berhasil mengedit pesanan dan data produksi', async () => {
    mockSnapshotData.orders = orderData;

    mockGetDocs
      .mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 'customer-001' }],
      })
      .mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 'production-001' }],
      });

    renderComponent();

    const row = (
      await screen.findByText('Pelanggan Satu')
    ).closest('tr');

    fireEvent.click(
      within(row!).getAllByRole('button')[0]
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'SIMPAN PERUBAHAN' })
    );

    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        {
          collection: 'orders',
          id: 'order-001',
        },
        expect.objectContaining({
          customerName: 'Pelanggan Satu',
        })
      );

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        {
          collection: 'production',
          id: 'production-001',
        },
        expect.objectContaining({
          customerName: 'Pelanggan Satu',
        })
      );

      expect(mockToastSuccess).toHaveBeenCalledWith(
        'Pesanan berhasil diperbarui'
      );
    });
  });

  // TC-ORD-21
  it('TC-ORD-21: Menangani kegagalan menghapus pesanan', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    mockSnapshotData.orders = orderData;

    mockDeleteDoc.mockRejectedValueOnce(
      new Error('Gagal menghapus pesanan')
    );

    renderComponent();

    const row = (
      await screen.findByText('Pelanggan Satu')
    ).closest('tr');

    fireEvent.click(
      within(row!).getAllByRole('button')[1]
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Konfirmasi Hapus' })
    );

    await waitFor(() => {
      expect(mockHandleFirestoreError).toHaveBeenCalledWith(
        expect.any(Error),
        'DELETE',
        'orders'
      );

      expect(mockToastError).toHaveBeenCalledWith(
        'Gagal menghapus pesanan'
      );
    });
  });

  // TC-ORD-22
  it('TC-ORD-22: Mencari pelanggan berdasarkan nama dan nomor telepon', () => {
    mockSnapshotData.customers = [
      {
        id: 'customer-001',
        name: 'Budi Santoso',
        phone: '081234567890',
        address: 'Malang',
      },
      {
        id: 'customer-002',
        name: 'Siti Aminah',
        phone: '082222222222',
        address: 'Batu',
      },
    ];

    renderComponent();
    openCreateForm();

    const customerInput = screen.getByPlaceholderText(
      'Cari atau ketik nama...'
    );

    fireEvent.change(customerInput, {
      target: { value: 'Budi' },
    });

    expect(screen.getByText('Budi Santoso')).toBeTruthy();
    expect(screen.queryByText('Siti Aminah')).toBeNull();

    fireEvent.change(customerInput, {
      target: { value: '082222' },
    });

    expect(screen.getByText('Siti Aminah')).toBeTruthy();
    expect(screen.queryByText('Budi Santoso')).toBeNull();
  });

  // TC-ORD-23
  it('TC-ORD-23: Memilih pelanggan yang sudah terdaftar', () => {
    mockSnapshotData.customers = [
      {
        id: 'customer-001',
        name: 'Budi Santoso',
        phone: '081234567890',
        address: 'Malang',
      },
    ];

    renderComponent();
    openCreateForm();

    fireEvent.change(
      screen.getByPlaceholderText('Cari atau ketik nama...'),
      { target: { value: 'Budi' } }
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: /Budi Santoso/,
      })
    );

    expect(
      screen.getByDisplayValue('Budi Santoso')
    ).toBeTruthy();

    expect(
      screen.getByDisplayValue('081234567890')
    ).toBeTruthy();

    expect(
      screen.getByDisplayValue('Malang')
    ).toBeTruthy();
  });

  // TC-ORD-24
  it('TC-ORD-24: Menampilkan pilihan pelanggan baru ketika pencarian tidak ditemukan', () => {
    mockSnapshotData.customers = [
      {
        id: 'customer-001',
        name: 'Budi Santoso',
        phone: '081234567890',
        address: 'Malang',
      },
    ];

    renderComponent();
    openCreateForm();

    fireEvent.change(
      screen.getByPlaceholderText('Cari atau ketik nama...'),
      { target: { value: 'Pelanggan Tidak Ada' } }
    );

    expect(
      screen.getByText(/Pelanggan baru:/)
    ).toBeTruthy();

    expect(
      screen.getByRole('button', {
        name: /Teruskan sebagai data baru/i,
      })
    ).toBeTruthy();
  });
});