
import React, { useState, useMemo, useEffect } from 'react';
import Sidebar from './components/Sidebar.tsx';
import CalendarGrid from './components/CalendarGrid.tsx';
import ListView from './components/ListView.tsx';
import EventModal from './components/EventModal.tsx';
import UnitSettingsModal from './components/UnitSettingsModal.tsx';
import { TribunalEvent, Unit } from './types.ts';
import { INITIAL_EVENTS, INITIAL_UNITS } from './constants.tsx';
import { FileText, BarChart3, Sparkles, Loader2, HardDrive, Share2, AlertCircle, Check } from 'lucide-react';
import { analyzeSchedule } from './services/geminiService.ts';
import { exportToPDF, exportToExcel } from './utils/exportUtils.ts';
import { setYear, setMonth, setDate } from 'date-fns';

const STORAGE_KEY_EVENTS = 'tribunalsync_events_v1';
const STORAGE_KEY_UNITS = 'tribunalsync_units_v1';

const App: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeView, setActiveView] = useState<'calendar' | 'tasks' | 'reminders' | 'reunions'>('calendar');
  const [events, setEvents] = useState<TribunalEvent[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [incomingSyncData, setIncomingSyncData] = useState<{events: TribunalEvent[], units: Unit[]} | null>(null);
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedEvent, setSelectedEvent] = useState<TribunalEvent | undefined>(undefined);
  
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'saved' | 'saving'>('saved');

  // CARGA INICIAL Y DETECCIÓN DE SHARE LINK
  useEffect(() => {
    const savedEvents = localStorage.getItem(STORAGE_KEY_EVENTS);
    const savedUnits = localStorage.getItem(STORAGE_KEY_UNITS);

    // Revisar si hay datos compartidos en la URL
    const hash = window.location.hash;
    if (hash.startsWith('#share=')) {
      try {
        const encodedData = hash.replace('#share=', '');
        const decodedData = JSON.parse(decodeURIComponent(escape(atob(encodedData))));
        
        const hydratedEvents = decodedData.events.map((e: any) => ({
          ...e,
          startTime: new Date(e.startTime),
          endTime: new Date(e.endTime)
        }));
        
        setIncomingSyncData({ events: hydratedEvents, units: decodedData.units });
        // Limpiar hash de la URL para evitar recargas infinitas
        window.history.replaceState(null, "", window.location.pathname);
      } catch (e) {
        console.error("Error al decodificar datos compartidos:", e);
      }
    }

    if (savedEvents) {
      try {
        const parsedEvents = JSON.parse(savedEvents);
        const hydratedEvents = parsedEvents.map((e: any) => ({
          ...e,
          startTime: new Date(e.startTime),
          endTime: new Date(e.endTime)
        }));
        setEvents(hydratedEvents);
      } catch (e) {
        setEvents(INITIAL_EVENTS);
      }
    } else {
      setEvents(INITIAL_EVENTS);
    }

    if (savedUnits) {
      try {
        setUnits(JSON.parse(savedUnits));
      } catch (e) {
        setUnits(INITIAL_UNITS);
      }
    } else {
      setUnits(INITIAL_UNITS);
    }
    
    setIsLoaded(true);
  }, []);

  // AUTO-GUARDADO
  useEffect(() => {
    if (!isLoaded) return;
    setSyncStatus('saving');
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
      localStorage.setItem(STORAGE_KEY_UNITS, JSON.stringify(units));
      setSyncStatus('saved');
    }, 500);
    return () => clearTimeout(timer);
  }, [events, units, isLoaded]);

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

  // Fix: Added handleOpenCreateModal to fix error on line 278.
  const handleOpenCreateModal = (date: Date) => {
    setSelectedDate(date);
    setSelectedEvent(undefined);
    setIsModalOpen(true);
  };

  // Fix: Added handleOpenEditModal to fix errors on lines 279 and 287.
  const handleOpenEditModal = (event: TribunalEvent) => {
    setSelectedEvent(event);
    setSelectedDate(undefined);
    setIsModalOpen(true);
  };

  // Fix: Added handleMoveEvent to fix error on line 280.
  const handleMoveEvent = (eventId: string, targetDate: Date) => {
    setEvents(prev => prev.map(e => {
      if (e.id === eventId) {
        const duration = e.endTime.getTime() - e.startTime.getTime();
        const newStart = new Date(targetDate);
        newStart.setHours(e.startTime.getHours(), e.startTime.getMinutes());
        const newEnd = new Date(newStart.getTime() + duration);
        return { ...e, startTime: newStart, endTime: newEnd };
      }
      return e;
    }));
  };

  const handleSaveEvent = (eventData: Omit<TribunalEvent, 'id'>) => {
    if (selectedEvent) {
      setEvents(prev => prev.map(e => e.id === selectedEvent.id ? { ...eventData, id: e.id } : e));
    } else {
      const newEvent: TribunalEvent = {
        ...eventData,
        id: Math.random().toString(36).substr(2, 9),
      };
      setEvents(prev => [...prev, newEvent]);
    }
    if (activeUnitId && eventData.unitId !== activeUnitId) setActiveUnitId(null);
  };

  const handleShareSync = () => {
    try {
      const dataToShare = { units, events };
      const jsonStr = JSON.stringify(dataToShare);
      const encoded = btoa(unescape(encodeURIComponent(jsonStr)));
      const shareUrl = `${window.location.origin}${window.location.pathname}#share=${encoded}`;
      
      navigator.clipboard.writeText(shareUrl);
      alert('¡Enlace de sincronización copiado! Envía este enlace a otra persona para que vea tu agenda actualizada.');
    } catch (e) {
      alert('La agenda es demasiado grande para compartir por enlace. Usa "Exportar Datos" en configuración.');
    }
  };

  const handleAcceptSync = () => {
    if (incomingSyncData) {
      setEvents(incomingSyncData.events);
      setUnits(incomingSyncData.units);
      setIncomingSyncData(null);
      alert('Sincronización de equipo completada.');
    }
  };

  const handleImportData = (importedEvents: TribunalEvent[], importedUnits: Unit[]) => {
    setEvents(importedEvents);
    setUnits(importedUnits);
    alert('Importación manual completada.');
  };

  const runAIAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzeSchedule(eventsWithUnit);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  if (!isLoaded) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
      <p className="text-slate-500 font-medium">Cargando Agenda Judicial...</p>
    </div>
  );

  return (
    <div className="flex bg-slate-50 min-h-screen text-slate-900 overflow-hidden font-inter">
      <Sidebar 
        units={units}
        activeUnitId={activeUnitId} 
        activeView={activeView}
        onSelectView={setActiveView}
        onSelectUnit={setActiveUnitId} 
        onManageUnits={() => setIsUnitModalOpen(true)}
      />

      <main className="flex-1 flex flex-col p-8 h-screen overflow-y-auto">
        {/* Header con Sincronización */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
             <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
               syncStatus === 'saved' ? 'bg-white border-slate-200 text-slate-500' : 'bg-amber-50 border-amber-200 text-amber-600 animate-pulse'
             }`}>
               {syncStatus === 'saved' ? <HardDrive className="w-3.5 h-3.5" /> : <Loader2 className="w-3.5 h-3.5 animate-spin" />}
               {syncStatus === 'saved' ? 'Guardado en PC' : 'Actualizando...'}
             </div>
             
             <button 
              onClick={handleShareSync}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100 text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all"
             >
               <Share2 className="w-3.5 h-3.5" />
               Sincronizar con Equipo
             </button>
          </div>
          
          <div className="flex gap-3">
            <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
              <button onClick={() => exportToPDF(eventsWithUnit)} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 text-slate-600 text-sm font-semibold rounded-xl">
                <FileText className="w-4 h-4 text-red-500" />
                PDF
              </button>
              <button onClick={() => exportToExcel(eventsWithUnit)} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 text-slate-600 text-sm font-semibold rounded-xl">
                <BarChart3 className="w-4 h-4 text-green-500" />
                Excel
              </button>
            </div>
            <button 
              onClick={runAIAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-2xl shadow-lg hover:bg-black transition-all"
            >
              {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Asistente IA
            </button>
          </div>
        </div>

        {/* Modal de Sincronización Entrante */}
        {incomingSyncData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
            <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
              <div className="bg-blue-100 w-16 h-16 rounded-3xl flex items-center justify-center text-blue-600 mb-6">
                <Share2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">Agenda Compartida</h2>
              <p className="text-slate-500 mb-6 leading-relaxed">
                Has recibido una actualización de agenda. Si aceptas, se reemplazará tu vista actual con los datos del equipo.
              </p>
              <div className="bg-slate-50 rounded-2xl p-4 mb-8 flex justify-around">
                <div className="text-center">
                  <p className="text-2xl font-black text-slate-800">{incomingSyncData.events.length}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Eventos</p>
                </div>
                <div className="w-[1px] bg-slate-200" />
                <div className="text-center">
                  <p className="text-2xl font-black text-slate-800">{incomingSyncData.units.length}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Unidades</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIncomingSyncData(null)}
                  className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600"
                >
                  Ignorar
                </button>
                <button 
                  onClick={handleAcceptSync}
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Sincronizar Ahora
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-8 flex-1 min-h-0">
          <div className="flex-1 min-w-0">
            {activeView === 'calendar' ? (
              <CalendarGrid 
                currentDate={currentDate} 
                setCurrentDate={setCurrentDate} 
                events={filteredEvents}
                units={units}
                onAddEvent={handleOpenCreateModal}
                onEditEvent={handleOpenEditModal}
                onMoveEvent={handleMoveEvent}
              />
            ) : (
              <ListView 
                title={activeView === 'tasks' ? 'Tareas Judiciales' : activeView === 'reminders' ? 'Recordatorios' : 'Reuniones'}
                events={filteredEvents}
                units={units}
                onEditEvent={handleOpenEditModal}
                onToggleStatus={(event) => handleSaveEvent({
                  ...event,
                  status: event.status === 'completado' ? 'pendiente' : 'completado'
                })}
              />
            )}
          </div>

          <div className="w-80 flex flex-col gap-6 h-full overflow-y-auto no-scrollbar shrink-0">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl shadow-slate-200/50">
              <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Carga por Unidad
              </h4>
              <div className="space-y-4">
                {units.map((unit) => {
                  const count = events.filter(e => e.unitId === unit.id).length;
                  const percentage = events.length > 0 ? (count / events.length) * 100 : 0;
                  return (
                    <div key={unit.id}>
                      <div className="flex justify-between text-xs font-bold mb-1.5">
                        <span className="text-slate-600 truncate max-w-[120px]">{unit.name}</span>
                        <span className="text-slate-400">{count} act.</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="h-full transition-all duration-500"
                          style={{ width: `${percentage}%`, backgroundColor: `var(--tw-color-${unit.color}-500, #3b82f6)` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6 shadow-xl shadow-indigo-100/50">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-indigo-900">Análisis con IA</h4>
              </div>
              {aiAnalysis ? (
                <div className="text-sm text-indigo-800 leading-relaxed italic">"{aiAnalysis}"</div>
              ) : (
                <div className="text-sm text-indigo-400">Presiona "Asistente IA" para analizar la carga laboral.</div>
              )}
            </div>
          </div>
        </div>

        {isModalOpen && (
          <EventModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveEvent}
            onDelete={(id) => { setEvents(prev => prev.filter(e => e.id !== id)); setIsModalOpen(false); }}
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
            onImportData={handleImportData}
          />
        )}
      </main>
    </div>
  );
};

export default App;
