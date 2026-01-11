
import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Trash2, Settings, Download, Upload, ShieldCheck, UserCheck, UserX, Loader2, RefreshCw, UserPlus, Mail, User } from 'lucide-react';
import { Unit, TribunalEvent, UserProfile } from '../types.ts';
import { COLOR_OPTIONS } from '../constants.tsx';
import { supabase } from '../lib/supabase.ts';

interface UnitSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  units: Unit[];
  events: TribunalEvent[];
  userProfile: UserProfile | null;
  currentSession: any;
  onUpdateUnits: (units: Unit[]) => void;
  onImportData: (events: TribunalEvent[], units: Unit[]) => void;
  initialTab?: 'units' | 'users' | 'sync';
}

const UnitSettingsModal: React.FC<UnitSettingsModalProps> = ({ isOpen, onClose, units, events, userProfile, currentSession, onUpdateUnits, onImportData, initialTab = 'units' }) => {
  const [activeTab, setActiveTab] = useState<'units' | 'users' | 'sync'>(initialTab);
  const [newUnitName, setNewUnitName] = useState('');
  const [selectedColor, setSelectedColor] = useState<Unit['color']>('blue');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // Estados para Registro Manual
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [isCreatingManual, setIsCreatingManual] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  const ADMIN_EMAIL = 'gerson.informatica@gmail.com';
  const isAdmin = currentSession?.user?.email?.toLowerCase().trim() === ADMIN_EMAIL;

  useEffect(() => {
    if (activeTab === 'users' && isAdmin && isOpen) {
      fetchUsers();
    }
  }, [activeTab, isAdmin, isOpen]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setAllUsers(data);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleApproveUser = async (userId: string, approve: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_approved: approve }).eq('id', userId);
    if (!error) fetchUsers();
  };

  const handleManualRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName || !manualEmail) return;
    
    setIsCreatingManual(true);
    try {
      // Restaurado: Se vuelve a incluir el email en la inserción manual
      const { error } = await supabase.from('profiles').insert({
        full_name: manualName,
        email: manualEmail.toLowerCase().trim(),
        is_approved: true,
        role: 'Funcionario Judicial'
      });
      
      if (error) throw error;
      
      setManualName('');
      setManualEmail('');
      fetchUsers();
      alert(`¡Listo Gerson! ${manualName} ya está pre-aprobado. Pídele que se registre con su correo institucional.`);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsCreatingManual(false);
    }
  };

  if (!isOpen) return null;

  const handleAddUnit = () => {
    if (!newUnitName.trim()) return;
    onUpdateUnits([...units, { id: Math.random().toString(36).substr(2, 9), name: newUnitName.trim(), color: selectedColor }]);
    setNewUnitName('');
    setSelectedColor('blue');
  };

  const getColorHex = (color: string) => {
    const hexMap: Record<string, string> = { blue: '#3b82f6', red: '#ef4444', purple: '#a855f7', green: '#22c55e', amber: '#f59e0b', slate: '#64748b', rose: '#f43f5e', indigo: '#6366f1' };
    return hexMap[color] || '#64748b';
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-[3rem] w-full max-w-3xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-8 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-lg shadow-blue-100"><Settings className="w-6 h-6" /></div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Consola de Control</h3>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Gestión Centralizada del Tribunal</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        <div className="flex bg-slate-50 p-2 m-8 rounded-2xl border border-slate-100 shrink-0">
           <button onClick={() => setActiveTab('units')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'units' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Unidades</button>
           {isAdmin && (
             <button onClick={() => setActiveTab('users')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'users' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400'}`}>Seguridad Usuarios</button>
           )}
           <button onClick={() => setActiveTab('sync')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'sync' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Sincronización</button>
        </div>

        <div className="px-8 pb-8 overflow-y-auto flex-1 no-scrollbar">
          {activeTab === 'units' && (
            <div className="space-y-6 animate-in fade-in duration-300">
               <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Nueva Unidad</h4>
                 <div className="space-y-4">
                   <input value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} placeholder="Nombre de la unidad judicial..." className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none text-sm font-bold shadow-inner" />
                   <div className="flex items-center justify-between">
                     <div className="flex gap-2">{COLOR_OPTIONS.map(color => <button key={color} onClick={() => setSelectedColor(color)} className={`w-6 h-6 rounded-full border-2 transition-all ${selectedColor === color ? 'border-slate-800 scale-125 shadow-md' : 'border-transparent'}`} style={{ backgroundColor: getColorHex(color) }} />)}</div>
                     <button onClick={handleAddUnit} disabled={!newUnitName.trim()} className="bg-blue-600 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg">Añadir</button>
                   </div>
                 </div>
               </div>
               <div className="grid gap-3">{units.map(unit => <div key={unit.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-3"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: getColorHex(unit.color) }} /><input value={unit.name} onChange={(e) => onUpdateUnits(units.map(u => u.id === unit.id ? { ...u, name: e.target.value } : u))} className="flex-1 bg-transparent font-bold text-slate-700 outline-none" /><button onClick={() => onUpdateUnits(units.filter(u => u.id !== unit.id))} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button></div>)}</div>
            </div>
          )}

          {activeTab === 'users' && isAdmin && (
            <div className="space-y-8 animate-in fade-in duration-300">
               <div className="bg-amber-50 border-2 border-amber-100 rounded-[2.5rem] p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <UserPlus className="w-6 h-6 text-amber-600" />
                    <h4 className="text-sm font-black text-amber-900 uppercase tracking-widest">Pre-Aprobar Funcionario (Invitación)</h4>
                  </div>
                  
                  <form onSubmit={handleManualRegister} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
                      <input 
                        required
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        placeholder="Nombre completo" 
                        className="w-full pl-11 pr-4 py-3 bg-white border border-amber-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-amber-500/20" 
                      />
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
                      <input 
                        required
                        type="email"
                        value={manualEmail}
                        onChange={(e) => setManualEmail(e.target.value)}
                        placeholder="Correo institucional" 
                        className="w-full pl-11 pr-4 py-3 bg-white border border-amber-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-amber-500/20" 
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={isCreatingManual}
                      className="md:col-span-2 py-3 bg-amber-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-200 hover:bg-amber-700 transition-all flex items-center justify-center gap-2"
                    >
                      {isCreatingManual ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                      Autorizar Acceso Inmediato
                    </button>
                  </form>
               </div>

               <div className="space-y-4">
                 <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Listado Maestro de Usuarios</h4>
                   <button onClick={fetchUsers} disabled={loadingUsers} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-all">
                     <RefreshCw className={`w-4 h-4 ${loadingUsers ? 'animate-spin' : ''}`} />
                   </button>
                 </div>
                 
                 {loadingUsers && allUsers.length === 0 ? <div className="flex justify-center py-12"><Loader2 className="w-10 h-10 text-blue-500 animate-spin" /></div> : (
                   <div className="grid gap-3">
                     {allUsers.map(u => (
                       <div key={u.id || u.email} className={`bg-white border p-5 rounded-2xl flex items-center justify-between group transition-all ${u.is_approved ? 'border-slate-100' : 'border-red-200 bg-red-50/20 animate-pulse'}`}>
                          <div className="flex items-center gap-4">
                             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs ${u.is_approved ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                                {u.full_name?.substring(0,2).toUpperCase()}
                             </div>
                             <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-black text-slate-800">{u.full_name}</p>
                                  {u.is_approved && <UserCheck className="w-3 h-3 text-green-500" />}
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{u.email || 'Sin correo'}</p>
                             </div>
                          </div>
                          <div className="flex gap-2">
                             {u.email?.toLowerCase().trim() !== ADMIN_EMAIL && (
                               <>
                                 {u.is_approved ? (
                                   <button onClick={() => handleApproveUser(u.id, false)} className="p-3 text-red-400 hover:bg-red-50 rounded-xl transition-all" title="Suspender Acceso"><UserX className="w-5 h-5" /></button>
                                 ) : (
                                   <button onClick={() => handleApproveUser(u.id, true)} className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-green-700 transition-all">Aprobar Ahora</button>
                                 )}
                               </>
                             )}
                          </div>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
            </div>
          )}

          {activeTab === 'sync' && (
            <div className="space-y-6 animate-in fade-in duration-300">
               <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => { const data = { units, events, exportDate: new Date().toISOString(), app: 'TribunalSync' }; const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `Copia_Tribunal_${new Date().toISOString().split('T')[0]}.json`; link.click(); }} className="p-8 bg-slate-50 border border-slate-100 rounded-[2rem] flex flex-col items-center gap-4 hover:border-blue-300 transition-all group">
                     <div className="bg-white p-3 rounded-2xl shadow-sm group-hover:scale-110 transition-transform"><Download className="w-6 h-6 text-blue-600" /></div>
                     <div className="text-center"><p className="text-xs font-black text-slate-800 uppercase tracking-widest">Respaldar</p><p className="text-[9px] text-slate-400 mt-1">Descargar copia completa</p></div>
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="p-8 bg-slate-50 border border-slate-100 rounded-[2rem] flex flex-col items-center gap-4 hover:border-indigo-300 transition-all group">
                     <div className="bg-white p-3 rounded-2xl shadow-sm group-hover:scale-110 transition-transform"><Upload className="w-6 h-6 text-indigo-600" /></div>
                     <div className="text-center"><p className="text-xs font-black text-slate-800 uppercase tracking-widest">Restaurar</p><p className="text-[9px] text-slate-400 mt-1">Cargar desde archivo</p></div>
                  </button>
                  <input type="file" ref={fileInputRef} onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = (ev) => { try { const data = JSON.parse(ev.target?.result as string); if (data.app === 'TribunalSync') onImportData(data.events.map((ex:any)=>({...ex, startTime:new Date(ex.startTime), endTime:new Date(ex.endTime)})), data.units); } catch(err){ alert('Error'); } }; reader.readAsText(file); } }} className="hidden" accept=".json" />
               </div>
            </div>
          )}
        </div>
        
        <div className="p-8 bg-slate-50 border-t border-slate-100"><button onClick={onClose} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all">Guardar Configuraciones</button></div>
      </div>
    </div>
  );
};

export default UnitSettingsModal;
