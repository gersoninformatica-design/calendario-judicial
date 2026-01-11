
import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Trash2, Check, Settings, Download, Upload, Share2, ShieldCheck, UserCheck, UserX, Loader2 } from 'lucide-react';
import { Unit, TribunalEvent, UserProfile } from '../types.ts';
import { COLOR_OPTIONS } from '../constants.tsx';
import { supabase } from '../lib/supabase.ts';

interface UnitSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  units: Unit[];
  events: TribunalEvent[];
  userProfile: UserProfile | null;
  onUpdateUnits: (units: Unit[]) => void;
  onImportData: (events: TribunalEvent[], units: Unit[]) => void;
}

const UnitSettingsModal: React.FC<UnitSettingsModalProps> = ({ isOpen, onClose, units, events, userProfile, onUpdateUnits, onImportData }) => {
  const [activeTab, setActiveTab] = useState<'units' | 'users' | 'sync'>('units');
  const [newUnitName, setNewUnitName] = useState('');
  const [selectedColor, setSelectedColor] = useState<Unit['color']>('blue');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = userProfile?.email === 'gerson.informatica@gmail.com';

  useEffect(() => {
    if (activeTab === 'users' && isAdmin) {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setAllUsers(data);
    setLoadingUsers(false);
  };

  const handleApproveUser = async (userId: string, approve: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_approved: approve }).eq('id', userId);
    if (!error) fetchUsers();
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
      <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-8 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-lg shadow-blue-100"><Settings className="w-6 h-6" /></div>
            <div><h3 className="text-xl font-black text-slate-800 tracking-tight">Consola de Control</h3><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Gestión Centralizada del Tribunal</p></div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        <div className="flex bg-slate-50 p-2 m-8 rounded-2xl border border-slate-100">
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
            <div className="space-y-4 animate-in fade-in duration-300">
               <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl mb-6"><div className="flex gap-3"><ShieldCheck className="w-5 h-5 text-amber-600" /><p className="text-[10px] font-bold text-amber-800 uppercase tracking-tight leading-tight">Gerson, como administrador, tienes el poder de autorizar el acceso a la plataforma.</p></div></div>
               {loadingUsers ? <div className="flex justify-center py-12"><Loader2 className="w-10 h-10 text-blue-500 animate-spin" /></div> : (
                 <div className="grid gap-3">
                   {allUsers.map(u => (
                     <div key={u.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between group hover:border-blue-200 transition-all">
                        <div className="flex items-center gap-4">
                           <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-[10px] ${u.is_approved ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>{u.full_name?.substring(0,2).toUpperCase()}</div>
                           <div>
                              <p className="text-sm font-black text-slate-800">{u.full_name}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{u.role} {u.email === userProfile?.email ? '(Tú)' : ''}</p>
                           </div>
                        </div>
                        <div className="flex gap-2">
                           {u.id !== userProfile?.id && (
                             <>
                               {u.is_approved ? (
                                 <button onClick={() => handleApproveUser(u.id, false)} className="p-3 text-red-400 hover:bg-red-50 rounded-xl transition-all" title="Bloquear Acceso"><UserX className="w-5 h-5" /></button>
                               ) : (
                                 <button onClick={() => handleApproveUser(u.id, true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md hover:bg-green-700 transition-all"><UserCheck className="w-4 h-4" /> Aprobar</button>
                               )}
                             </>
                           )}
                        </div>
                     </div>
                   ))}
                 </div>
               )}
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
