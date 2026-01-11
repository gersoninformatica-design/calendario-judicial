
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.ts';
import { Gavel, Loader2, Mail, Lock, User, LogIn, Info, ShieldCheck, Clock, ArrowRight } from 'lucide-react';

const AuthModal: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.toLowerCase().trim(),
          password,
          options: { data: { full_name: fullName } }
        });
        
        if (signUpError) throw signUpError;

        if (data?.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: fullName,
            email: email.toLowerCase().trim(),
            is_approved: false,
            role: 'Funcionario Judicial'
          });
        }
        setRequestSent(true);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ 
          email: email.toLowerCase().trim(), 
          password 
        });
        if (signInError) throw signInError;
      }
    } catch (err: any) {
      setError(err.message || "Error de autenticación");
    } finally {
      setLoading(false);
    }
  };

  if (requestSent) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl text-center animate-in zoom-in-95 duration-300 border-4 border-blue-50">
          <div className="bg-blue-600 p-6 rounded-full text-white w-24 h-24 flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-100 ring-8 ring-blue-50">
            <ShieldCheck className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">¡Registro Exitoso!</h2>
          <div className="bg-slate-50 p-6 rounded-3xl mb-8 text-left border border-slate-100">
            <p className="text-slate-600 text-xs font-bold leading-relaxed">
              Hemos registrado tu cuenta para <span className="text-blue-600">{email}</span>. 
              <br/><br/>
              <span className="text-slate-900 font-black uppercase text-[10px] block mb-1">Nota importante:</span>
              Si el correo de confirmación no llega en 1 minuto, no te preocupes. **Ya puedes intentar iniciar sesión directamente.**
            </p>
          </div>
          <button 
            onClick={() => { setRequestSent(false); setIsRegister(false); }} 
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2"
          >
            Ir al Inicio de Sesión <ArrowRight className="w-4 h-4" />
          </button>
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
          <div className="relative">
            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input required type="email" placeholder="Correo institucional" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-14 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold shadow-inner" />
          </div>
          <div className="relative">
            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input required type="password" placeholder="Contraseña segura" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-14 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold shadow-inner" />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex gap-3 items-center text-red-600">
              <Info className="w-5 h-5 shrink-0" />
              <p className="text-[10px] font-black uppercase leading-tight">{error}</p>
            </div>
          )}

          <button disabled={loading} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-95">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
            {isRegister ? 'Solicitar Acceso' : 'Ingresar al Despacho'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button onClick={() => { setIsRegister(!isRegister); setError(null); }} className="text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-blue-600 transition-colors">
            {isRegister ? '¿Ya eres parte del equipo? Inicia sesión' : '¿Nuevo funcionario? Regístrate aquí'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
