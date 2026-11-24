import React from 'react';
import { motion } from 'motion/react';
import loginBg from '../assets/images/login-bg.jpg';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

// Tata letak bersama untuk halaman Masuk, Daftar, dan Lupa Kata Sandi.
const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children, footer }) => (
  <div className="flex min-h-screen w-full bg-white flex-col lg:flex-row">
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full lg:w-[55%] h-64 lg:h-screen relative"
    >
      <img src={loginBg} alt="Catering Service" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/60 via-primary/20 to-transparent lg:bg-primary/20" />
      <div className="absolute inset-0 bg-black/10" />
    </motion.div>

    <div className="lg:w-[45%] flex flex-col items-center justify-center p-8 md:p-12 lg:p-16 bg-white relative">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg space-y-8">
        <div className="text-center lg:text-left space-y-3">
          <h2 className="text-3xl lg:text-4xl font-display font-bold text-gray-900 tracking-tight leading-tight">{title}</h2>
          <p className="text-slate-500 text-lg font-medium">{subtitle}</p>
        </div>
        {children}
        {footer && <div className="pt-8 border-t border-slate-100 text-center">{footer}</div>}
      </motion.div>
    </div>
  </div>
);

export default AuthLayout;
