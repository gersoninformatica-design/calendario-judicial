
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.ts';
import { Gavel, Loader2, Mail, Lock, User, LogIn, Info, CheckCircle2 } from 'lucide-react';

const AuthModal: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mailSent, setMailSent] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { 
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin 
          }
        });
        if (error) throw error;
        setMailSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      if (err.message?.includes('Email not confirmed')) {
        setError("Por favor, confirma tu correo electrónico antes de ingresar.");
      } else {
        setError(err.message || "Error de autenticación");
      }
    } finally {
      setLoading(false);
    }
  };

  if (mailSent) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl text-center animate-in zoom-in-95 duration-300">
          <div className="bg-green-100 p-5 rounded-full text-green-600 w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-4">¡Correo Enviado!</h2>
          <p className="text-slate-500 mb-8 font-medium">
            Hemos enviado un enlace de confirmación a <span className="font-bold text-slate-700">{email}</span>. 
          </p>
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl mb-8 text-left">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700 leading-relaxed">
                <span className="font-bold">Nota importante:</span> Si al hacer clic en el correo ves un error de "localhost", no te preocupes. Tu cuenta ya habrá quedado activada. Solo regresa a esta pestaña e inicia sesión.
              </p>
            </div>
          </div>
          <button 
            onClick={() => { setMailSent(false); setIsRegister(false); }}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl hover:bg-black transition-all"
          >
            Ir al Inicio de Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900 p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-4 rounded-3xl text-white shadow-xl shadow-blue-200 mb-4">
            <Gavel className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">TribunalSync</h1>
          <p className="text-slate-400 text-sm font-medium mt-1">Acceso Seguro al Despacho</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isRegister && (
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                required
                type="text"
                placeholder="Nombre completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-medium"
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              required
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-medium"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              required
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-medium"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 p-3 rounded-xl flex gap-2 items-center text-red-600">
              <Info className="w-4 h-4 shrink-0" />
              <p className="text-[11px] font-bold leading-tight">{error}</p>
            </div>
          )}

          <button
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 group"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
            {isRegister ? 'Crear Cuenta Judicial' : 'Ingresar al Sistema'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => { setIsRegister(!isRegister); setError(null); }}
            className="text-slate-500 text-sm font-bold hover:text-blue-600 transition-colors"
          >
            {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes acceso? Regístrate aquí'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
