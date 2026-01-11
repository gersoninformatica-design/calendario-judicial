
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.ts';
import { Gavel, Loader2, Mail, Lock, User, LogIn, Info, CheckCircle2, ShieldCheck } from 'lucide-react';

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
        // 1. Registrar el usuario en Auth
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { 
            data: { 
              full_name: fullName,
            },
            emailRedirectTo: window.location.origin 
          }
        });
        
        if (signUpError) throw signUpError;

        // 2. Crear inmediatamente el perfil en la tabla pública para que Gerson lo vea
        // Incluso si el correo no está verificado, ya lo tendremos en la lista de perfiles
        if (data?.user) {
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: fullName,
            email: email,
            is_approved: false,
            role: 'Funcionario Judicial'
          });
          if (profileError) console.error("Error al crear perfil preventivo:", profileError);
        }

        setMailSent(true);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
    } catch (err: any) {
      setError(err.message || "Error de autenticación");
    } finally {
      setLoading(false);
    }
  };

  if (mailSent) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl text-center animate-in zoom-in-95 duration-300">
          <div className="bg-green-100 p-6 rounded-full text-green-600 w-24 h-24 flex items-center justify-center mx-auto mb-8 shadow-inner ring-8 ring-green-50">
            <ShieldCheck className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">Solicitud de Acceso Enviada</h2>
          <p className="text-slate-500 mb-8 font-medium leading-relaxed">
            Hemos enviado un enlace a <span className="font-bold text-slate-800">{email}</span>. Una vez confirmes tu correo, el administrador <span className="text-blue-600 font-bold">Gerson Informatica</span> deberá aprobar tu acceso al sistema.
          </p>
          <button onClick={() => { setMailSent(false); setIsRegister(false); }} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-black transition-all">Ir al Inicio de Sesión</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900 p-4">
      <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center mb-10">
          <div className="bg-blue-600 p-5 rounded-[2rem] text-white shadow-2xl shadow-blue-200 mb-6 group hover:rotate-6 transition-transform"><Gavel className="w-10 h-10" /></div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">TribunalSync</h1>
          <p className="text-slate-400 text-xs font-black uppercase tracking-widest mt-2">Acceso Jurídico Cloud</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isRegister && (
            <div className="relative">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input required type="text" placeholder="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full pl-14 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold shadow-inner" />
            </div>
          )}
          <div className="relative"><Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" /><input required type="email" placeholder="Correo institucional" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-14 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold shadow-inner" /></div>
          <div className="relative"><Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" /><input required type="password" placeholder="Contraseña segura" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-14 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold shadow-inner" /></div>

          {error && <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex gap-3 items-center text-red-600"><Info className="w-5 h-5 shrink-0" /><p className="text-[10px] font-black uppercase leading-tight">{error}</p></div>}

          <button disabled={loading} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-95">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
            {isRegister ? 'Solicitar Acceso' : 'Ingresar al Despacho'}
          </button>
        </form>

        <div className="mt-8 text-center"><button onClick={() => { setIsRegister(!isRegister); setError(null); }} className="text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-blue-600 transition-colors">{isRegister ? '¿Ya eres parte del equipo? Inicia sesión' : '¿Nuevo funcionario? Regístrate aquí'}</button></div>
      </div>
    </div>
  );
};

export default AuthModal;
