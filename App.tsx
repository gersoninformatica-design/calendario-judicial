
import React, { useState, useMemo } from 'react';
import Sidebar from './components/Sidebar.tsx';
import CalendarGrid from './components/CalendarGrid.tsx';
import ListView from './components/ListView.tsx';
import EventModal from './components/EventModal.tsx';
import UnitSettingsModal from './components/UnitSettingsModal.tsx';
import { TribunalEvent, Unit } from './types.ts';
import { INITIAL_EVENTS, INITIAL_UNITS } from './constants.tsx';
import { FileText, BarChart3, Sparkles, Loader2 } from 'lucide-react';
import { analyzeSchedule } from './services/geminiService.ts';
import { exportToPDF, exportToExcel } from './utils/exportUtils.ts';
import { setYear, setMonth, setDate } from 'date-fns';

const App: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeView, setActiveView] = useState<'calendar' | 'tasks' | 'reminders' | 'reunions'>('calendar');
  const [events, setEvents] = useState<TribunalEvent[]>(INITIAL_EVENTS);
  const [units, setUnits] = useState<Unit[]>(INITIAL_UNITS);
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedEvent, setSelectedEvent] = useState<TribunalEvent | undefined>(undefined);
  
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
    if (activeUnitId && eventData.unitId !== activeUnitId) {
      setActiveUnitId(null);
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents(prev => prev.filter(e => e.id !== eventId));
    setIsModalOpen(false);
  };

  const handleUpdateUnits = (newUnits: Unit[]) => {
    if (activeUnitId && !newUnits.find(u => u.id === activeUnitId)) {
      setActiveUnitId(null);
    }
    setUnits(newUnits);
  };

  const handleOpenCreateModal = (date?: Date) => {
    setSelectedEvent(undefined);
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (event: TribunalEvent) => {
    setSelectedEvent(event);
    setSelectedDate(undefined);
    setIsModalOpen(true);
  };

  const handleMoveEvent = (eventId: string, targetDate: Date) => {
    setEvents(prev => prev.map(event => {
      if (event.id === eventId) {
        const newStartTime = setDate(setMonth(setYear(event.startTime, targetDate.getFullYear()), targetDate.getMonth()), targetDate.getDate());
        const duration = event.endTime.getTime() - event.startTime.getTime();
        const newEndTime = new Date(newStartTime.getTime() + duration);
        return { ...event, startTime: newStartTime, endTime: newEndTime };
      }
      return event;
    }));
  };

  const runAIAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzeSchedule(eventsWithUnit);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  const getListViewTitle = () => {
    switch (activeView) {
      case 'tasks': return 'Tareas Judiciales';
      case 'reminders': return 'Recordatorios y Alertas';
      case 'reunions': return 'Reuniones y Sesiones';
      default: return '';
    }
  };

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
        <div className="flex justify-end gap-3 mb-8">
          <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
            <button 
              onClick={() => exportToPDF(eventsWithUnit)}
              className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 text-slate-600 text-sm font-semibold rounded-xl transition-all"
            >
              <FileText className="w-4 h-4 text-red-500" />
              Exportar PDF
            </button>
            <div className="w-[1px] bg-slate-200 my-1 mx-1" />
            <button 
              onClick={() => exportToExcel(eventsWithUnit)}
              className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 text-slate-600 text-sm font-semibold rounded-xl transition-all"
            >
              <BarChart3 className="w-4 h-4 text-green-500" />
              Exportar Excel
            </button>
          </div>
          <button 
            onClick={runAIAnalysis}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-bold rounded-2xl shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          >
            {isAnalyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Asistente IA
          </button>
        </div>

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
                title={getListViewTitle()}
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
                <div className="text-sm text-indigo-800 leading-relaxed italic">
                  "{aiAnalysis}"
                </div>
              ) : (
                <div className="text-sm text-indigo-400">
                  Haz clic en el botón "Asistente IA" para analizar la agenda actual.
                </div>
              )}
            </div>
          </div>
        </div>

        {isModalOpen && (
          <EventModal 
            key={`event-modal-${selectedEvent?.id || selectedDate?.getTime() || 'new'}`}
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
            key="unit-settings-modal"
            isOpen={isUnitModalOpen}
            onClose={() => setIsUnitModalOpen(false)}
            units={units}
            onUpdateUnits={handleUpdateUnits}
          />
        )}
      </main>
    </div>
  );
};

export default App;
