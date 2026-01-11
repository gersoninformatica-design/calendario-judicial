
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

  // CONSTANTE MAESTRA
  const ADMIN_EMAIL = 'gerson.informatica@gmail.com';
  
  // VERIFICACIÓN DE IDENTIDAD GERSON (LA LLAVE MAESTRA)
  const isGersonAdmin = useMemo(() => {
    const email = session?.user?.email?.toLowerCase().trim();
    return email === ADMIN_EMAIL;
  }, [session]);

  useEffect(() => {
    // 1. Limpiar hashes de recuperación si ya hay sesión
    if (window.location.hash.includes('access_token=')) {
      setIsRecoveryMode(true);
    }

    // 2. Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setIsRecoveryMode(false);
        fetchOrCreateProfile(session.user.id, session.user.email, session.user.user_metadata?.full_name);
      } else {
        setIsLoaded(true);
      }
    });

    // 3. Suscribirse a cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setIsRecoveryMode(false);
        if (session) fetchOrCreateProfile(session.user.id, session.user.email, session.user.user_metadata?.full_name);
      }
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setSession(null);
        setIsLoaded(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchOrCreateProfile = async (userId: string, email: string | undefined, fullName: string | undefined) => {
    try {
      let { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      
      if (!profileData && email) {
        const isUserGerson = email.toLowerCase().trim() === ADMIN_EMAIL;
        const { data: newProfile } = await supabase.from('profiles').insert({
          id: userId,
          full_name: fullName || 'Funcionario Judicial',
          email: email.toLowerCase().trim(),
          role: isUserGerson ? 'Administrador de Sistemas' : 'Funcionario Judicial',
          is_approved: isUserGerson
        }).select().maybeSingle();
        profileData = newProfile;
      }
      
      setProfile(profileData);
      setIsLoaded(true);
    } catch (err) { 
      console.error("Profile Fetch Error:", err);
      setIsLoaded(true);
    }
  };

  // EFECTO DE REALTIME (Solo si está aprobado o es Gerson)
  useEffect(() => {
    if (!session || !profile || (!profile.is_approved && !isGersonAdmin)) return;
    
    const channel = supabase.channel('tribunal-realtime');
    broadcastChannel.current = channel;
    channel.subscribe();
    
    return () => { channel.unsubscribe(); };
  }, [session, profile, isGersonAdmin]);

  // CARGAR DATOS (Solo si está aprobado o es Gerson)
  useEffect(() => {
    if (!session || (profile && !profile.is_approved && !isGersonAdmin)) return;
    
    const fetchData = async () => {
      try {
        const { data: unitsData } = await supabase.from('units').select('*').order('name');
        const { data: eventsData } = await supabase.from('events').select('*').order('startTime');
        setUnits(unitsData || []);
        setEvents((eventsData || []).map(e => ({ ...e, startTime: new Date(e.startTime), endTime: new Date(e.endTime) })));
      } catch (err) { setIsOnline(false); }
    };
    if (session) fetchData();
  }, [session, profile, isGersonAdmin]);

  const handleSignOut = async () => {
    // CIERRE TOTAL: Limpia Supabase + LocalStorage + Cookies y reinicia
    await supabase.auth.signOut();
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = window.location.origin;
  };

  if (!isLoaded) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900">
      <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
      <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Validando Acceso Judicial...</p>
    </div>
  );

  // MODO LOGIN O RECUPERACIÓN
  if (isRecoveryMode || !session) {
    return <AuthModal onRecoveryComplete={() => setIsRecoveryMode(false)} />;
  }

  // PANTALLA DE ESPERA (Solo para NO-ADMINS no aprobados)
  if (profile && !profile.is_approved && !isGersonAdmin) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border-4 border-slate-100 max-w-md w-full text-center animate-in zoom-in-95">
           <div className="w-24 h-24 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-amber-200">
             <ShieldAlert className="w-12 h-12 text-white" />
           </div>
           <h1 className="text-3xl font-black text-slate-800 mb-4">Acceso Pendiente</h1>
           <p className="text-slate-500 font-bold mb-8 text-sm px-4">
             Hola <span className="text-blue-600 font-black">{profile.full_name}</span>. Tu cuenta está en revisión. Un administrador debe autorizar tu ingreso.
           </p>
           <div className="bg-slate-50 p-6 rounded-3xl mb-8 flex flex-col gap-4">
             <button onClick={() => window.location.reload()} className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all">
               <RefreshCw className="w-4 h-4" /> Verificar Ahora
             </button>
             <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 py-4 border-2 border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">
               <LogOut className="w-4 h-4" /> Salir e Ingresar como Admin
             </button>
           </div>
           <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Soporte: Gerson Informatica</p>
        </div>
      </div>
    );
  }

  // INTERFAZ PRINCIPAL (GERSON O USUARIOS APROBADOS)
  const filteredEvents = activeUnitId ? events.filter(e => e.unitId === activeUnitId) : events;
  const eventsWithUnit = filteredEvents.map(e => ({ ...e, unit: units.find(u => u.id === e.unitId)?.name || 'General' }));

  return (
    <div className="flex bg-slate-50 min-h-screen text-slate-900 overflow-hidden font-inter">
      <Sidebar 
        units={units} activeUnitId={activeUnitId} activeView={activeView} user={{...profile, email: session?.user?.email} as UserProfile}
        onSelectView={setActiveView} onSelectUnit={setActiveUnitId} 
        onManageUnits={(tab) => { setUnitModalInitialTab(tab || 'units'); setIsUnitModalOpen(true); }}
      />

      <main className="flex-1 flex flex-col p-8 h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
              {isGersonAdmin ? 'CONSOLA MAESTRA: GERSON' : `SESIÓN: ${profile?.full_name}`}
            </span>
          </div>
          <div className="flex gap-3">
             <button onClick={() => exportToPDF(eventsWithUnit)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase rounded-xl hover:bg-slate-50 transition-colors shadow-sm"><FileText className="w-4 h-4 text-red-500" /> PDF</button>
             <button onClick={() => { setIsAnalyzing(true); analyzeSchedule(eventsWithUnit).then(res => { setAiAnalysis(res); setIsAnalyzing(false); }); }} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-2xl shadow-lg hover:shadow-indigo-200 transition-all">
                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Asistente IA
             </button>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          {activeView === 'calendar' ? (
            <CalendarGrid currentDate={currentDate} setCurrentDate={setCurrentDate} events={filteredEvents} units={units} onAddEvent={(d) => { setSelectedDate(d); setSelectedEvent(undefined); setIsModalOpen(true); }} onEditEvent={(e) => { setSelectedEvent(e); setIsModalOpen(true); }} onMoveEvent={()=>{}} />
          ) : (
            <ListView title={activeView} events={filteredEvents} units={units} onEditEvent={(e)=>{setSelectedEvent(e); setIsModalOpen(true);}} onToggleStatus={()=>{}} />
          )}
        </div>

        {isModalOpen && <EventModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={async (data) => { if(selectedEvent) await supabase.from('events').update({...data, startTime: data.startTime.toISOString(), endTime: data.endTime.toISOString()}).eq('id', selectedEvent.id); else await supabase.from('events').insert({...data, id: crypto.randomUUID(), user_id: session.user.id, startTime: data.startTime.toISOString(), endTime: data.endTime.toISOString()}); window.location.reload(); }} onDelete={async (id) => { await supabase.from('events').delete().eq('id', id); window.location.reload(); }} units={units} initialDate={selectedDate} initialEvent={selectedEvent} />}
        {isUnitModalOpen && <UnitSettingsModal isOpen={isUnitModalOpen} onClose={() => setIsUnitModalOpen(false)} units={units} events={events} userProfile={profile} currentSession={session} onUpdateUnits={()=>{}} onImportData={()=>{}} initialTab={unitModalInitialTab} />}
      </main>
    </div>
  );
};

export default App;
