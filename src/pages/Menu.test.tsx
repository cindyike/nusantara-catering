import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Menu from './Menu';
import { addDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';

const mocks = vi.hoisted(() => ({
  menuDocs: [] as any[],
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  onSnapshot: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(() => ({})),
  serverTimestamp: vi.fn(() => 'timestamp'),
  orderBy: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  writeBatch: vi.fn(),
}));

vi.mock('../lib/firebase', () => ({
  db: {},
  handleFirestoreError: vi.fn(),
  OperationType: {
    LIST: 'LIST',
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('motion/react', () => ({
  motion: {
    div: 'div',
  },
  AnimatePresence: ({ children }: any) => children,
}));

vi.mock('../components/ConfirmModal', () => ({
  default: () => null,
}));

describe('Pengujian handleSubmit pada Katalog Menu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.menuDocs = [];

    vi.mocked(onSnapshot).mockImplementation(
      ((_query: any, callback: any) => {
        callback({ docs: mocks.menuDocs });
        return vi.fn();
      }) as any
    );
  });

  const isiForm = () => {
    fireEvent.change(screen.getByPlaceholderText('Apa yang kita masak?'), {
      target: { value: 'Nasi Ayam Bakar' },
    });

    fireEvent.change(screen.getByPlaceholderText('0'), {
      target: { value: '25000' },
    });

    fireEvent.change(screen.getByPlaceholderText('30'), {
      target: { value: '20' },
    });

    fireEvent.change(
      screen.getByPlaceholderText('Jelaskan rasa dan bahan-bahannya...'),
      {
        target: { value: 'Nasi dengan ayam bakar dan sambal' },
      }
    );
  };

  it('TC-01: Berhasil menambahkan menu baru', async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: 'menu-1' } as any);

    render(<Menu />);

    fireEvent.click(
      screen.getByRole('button', { name: /item menu baru/i })
    );

    isiForm();

    fireEvent.click(
      screen.getByRole('button', { name: /simpan hidangan/i })
    );

    await waitFor(() => {
      expect(addDoc).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        'Item menu berhasil ditambahkan'
      );
    });
  });

  it('TC-02: Berhasil memperbarui menu', async () => {
    mocks.menuDocs = [
      {
        id: 'menu-1',
        data: () => ({
          name: 'Nasi Ayam Bakar',
          description: 'Menu lama',
          price: 20000,
          category: 'Catering Box',
          preparationTime: 30,
          imageUrl: '',
        }),
      },
    ];

    vi.mocked(updateDoc).mockResolvedValue(undefined);

    render(<Menu />);

    const menuCard = screen
      .getByText('Nasi Ayam Bakar')
      .closest('.group');

    const editButton = menuCard?.querySelector('button');

    expect(editButton).not.toBeNull();

    fireEvent.click(editButton!);

    fireEvent.change(screen.getByPlaceholderText('Apa yang kita masak?'), {
      target: { value: 'Nasi Ayam Geprek' },
    });

    fireEvent.change(screen.getByPlaceholderText('0'), {
      target: { value: '22000' },
    });

    fireEvent.change(screen.getByPlaceholderText('30'), {
      target: { value: '15' },
    });

    fireEvent.change(
      screen.getByPlaceholderText('Jelaskan rasa dan bahan-bahannya...'),
      {
        target: { value: 'Nasi ayam geprek pedas' },
      }
    );

    fireEvent.click(
      screen.getByRole('button', { name: /simpan perubahan/i })
    );

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        'Item menu berhasil diperbarui'
      );
    });
  });

  it('TC-03: Gagal menambahkan menu karena Firestore error', async () => {
    vi.mocked(addDoc).mockRejectedValue(
      new Error('Firestore error')
    );

    render(<Menu />);

    fireEvent.click(
      screen.getByRole('button', { name: /item menu baru/i })
    );

    isiForm();

    fireEvent.click(
      screen.getByRole('button', { name: /simpan hidangan/i })
    );

    await waitFor(() => {
      expect(addDoc).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith(
        'Gagal menyimpan item menu'
      );
    });
  });
});