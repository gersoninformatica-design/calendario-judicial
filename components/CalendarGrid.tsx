
import React, { useState } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths 
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { TribunalEvent, Unit } from '../types.ts';
import { getUnitColorClasses } from '../constants.tsx';

interface CalendarGridProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  events: TribunalEvent[];
  units: Unit[];
  onAddEvent: (date: Date) => void;
  onEditEvent: (event: TribunalEvent) => void;
  onMoveEvent: (eventId: string, targetDate: Date) => void;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({ 
  currentDate, 
  setCurrentDate, 
  events, 
  units, 
  onAddEvent, 
  onEditEvent, 
  onMoveEvent 
}) => {
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const handleDragStart = (e: React.DragEvent, eventId: string) => {
    e.dataTransfer.setData('eventId', eventId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    setDragOverDate(date.toDateString());
  };

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    setDragOverDate(null);
    const eventId = e.dataTransfer.getData('eventId');
    if (eventId) {
      onMoveEvent(eventId, date);
    }
  };

  const getEventUnitColor = (unitId: string) => {
    const unit = units.find(u => u.id === unitId);
    return getUnitColorClasses(unit?.color || 'slate');
  };

  const getStatusIcon = (status: TribunalEvent['status']) => {
    switch (status) {
      case 'completado': return <CheckCircle2 className="w-2.5 h-2.5" />;
      case 'cancelado': return <AlertCircle className="w-2.5 h-2.5" />;
      default: return <Clock className="w-2.5 h-2.5" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </h2>
          <p className="text-slate-500">Gestión judicial inteligente. Haz clic en un evento para ver detalles.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <button onClick={prevMonth} className="p-2.5 hover:bg-slate-50 border-r border-slate-200 transition-colors">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2.5 hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors">
              Hoy
            </button>
            <button onClick={nextMonth} className="p-2.5 hover:bg-slate-50 border-l border-slate-200 transition-colors">
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
          <button 
            onClick={() => onAddEvent(new Date())}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-200 flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" />
            Nuevo Evento
          </button>
        </div>
      </header>

      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden flex flex-col flex-1">
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
          {weekDays.map((day) => (
            <div key={day} className="py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 flex-1">
          {calendarDays.map((day, idx) => {
            const dayEvents = events.filter((e) => isSameDay(e.startTime, day));
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, new Date());
            const isDraggingOver = dragOverDate === day.toDateString();

            return (
              <div
                key={day.toString()}
                onDragOver={(e) => handleDragOver(e, day)}
                onDragLeave={() => setDragOverDate(null)}
                onDrop={(e) => handleDrop(e, day)}
                onClick={() => onAddEvent(day)}
                className={`min-h-[140px] p-3 border-r border-b border-slate-100 flex flex-col gap-1 transition-all cursor-pointer group relative ${
                  !isCurrentMonth ? 'bg-slate-50/10' : 'bg-white'
                } ${isDraggingOver ? 'bg-blue-50/80 ring-2 ring-inset ring-blue-200' : 'hover:bg-slate-50/80'}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-sm font-semibold w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                    isToday ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 
                    isCurrentMonth ? 'text-slate-800' : 'text-slate-300'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 p-1 bg-blue-50 rounded-md text-blue-600 transition-all">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>

                <div className="flex flex-col gap-1 overflow-y-auto max-h-[100px] no-scrollbar">
                  {dayEvents.slice(0, 4).map((event) => {
                    const colors = getEventUnitColor(event.unitId);
                    return (
                      <div
                        key={event.id}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          handleDragStart(e, event.id);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditEvent(event);
                        }}
                        className={`text-[10px] font-bold p-1.5 rounded-lg border leading-tight flex items-center gap-1 shadow-sm truncate cursor-pointer hover:brightness-95 transition-all transform active:scale-95 ${colors.bg} ${colors.text} ${colors.border} ${
                          event.status === 'completado' ? 'opacity-60 line-through' : ''
                        }`}
                        title={`${event.title} - ${format(event.startTime, 'HH:mm')}`}
                      >
                        {getStatusIcon(event.status)}
                        <span className="truncate">{event.title}</span>
                      </div>
                    );
                  })}
                  {dayEvents.length > 4 && (
                    <span className="text-[10px] text-slate-400 font-bold px-1 text-center bg-slate-100 rounded-md py-0.5">
                      + {dayEvents.length - 4} más
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CalendarGrid;
