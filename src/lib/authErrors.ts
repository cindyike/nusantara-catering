// Menerjemahkan kode error Firebase Auth menjadi pesan Bahasa Indonesia yang ramah pengguna.
export function authErrorMessage(err: unknown, fallback = 'Terjadi kesalahan. Silakan coba lagi.'): string {
  const code = (err as { code?: string })?.code || '';
  switch (code) {
    case 'auth/invalid-email': return 'Format email tidak valid.';
    case 'auth/user-disabled': return 'Akun ini telah dinonaktifkan.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials': return 'Email atau kata sandi salah.';
    case 'auth/email-already-in-use': return 'Email sudah terdaftar. Silakan masuk atau gunakan email lain.';
    case 'auth/weak-password': return 'Kata sandi terlalu lemah. Gunakan minimal 8 karakter.';
    case 'auth/too-many-requests': return 'Terlalu banyak percobaan. Tunggu beberapa saat lalu coba lagi.';
    case 'auth/network-request-failed': return 'Koneksi internet bermasalah. Periksa jaringan Anda.';
    default: return fallback;
  }
}
