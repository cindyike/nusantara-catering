import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, Lock, Mail, User as UserIcon, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import { auth, db } from '../lib/firebase';
import AuthLayout from '../components/AuthLayout';
import { authErrorMessage } from '../lib/authErrors';

const inputClass = 'w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-gray-800 shadow-sm text-lg';
const labelClass = 'text-sm font-semibold text-gray-700 tracking-wide uppercase flex items-center gap-2';

const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (name.trim().length < 3) return setError('Nama lengkap minimal 3 karakter.');
    if (password.length < 8) return setError('Kata sandi minimal 8 karakter.');
    if (password !== confirm) return setError('Konfirmasi kata sandi tidak cocok.');

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      try {
        await updateProfile(cred.user, { displayName: name.trim() });
        // Permintaan akses berstatus "pending"; hanya Superadmin yang dapat mengaktifkannya.
        await setDoc(doc(db, 'user_roles', cred.user.uid), {
          uid: cred.user.uid,
          displayName: name.trim(),
          email: cred.user.email,
          role: 'admin',
          status: 'pending',
          createdAt: serverTimestamp(),
        });
      } catch (innerErr) {
        // Batalkan akun yang setengah jadi agar pengguna bisa mendaftar ulang.
        await cred.user.delete().catch(() => {});
        throw innerErr;
      }
      await signOut(auth);
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setError(authErrorMessage(err, 'Pendaftaran gagal. Silakan coba lagi.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Buat Akun Baru"
      subtitle="Daftar sebagai Admin Nusantara Catering"
      footer={
        <p className="text-slate-500 font-medium tracking-wide">
          Sudah punya akun? <Link to="/login" className="text-primary font-bold hover:underline">Masuk</Link>
        </p>
      }
    >
      <form onSubmit={handleRegister} className="space-y-5">
        <div className="space-y-3">
          <label className={labelClass}><UserIcon className="w-4 h-4 text-primary" />Nama Lengkap</label>
          <input required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Nama Anda" autoComplete="name" />
        </div>
        <div className="space-y-3">
          <label className={labelClass}><Mail className="w-4 h-4 text-primary" />Alamat Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="nama@email.com" autoComplete="email" />
        </div>
        <div className="space-y-3">
          <label className={labelClass}><Lock className="w-4 h-4 text-primary" />Kata Sandi</label>
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="Minimal 8 karakter" autoComplete="new-password" />
        </div>
        <div className="space-y-3">
          <label className={labelClass}><Lock className="w-4 h-4 text-primary" />Konfirmasi Kata Sandi</label>
          <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} placeholder="Ulangi kata sandi" autoComplete="new-password" />
        </div>

        <p className="text-sm text-slate-500 bg-slate-50 border border-slate-100 rounded-2xl p-4">
          Akun baru berstatus <b>menunggu persetujuan</b>. Anda dapat masuk ke dashboard setelah Superadmin mengaktifkan akun Anda.
        </p>

        {error && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 bg-red-50 text-red-600 p-4 rounded-2xl border-2 border-red-100 text-sm font-bold">
            <AlertCircle className="w-5 h-5 shrink-0" /> {error}
          </motion.div>
        )}

        <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary-dark text-white py-5 rounded-2xl font-black text-xl shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70">
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <UserPlus className="w-6 h-6" />}
          DAFTAR
        </button>
      </form>
    </AuthLayout>
  );
};

export default Register;
