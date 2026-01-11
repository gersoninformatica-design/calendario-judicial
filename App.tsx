
import React, { useState, useMemo, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar.tsx';
import CalendarGrid from './components/CalendarGrid.tsx';
import ListView from './components/ListView.tsx';
import EventModal from './components/EventModal.tsx';
import UnitSettingsModal from './components/UnitSettingsModal.tsx';
import AuthModal from './components/AuthModal.tsx';
import { TribunalEvent, Unit, UserProfile } from './types.ts';
import { supabase } from './lib/supabase.ts';
import { format } from 'date-fns';
import { 
  FileText, 
  BarChart3, 
  Sparkles, 
  Loader2, 
  Users, 
  ShieldCheck, 
  Activity, 
  History, 
  Clock, 
  ShieldAlert,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { analyzeSchedule } from './services/geminiService.ts';
import { exportToPDF, exportToExcel } from './utils/exportUtils.ts';

interface ActivityItem {
  id: string;
  userName: string;
  action: 'creó' | 'actualizó' | 'eliminó' | 'canceló';
  target: string;
  timestamp: Date;
}

const App: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeView, setActiveView] = useState<'calendar' | 'tasks' | 'reminders' | 'reunions'>('calendar');
  const [events, setEvents] = useState<TribunalEvent[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [unitModalInitialTab, setUnitModalInitialTab] = useState<'units' | 'users' | 'sync'>('units');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedEvent, setSelectedEvent] = useState<TribunalEvent | undefined>(undefined);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const broadcastChannel = useRef<any>(null);

  const ADMIN_EMAIL = 'gerson.informatica@gmail.com';
  const checkIsAdmin = (email?: string) => email?.toLowerCase().trim() === ADMIN_EMAIL;
  
  // isAdmin se basa puramente en el correo de la sesión de Supabase
  const isAdmin = useMemo(() => checkIsAdmin(session?.user?.email), [session]);

  // isApproved es true si el perfil dice que sí O si eres el Administrador Gerson (Failsafe)
  const isApproved = useMemo(() => {
    if (isAdmin) return true;
    return profile?.is_approved || false;
  }, [profile, isAdmin]);

  useEffect(() => {
    // Detectar modo recuperación inicial SOLO si no hay sesión
    if (window.location.hash.includes('type=recovery') || window.location.hash.includes('access_token=')) {
      setIsRecoveryMode(true);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setIsRecoveryMode(false);
        fetchOrCreateProfile(session.user.id, session.user.email, session.user.user_metadata?.full_name);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
      } else if (session) {
        setIsRecoveryMode(false);
      }

      if (session) fetchOrCreateProfile(session.user.id, session.user.email, session.user.user_metadata?.full_name);
      else {
        setProfile(null);
        setEvents([]);
        setOnlineUsers([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchOrCreateProfile = async (userId: string, email: string | undefined, fullName: string | undefined) => {
    try {
      let { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      
      if (profileData) {
        setProfile(profileData);
        return;
      }

      if (email) {
        const { data: inviteData } = await supabase.from('profiles').select('*').eq('email', email.toLowerCase().trim()).maybeSingle();
        
        if (inviteData) {
          const { data: updatedProfile, error: updateError } = await supabase.from('profiles')
            .update({ id: userId, full_name: fullName || inviteData.full_name })
            .eq('email', email.toLowerCase().trim())
            .select()
            .single();
            
          if (!updateError && updatedProfile) {
            setProfile(updatedProfile);
            return;
          }
        }
      }

      const isUserGerson = checkIsAdmin(email);
      const { data: newProfile, error: createError } = await supabase.from('profiles').insert({
        id: userId,
        full_name: fullName || 'Funcionario Judicial',
        email: email?.toLowerCase().trim(),
        role: isUserGerson ? 'Administrador de Sistemas' : 'Funcionario Judicial',
        is_approved: isUserGerson
      }).select().maybeSingle();
      
      if (newProfile) setProfile(newProfile);

    } catch (err) { 
      console.error("Critical Profile Error:", err); 
    }
  };

  useEffect(() => {
    if (!session || !profile || !isApproved) return;
    const channel = supabase.channel('tribunal-realtime', { config: { presence: { key: session.user.id } } });
    broadcastChannel.current = channel;
    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const users = Object.values(newState).flat().map((p: any) => p);
        const uniqueUsers = Array.from(new Map(users.map(u => [u.id, u])).values());
        setOnlineUsers(uniqueUsers);
      })
      .on('broadcast', { event: 'user-action' }, ({ payload }) => {
        setActivities(prev => [{ ...payload, timestamp: new Date(payload.timestamp) }, ...prev].slice(0, 15));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const newE = { ...payload.new, startTime: new Date(payload.new.startTime), endTime: new Date(payload.new.endTime) } as TribunalEvent;
          setEvents(prev => [...prev.filter(e => e.id !== newE.id), newE]);
        } else if (payload.eventType === 'UPDATE') {
          const updE = { ...payload.new, startTime: new Date(payload.new.startTime), endTime: new Date(payload.new.endTime) } as TribunalEvent;
          setEvents(prev => prev.map(e => e.id === updE.id ? updE : e));
        } else if (payload.eventType === 'DELETE') {
          setEvents(prev => prev.filter(e => e.id !== payload.old.id));
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ id: profile.id, full_name: profile.full_name, role: profile.role || 'Funcionario Judicial' });
        }
      });
    return () => { channel.unsubscribe(); };
  }, [session, profile, isApproved]);

  useEffect(() => {
    if (!session || (profile && !isApproved)) {
      setIsLoaded(true);
      return;
    }
    const fetchData = async () => {
      try {
        const { data: unitsData } = await supabase.from('units').select('*').order('name');
        const { data: eventsData } = await supabase.from('events').select('*').order('startTime');
        setUnits(unitsData || []);
        setEvents((eventsData || []).map(e => ({ ...e, startTime: new Date(e.startTime), endTime: new Date(e.endTime) })));
        setIsLoaded(true);
      } catch (err) { setIsOnline(false); setIsLoaded(true); }
    };
    fetchData();
  }, [session, profile, isApproved]);

  const handleRecoveryComplete = () => {
    setIsRecoveryMode(false);
    window.location.hash = ''; 
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = window.location.origin;
  };

  const filteredEvents = useMemo(() => {
    let base = events;
    if (activeUnitId) base = base.filter(e => e.unitId === activeUnitId);
    if (activeView === 'tasks') return base.filter(e => e.type === 'tarea');
    if (activeView === 'reminders') return base.filter(e => e.type === 'recordatorio');
    if (activeView === 'reunions') return base.filter(e => e.type === 'reunion');
    return base;
  }, [events, activeUnitId, activeView]);

  const eventsWithUnit = useMemo(() => {
    return filteredEvents.map(e => ({ ...e, unit: units.find(u => u.id === e.unitId)?.name || 'Desconocida' }));
  }, [filteredEvents, units]);

  const notifyAction = (action: ActivityItem['action'], target: string) => {
    if (broadcastChannel.current && profile) {
      const payload = { id: crypto.randomUUID(), userName: profile.full_name, action, target, timestamp: new Date() };
      broadcastChannel.current.send({ type: 'broadcast', event: 'user-action', payload });
      setActivities(prev => [payload, ...prev].slice(0, 15));
    }
  };

  const handleSaveEvent = async (eventData: Omit<TribunalEvent, 'id'>) => {
    if (!session || !profile) return;
    const payload = { ...eventData, startTime: eventData.startTime.toISOString(), endTime: eventData.endTime.toISOString(), user_id: session.user.id };
    try {
      if (selectedEvent) {
        await supabase.from('events').update(payload).eq('id', selectedEvent.id);
        notifyAction(eventData.status === 'cancelado' ? 'canceló' : 'actualizó', eventData.title);
      } else {
        await supabase.from('events').insert({ ...payload, id: crypto.randomUUID() });
        notifyAction('creó', eventData.title);
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteEvent = async (id: string) => {
    const event = events.find(e => e.id === id);
    if (event) {
      await supabase.from('events').delete().eq('id', id);
      notifyAction('eliminó', event.title);
    }
    setIsModalOpen(false);
  };

  if (!isLoaded) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900">
      <div className="relative"><Loader2 className="w-16 h-16 text-blue-500 animate-spin" /><ShieldCheck className="w-6 h-6 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" /></div>
      <p className="text-slate-400 font-bold mt-6 tracking-widest uppercase text-[10px]">Verificando Credenciales...</p>
    </div>
  );

  if (isRecoveryMode || !session) {
    return <AuthModal onRecoveryComplete={handleRecoveryComplete} />;
  }

  // PANTALLA DE APROBACIÓN PARA NUEVOS USUARIOS (Ej: PABLITO)
  if (profile && !isApproved) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-200 max-w-lg animate-in zoom-in-95 duration-500">
           <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner ring-8 ring-amber-50">
             <ShieldAlert className="w-12 h-12 text-amber-600" />
           </div>
           <h1 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">Acceso Pendiente</h1>
           <p className="text-slate-500 font-medium mb-8 leading-relaxed">
             Hola <span className="text-slate-800 font-bold">{profile.full_name}</span>. Tu cuenta está verificada, pero un administrador debe autorizar tu ingreso por primera vez.
           </p>
           <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl mb-8 text-left">
             <div className="flex gap-4">
                <Users className="w-6 h-6 text-blue-600 shrink-0" />
                <div>
                   <p className="text-xs font-black text-blue-900 uppercase tracking-widest mb-1">Responsable de Seguridad</p>
                   <p className="text-sm font-bold text-blue-700">Gerson Informatica</p>
                </div>
             </div>
           </div>
           <div className="flex flex-col gap-4">
             <button onClick={() => window.location.reload()} className="flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all">
               <RefreshCw className="w-4 h-4" /> Verificar Aprobación
             </button>
             <button onClick={handleSignOut} className="py-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-red-500 transition-colors flex items-center justify-center gap-2">
               <LogOut className="w-4 h-4" /> Cerrar Sesión e Ingresar como Admin
             </button>
           </div>
        </div>
      </div>
    );
  }

  const handleOpenUnitModal = (tab: 'units' | 'users' | 'sync' = 'units') => {
    setUnitModalInitialTab(tab);
    setIsUnitModalOpen(true);
  };

  return (
    <div className="flex bg-slate-50 min-h-screen text-slate-900 overflow-hidden font-inter">
      <Sidebar 
        units={units} activeUnitId={activeUnitId} activeView={activeView} user={{...profile, email: session?.user?.email} as UserProfile}
        onSelectView={setActiveView} onSelectUnit={setActiveUnitId} 
        onManageUnits={handleOpenUnitModal}
      />

      <main className="flex-1 flex flex-col p-8 h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${isOnline ? 'bg-green-50 border-green-200 text-green-600 shadow-sm' : 'bg-red-50 border-red-200 text-red-600'}`}>
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            {isOnline ? (isAdmin ? 'Admin Modo: Gerson' : 'Tribunal Cloud: Activo') : 'Sin Conexión'}
          </div>
          <div className="flex gap-3">
            <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
              <button onClick={() => exportToPDF(eventsWithUnit)} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 text-slate-600 text-sm font-semibold rounded-xl transition-colors"><FileText className="w-4 h-4 text-red-500" />PDF</button>
              <button onClick={() => exportToExcel(eventsWithUnit)} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 text-slate-600 text-sm font-semibold rounded-xl transition-colors"><BarChart3 className="w-4 h-4 text-green-500" />Excel</button>
            </div>
            <button onClick={() => { setIsAnalyzing(true); analyzeSchedule(eventsWithUnit).then(res => { setAiAnalysis(res); setIsAnalyzing(false); }); }} disabled={isAnalyzing} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-2xl shadow-lg hover:shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50">
              {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}Asistente IA
            </button>
          </div>
        </div>

        <div className="flex gap-8 flex-1 min-h-0">
          <div className="flex-1 min-w-0">
            {activeView === 'calendar' ? (
              <CalendarGrid 
                currentDate={currentDate} setCurrentDate={setCurrentDate} events={filteredEvents} units={units}
                onAddEvent={(date) => { setSelectedDate(date); setSelectedEvent(undefined); setIsModalOpen(true); }}
                onEditEvent={(event) => { setSelectedEvent(event); setSelectedDate(undefined); setIsModalOpen(true); }}
                onMoveEvent={(id, date) => {
                  const event = events.find(e => e.id === id);
                  if (event) {
                    const duration = event.endTime.getTime() - event.startTime.getTime();
                    const newStart = new Date(date);
                    newStart.setHours(event.startTime.getHours(), event.startTime.getMinutes());
                    supabase.from('events').update({ startTime: newStart.toISOString(), endTime: new Date(newStart.getTime() + duration).toISOString() }).eq('id', id).then(() => notifyAction('actualizó', event.title));
                  }
                }}
              />
            ) : (
              <ListView title={activeView === 'tasks' ? 'Tareas Judiciales' : activeView === 'reminders' ? 'Recordatorios' : 'Reuniones'} events={filteredEvents} units={units} onEditEvent={(event) => { setSelectedEvent(event); setIsModalOpen(true); }} onToggleStatus={(event) => handleSaveEvent({ ...event, status: event.status === 'completado' ? 'pendiente' : 'completado' })} />
            )}
          </div>
          <aside className="w-80 flex flex-col gap-6 h-full overflow-y-auto no-scrollbar shrink-0">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl shadow-slate-200/40">
              <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center justify-between uppercase tracking-widest">
                <div className="flex items-center gap-2"><Users className="w-4 h-4 text-blue-600" />Personal Online</div>
                <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-[10px]">{onlineUsers.length}</span>
              </h4>
              <div className="space-y-3">
                {onlineUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-100 rounded-2xl transition-all hover:translate-x-1">
                    <div className="relative"><div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-black">{u.full_name?.substring(0, 2).toUpperCase() || '??'}</div><div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" /></div>
                    <div className="flex-1 min-w-0"><p className="text-[11px] font-black text-slate-900 truncate">{u.full_name} {u.id === profile?.id ? '(Tú)' : ''}</p><p className="text-[9px] text-blue-600 font-bold uppercase">{u.role}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {isModalOpen && <EventModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveEvent} onDelete={handleDeleteEvent} units={units} initialDate={selectedDate} initialEvent={selectedEvent} />}
        {isUnitModalOpen && <UnitSettingsModal isOpen={isUnitModalOpen} onClose={() => setIsUnitModalOpen(false)} units={units} events={events} onUpdateUnits={setUnits} userProfile={profile} currentSession={session} onImportData={() => {}} initialTab={unitModalInitialTab} />}
      </main>
    </div>
  );
};

export default App;
