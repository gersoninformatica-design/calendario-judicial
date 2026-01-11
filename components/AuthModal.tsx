
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.ts';
import { Gavel, Loader2, Mail, Lock, User, LogIn, Info, ShieldCheck, Clock, ArrowRight, KeyRound, ChevronLeft, Save } from 'lucide-react';

const AuthModal: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Detectar si el usuario viene de un correo de recuperación
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && (hash.includes('type=recovery') || hash.includes('access_token='))) {
      setIsResetMode(true);
    }

    // Escuchar el evento de recuperación de Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsResetMode(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isResetMode) {
        // Lógica para actualizar a la nueva contraseña
        if (password !== confirmPassword) throw new Error("Las contraseñas no coinciden");
        if (password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres");

        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        
        setSuccessMsg("¡Contraseña actualizada con éxito!");
        setTimeout(() => {
          window.location.hash = ''; // Limpiar el token de la URL
          setIsResetMode(false);
          setIsForgotPassword(false);
          setIsRegister(false);
        }, 2000);

      } else if (isForgotPassword) {
        // Enviar correo de recuperación
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
          redirectTo: window.location.origin,
        });
        if (resetError) throw resetError;
        setResetSent(true);
      } else if (isRegister) {
        // Registro de nuevo usuario
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
        // Inicio de sesión normal
        const { error: signInError } = await supabase.auth.signInWithPassword({ 
          email: email.toLowerCase().trim(), 
          password 
        });
        if (signInError) throw signInError;
      }
    } catch (err: any) {
      setError(err.message || "Error de comunicación con el servidor");
    } finally {
      setLoading(false);
    }
  };

  // Pantalla de Actualización de Contraseña (Bypass Admin)
  if (isResetMode) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in-95 duration-300 border-4 border-blue-50">
          <div className="bg-blue-600 p-6 rounded-full text-white w-20 h-20 flex items-center justify-center mx-auto mb-8 shadow-xl">
            <Lock className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight text-center">Nueva Contraseña</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-8 text-center">Establece tu credencial de acceso</p>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input required type="password" placeholder="Nueva contraseña segura" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-14 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none font-bold" />
            </div>
            <div className="relative">
              <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input required type="password" placeholder="Confirmar contraseña" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full pl-14 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none font-bold" />
            </div>

            {error && (
              <div className="bg-red-50 p-4 rounded-2xl text-red-600 text-[10px] font-black uppercase flex items-center gap-2">
                <Info className="w-4 h-4" /> {error}
              </div>
            )}

            {successMsg && (
              <div className="bg-green-50 p-4 rounded-2xl text-green-600 text-[10px] font-black uppercase flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> {successMsg}
              </div>
            )}

            <button disabled={loading} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Actualizar Contraseña
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Pantalla de Confirmación de Registro
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

  // Pantalla de Éxito en Envío de Reset (Correo enviado)
  if (resetSent) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl text-center animate-in zoom-in-95 duration-300 border-4 border-amber-50">
          <div className="bg-amber-500 p-6 rounded-full text-white w-24 h-24 flex items-center justify-center mx-auto mb-8 shadow-xl shadow-amber-100 ring-8 ring-amber-50">
            <KeyRound className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">Correo Enviado</h2>
          <p className="text-slate-500 mb-8 font-medium leading-relaxed px-4 text-sm">
            Hemos enviado instrucciones de recuperación a <br/>
            <span className="font-bold text-slate-800">{email}</span>. 
            <br/><br/>
            Haz clic en el enlace del correo para establecer tu nueva clave.
          </p>
          <button 
            onClick={() => { setResetSent(false); setIsForgotPassword(false); }} 
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-black transition-all"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900 p-4">
      <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl animate-in fade-in zoom-in-95 duration-300 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50" />
        
        <div className="flex flex-col items-center mb-10 relative">
          <div className="bg-blue-600 p-5 rounded-[2rem] text-white shadow-2xl shadow-blue-200 mb-6 group hover:rotate-6 transition-transform">
            <Gavel className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">TribunalSync</h1>
          <p className="text-slate-400 text-xs font-black uppercase tracking-widest mt-2">Acceso Jurídico Cloud</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4 relative">
          {isForgotPassword && (
            <button type="button" onClick={() => setIsForgotPassword(false)} className="flex items-center gap-2 text-blue-600 text-[10px] font-black uppercase tracking-widest mb-4 hover:translate-x-[-4px] transition-transform">
              <ChevronLeft className="w-4 h-4" /> Volver al login
            </button>
          )}

          {isRegister && (
            <div className="relative">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input required type="text" placeholder="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full pl-14 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold" />
            </div>
          )}
          
          <div className="relative">
            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input required type="email" placeholder="Correo institucional" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-14 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold" />
          </div>

          {!isForgotPassword && (
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input required type="password" placeholder="Contraseña segura" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-14 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex gap-3 items-center text-red-600">
              <Info className="w-5 h-5 shrink-0" />
              <p className="text-[10px] font-black uppercase leading-tight">{error}</p>
            </div>
          )}

          {!isForgotPassword && !isRegister && (
            <div className="text-right px-1">
              <button type="button" onClick={() => setIsForgotPassword(true)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors">
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}

          <button disabled={loading} className={`w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 ${isForgotPassword ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-100' : 'bg-blue-600 text-white shadow-blue-100 hover:bg-blue-700'}`}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isForgotPassword ? <KeyRound className="w-5 h-5" /> : <LogIn className="w-5 h-5" />)}
            {isForgotPassword ? 'Recuperar Clave' : (isRegister ? 'Solicitar Acceso' : 'Ingresar al Despacho')}
          </button>
        </form>

        {!isForgotPassword && (
          <div className="mt-8 text-center relative">
            <button onClick={() => { setIsRegister(!isRegister); setError(null); }} className="text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-blue-600 transition-colors">
              {isRegister ? '¿Ya eres parte del equipo? Inicia sesión' : '¿Nuevo funcionario? Regístrate aquí'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
