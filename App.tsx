
import React, { useState, useMemo, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar.tsx';
import CalendarGrid from './components/CalendarGrid.tsx';
import ListView from './components/ListView.tsx';
import EventModal from './components/EventModal.tsx';
import UnitSettingsModal from './components/UnitSettingsModal.tsx';
import AuthModal from './components/AuthModal.tsx';
import { TribunalEvent, Unit, UserProfile } from './types.ts';
import { supabase } from './lib/supabase.ts';
// Fix: Import missing 'format' function from date-fns
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
  Bell,
  Clock
} from 'lucide-react';
import { analyzeSchedule } from './services/geminiService.ts';
import { exportToPDF, exportToExcel } from './utils/exportUtils.ts';

interface ActivityItem {
  id: string;
  userName: string;
  action: 'creó' | 'actualizó' | 'eliminó';
  target: string;
  timestamp: Date;
}

const App: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedEvent, setSelectedEvent] = useState<TribunalEvent | undefined>(undefined);
  
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 1. MANEJO DE SESIÓN Y PERFIL
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setEvents([]);
        setOnlineUsers([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, retries = 3) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error && retries > 0) {
        setTimeout(() => fetchProfile(userId, retries - 1), 1000);
      } else if (data) {
        setProfile(data);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  // 2. MANEJO DE PRESENCIA (Personal en Línea)
  useEffect(() => {
    if (!session || !profile) return;

    const channel = supabase.channel('despacho-presencia', {
      config: { presence: { key: session.user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const users = Object.values(newState).flat().map((p: any) => p);
        const uniqueUsers = Array.from(new Map(users.map(u => [u.id, u])).values());
        setOnlineUsers(uniqueUsers);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: profile.id,
            full_name: profile.full_name,
            role: profile.role || 'Funcionario Judicial'
          });
        }
      });

    return () => { channel.unsubscribe(); };
  }, [session, profile]);

  // 3. CARGA DE DATOS Y FEED DE ACTIVIDAD
  useEffect(() => {
    if (!session) {
      setIsLoaded(true);
      return;
    }

    const fetchData = async () => {
      try {
        const { data: unitsData } = await supabase.from('units').select('*').order('name');
        const { data: eventsData } = await supabase.from('events').select('*').order('startTime');

        setUnits(unitsData || []);
        setEvents((eventsData || []).map(e => ({
          ...e,
          startTime: new Date(e.startTime),
          endTime: new Date(e.endTime)
        })));
        setIsLoaded(true);
      } catch (err) {
        setIsOnline(false);
        setIsLoaded(true);
      }
    };

    fetchData();

    const channel = supabase.channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, async (payload) => {
        let actionLabel: 'creó' | 'actualizó' | 'eliminó' = 'actualizó';
        let targetTitle = '';
        
        if (payload.eventType === 'INSERT') {
          actionLabel = 'creó';
          targetTitle = payload.new.title;
          const newE = { ...payload.new, startTime: new Date(payload.new.startTime), endTime: new Date(payload.new.endTime) } as TribunalEvent;
          setEvents(prev => [...prev.filter(e => e.id !== newE.id), newE]);
        } else if (payload.eventType === 'UPDATE') {
          actionLabel = 'actualizó';
          targetTitle = payload.new.title;
          const updE = { ...payload.new, startTime: new Date(payload.new.startTime), endTime: new Date(payload.new.endTime) } as TribunalEvent;
          setEvents(prev => prev.map(e => e.id === updE.id ? updE : e));
        } else if (payload.eventType === 'DELETE') {
          actionLabel = 'eliminó';
          targetTitle = payload.old.title || 'Evento';
          setEvents(prev => prev.filter(e => e.id !== payload.old.id));
        }

        // Agregar al feed de actividades localmente
        const newActivity: ActivityItem = {
          id: crypto.randomUUID(),
          userName: 'Alguien', // En un sistema real, haríamos un join con perfiles
          action: actionLabel,
          target: targetTitle,
          timestamp: new Date()
        };
        setActivities(prev => [newActivity, ...prev].slice(0, 10));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'units' }, (payload) => {
        if (payload.eventType === 'INSERT') setUnits(prev => [...prev, payload.new as Unit]);
        if (payload.eventType === 'UPDATE') setUnits(prev => prev.map(u => u.id === payload.new.id ? payload.new as Unit : u));
        if (payload.eventType === 'DELETE') setUnits(prev => prev.filter(u => u.id !== payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session]);

  const filteredEvents = useMemo(() => {
    let base = events;
    if (activeUnitId) base = base.filter(e => e.unitId === activeUnitId);
    if (activeView === 'tasks') return base.filter(e => e.type === 'tarea');
    if (activeView === 'reminders') return base.filter(e => e.type === 'recordatorio');
    if (activeView === 'reunions') return base.filter(e => e.type === 'reunion');
    return base;
  }, [events, activeUnitId, activeView]);

  const eventsWithUnit = useMemo(() => {
    return filteredEvents.map(e => ({
      ...e,
      unit: units.find(u => u.id === e.unitId)?.name || 'Desconocida'
    }));
  }, [filteredEvents, units]);

  const handleSaveEvent = async (eventData: Omit<TribunalEvent, 'id'>) => {
    if (!session) return;
    const payload = { ...eventData, startTime: eventData.startTime.toISOString(), endTime: eventData.endTime.toISOString(), user_id: session.user.id };
    try {
      if (selectedEvent) await supabase.from('events').update(payload).eq('id', selectedEvent.id);
      else await supabase.from('events').insert({ ...payload, id: crypto.randomUUID() });
    } catch (err) { console.error(err); }
  };

  const handleDeleteEvent = async (id: string) => {
    await supabase.from('events').delete().eq('id', id);
    setIsModalOpen(false);
  };

  const handleMoveEvent = async (eventId: string, targetDate: Date) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    const duration = event.endTime.getTime() - event.startTime.getTime();
    const newStart = new Date(targetDate);
    newStart.setHours(event.startTime.getHours(), event.startTime.getMinutes());
    const newEnd = new Date(newStart.getTime() + duration);
    await supabase.from('events').update({ startTime: newStart.toISOString(), endTime: newEnd.toISOString() }).eq('id', eventId);
  };

  if (!isLoaded) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900">
      <div className="relative">
        <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
        <ShieldCheck className="w-6 h-6 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <p className="text-slate-400 font-bold mt-6 tracking-widest uppercase text-[10px]">Verificando Credenciales Judiciales...</p>
    </div>
  );

  if (!session) return <AuthModal />;

  return (
    <div className="flex bg-slate-50 min-h-screen text-slate-900 overflow-hidden font-inter">
      <Sidebar 
        units={units}
        activeUnitId={activeUnitId} 
        activeView={activeView}
        user={profile}
        onSelectView={setActiveView}
        onSelectUnit={setActiveUnitId} 
        onManageUnits={() => setIsUnitModalOpen(true)}
      />

      <main className="flex-1 flex flex-col p-8 h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
             <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
               isOnline ? 'bg-green-50 border-green-200 text-green-600 shadow-sm' : 'bg-red-50 border-red-200 text-red-600'
             }`}>
               <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
               {isOnline ? 'Tribunal Cloud: Activo' : 'Sin Conexión'}
             </div>
          </div>
          
          <div className="flex gap-3">
            <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
              <button onClick={() => exportToPDF(eventsWithUnit)} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 text-slate-600 text-sm font-semibold rounded-xl transition-colors">
                <FileText className="w-4 h-4 text-red-500" />
                PDF
              </button>
              <button onClick={() => exportToExcel(eventsWithUnit)} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 text-slate-600 text-sm font-semibold rounded-xl transition-colors">
                <BarChart3 className="w-4 h-4 text-green-500" />
                Excel
              </button>
            </div>
            <button 
              onClick={() => { setIsAnalyzing(true); analyzeSchedule(eventsWithUnit).then(res => { setAiAnalysis(res); setIsAnalyzing(false); }); }}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-2xl shadow-lg hover:shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50"
            >
              {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Asistente IA
            </button>
          </div>
        </div>

        <div className="flex gap-8 flex-1 min-h-0">
          <div className="flex-1 min-w-0">
            {activeView === 'calendar' ? (
              <CalendarGrid 
                currentDate={currentDate} 
                setCurrentDate={setCurrentDate} 
                events={filteredEvents}
                units={units}
                onAddEvent={(date) => { setSelectedDate(date); setSelectedEvent(undefined); setIsModalOpen(true); }}
                onEditEvent={(event) => { setSelectedEvent(event); setSelectedDate(undefined); setIsModalOpen(true); }}
                onMoveEvent={handleMoveEvent}
              />
            ) : (
              <ListView 
                title={activeView === 'tasks' ? 'Tareas Judiciales' : activeView === 'reminders' ? 'Recordatorios' : 'Reuniones'}
                events={filteredEvents}
                units={units}
                onEditEvent={(event) => { setSelectedEvent(event); setIsModalOpen(true); }}
                onToggleStatus={(event) => handleSaveEvent({ ...event, status: event.status === 'completado' ? 'pendiente' : 'completado' })}
              />
            )}
          </div>

          <aside className="w-80 flex flex-col gap-6 h-full overflow-y-auto no-scrollbar shrink-0">
            {/* Personal en Línea */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl shadow-slate-200/40">
              <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center justify-between uppercase tracking-widest">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Personal Online
                </div>
                <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-[10px]">{onlineUsers.length}</span>
              </h4>
              <div className="space-y-3">
                {onlineUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-100 rounded-2xl transition-all hover:translate-x-1">
                    <div className="relative">
                      <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-black">
                        {u.full_name?.substring(0, 2).toUpperCase() || '??'}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-slate-900 truncate">{u.full_name} {u.id === profile?.id ? '(Tú)' : ''}</p>
                      <p className="text-[9px] text-blue-600 font-bold uppercase">{u.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Muro de Novedades (Feed) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl shadow-slate-200/40 flex-1 flex flex-col min-h-[300px]">
              <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-widest">
                <Activity className="w-4 h-4 text-amber-500" />
                Muro Judicial
              </h4>
              <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar">
                {activities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-300">
                    <History className="w-10 h-10 mb-2 opacity-20" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Sin cambios hoy</p>
                  </div>
                ) : (
                  activities.map((act) => (
                    <div key={act.id} className="relative pl-6 pb-4 group">
                      <div className="absolute left-0 top-1 w-2 h-2 rounded-full bg-slate-200 group-last:bg-transparent before:content-[''] before:absolute before:left-[3px] before:top-2 before:w-[2px] before:h-full before:bg-slate-100 last:before:hidden" />
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 group-hover:border-amber-200 group-hover:bg-amber-50 transition-all">
                        <p className="text-[10px] text-slate-500 leading-tight">
                          <span className="font-black text-slate-800">{act.userName}</span> {act.action}
                        </p>
                        <p className="text-[11px] font-bold text-slate-700 truncate mt-0.5">"{act.target}"</p>
                        <p className="text-[8px] text-slate-400 font-black uppercase mt-1 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {format(act.timestamp, 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Gemini Judicial */}
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-6 shadow-xl shadow-indigo-200 text-white">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md"><Sparkles className="w-5 h-5" /></div>
                <h4 className="font-bold text-lg tracking-tight">Gemini Judicial</h4>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 min-h-[100px] border border-white/10">
                {aiAnalysis ? (
                  <p className="text-xs leading-relaxed italic font-medium">"{aiAnalysis}"</p>
                ) : (
                  <div className="flex flex-col gap-2 opacity-50">
                    <div className="h-2 w-full bg-white/20 rounded-full animate-pulse" />
                    <div className="h-2 w-3/4 bg-white/20 rounded-full animate-pulse" />
                    <p className="text-[10px] mt-2 font-bold uppercase tracking-widest text-center">Esperando Análisis</p>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>

        {isModalOpen && (
          <EventModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveEvent}
            onDelete={handleDeleteEvent}
            units={units}
            initialDate={selectedDate}
            initialEvent={selectedEvent}
          />
        )}

        {isUnitModalOpen && (
          <UnitSettingsModal 
            isOpen={isUnitModalOpen}
            onClose={() => setIsUnitModalOpen(false)}
            units={units}
            events={events}
            onUpdateUnits={setUnits}
            onImportData={() => {}} 
          />
        )}
      </main>
    </div>
  );
};

export default App;
