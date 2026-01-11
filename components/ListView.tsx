
import React from 'react';
import { format, isToday, isPast, isTomorrow, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle2, Circle, Clock, MoreVertical, Edit3, Trash2, Calendar as CalendarIcon, AlertTriangle } from 'lucide-react';
import { TribunalEvent, Unit } from '../types.ts';
import { getUnitColorClasses } from '../constants.tsx';

interface ListViewProps {
  title: string;
  events: TribunalEvent[];
  units: Unit[];
  onEditEvent: (event: TribunalEvent) => void;
  onToggleStatus: (event: TribunalEvent) => void;
}

const ListView: React.FC<ListViewProps> = ({ title, events, units, onEditEvent, onToggleStatus }) => {
  const sortedEvents = [...events].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const getDayLabel = (date: Date) => {
    if (isToday(date)) return 'Hoy';
    if (isTomorrow(date)) return 'Mañana';
    if (isPast(date) && !isToday(date)) return 'Atrasado';
    return format(date, "EEEE, d 'de' MMMM", { locale: es });
  };

  // Agrupar eventos por día
  const groupedEvents: Record<string, TribunalEvent[]> = {};
  sortedEvents.forEach(event => {
    const dayKey = format(startOfDay(event.startTime), 'yyyy-MM-dd');
    if (!groupedEvents[dayKey]) groupedEvents[dayKey] = [];
    groupedEvents[dayKey].push(event);
  });

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-500">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900">{title}</h2>
        <p className="text-slate-500">Gestiona tus pendientes judiciales de forma organizada.</p>
      </header>

      {events.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-100">
          <div className="bg-slate-50 p-6 rounded-full mb-4">
            <CheckCircle2 className="w-12 h-12 text-slate-200" />
          </div>
          <p className="text-lg font-medium">No hay elementos pendientes en esta sección</p>
          <p className="text-sm">Todo está al día por ahora.</p>
        </div>
      ) : (
        <div className="space-y-10 pb-10">
          {Object.entries(groupedEvents).map(([dayKey, dayEvents]) => {
            const firstEventDate = dayEvents[0].startTime;
            const isDayPast = isPast(startOfDay(firstEventDate)) && !isToday(firstEventDate);
            const label = getDayLabel(firstEventDate);

            return (
              <section key={dayKey} className="space-y-4">
                <div className="flex items-center gap-3 px-1">
                  <h3 className={`text-sm font-black uppercase tracking-widest ${isDayPast ? 'text-red-500' : 'text-slate-400'}`}>
                    {label}
                  </h3>
                  <div className="flex-1 h-[1px] bg-slate-100" />
                  {isDayPast && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                      <AlertTriangle className="w-3 h-3" />
                      REVISIÓN NECESARIA
                    </div>
                  )}
                </div>

                <div className="grid gap-3">
                  {dayEvents.map(event => {
                    const unit = units.find(u => u.id === event.unitId);
                    const colors = getUnitColorClasses(unit?.color || 'slate');
                    const isCompleted = event.status === 'completado';

                    return (
                      <div 
                        key={event.id}
                        onClick={() => onEditEvent(event)}
                        className={`group bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4 transition-all hover:shadow-xl hover:shadow-slate-200/50 hover:border-blue-200 cursor-pointer ${
                          isCompleted ? 'opacity-60 grayscale-[0.5]' : ''
                        }`}
                      >
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleStatus(event);
                          }}
                          className={`shrink-0 transition-all ${isCompleted ? 'text-green-500 scale-110' : 'text-slate-300 hover:text-blue-500'}`}
                        >
                          {isCompleted ? <CheckCircle2 className="w-7 h-7" /> : <Circle className="w-7 h-7" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${colors.bg} ${colors.text}`}>
                              {unit?.name || 'General'}
                            </span>
                            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(event.startTime, 'HH:mm')}
                            </span>
                          </div>
                          <h4 className={`font-bold text-slate-800 truncate ${isCompleted ? 'line-through' : ''}`}>
                            {event.title}
                          </h4>
                          {event.description && (
                            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                              {event.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            className="p-2.5 bg-slate-50 text-slate-500 hover:text-blue-600 rounded-xl transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditEvent(event);
                            }}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ListView;
