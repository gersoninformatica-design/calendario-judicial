
import React, { useState, useEffect } from 'react';
import { X, Clock, Type, AlignLeft, User, Trash2, CheckCircle2, AlertCircle, Calendar as CalendarIcon } from 'lucide-react';
import { Unit, TribunalEvent } from '../types.ts';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Omit<TribunalEvent, 'id'>) => void;
  onDelete?: (eventId: string) => void;
  units: Unit[];
  initialDate?: Date;
  initialEvent?: TribunalEvent;
}

const EventModal: React.FC<EventModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  onDelete,
  units, 
  initialDate,
  initialEvent
}) => {
  // Función para obtener el formato YYYY-MM-DDTHH:mm en hora local
  const getLocalDatetimeString = (date: Date) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    return localISOTime;
  };

  const [title, setTitle] = useState(initialEvent?.title || '');
  const [description, setDescription] = useState(initialEvent?.description || '');
  const [unitId, setUnitId] = useState(initialEvent?.unitId || units[0]?.id || '');
  const [type, setType] = useState<TribunalEvent['type']>(initialEvent?.type || 'audiencia');
  const [status, setStatus] = useState<TribunalEvent['status']>(initialEvent?.status || 'pendiente');
  
  const defaultDate = initialDate || new Date();
  const [startTime, setStartTime] = useState(
    initialEvent ? getLocalDatetimeString(initialEvent.startTime) : getLocalDatetimeString(defaultDate)
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const startDateObj = new Date(startTime);
    
    onSave({
      title,
      description,
      unitId,
      type,
      status,
      startTime: startDateObj,
      endTime: new Date(startDateObj.getTime() + 60 * 60 * 1000), // +1 hora por defecto
    });
    
    onClose();
  };

  const isEditing = !!initialEvent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header con estilo judicial */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${isEditing ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">
                {isEditing ? 'Detalle de Actividad' : 'Agendar Actividad Judicial'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">Expediente y Control de Tiempos</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1">
          {/* Título */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
              <Type className="w-3.5 h-3.5" />
              Título del Evento / Causa
            </label>
            <input
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Audiencia Preparatoria - Expediente 2024-X"
              className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 focus:bg-white bg-slate-50 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700 shadow-inner"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Unidad */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                <User className="w-3.5 h-3.5" />
                Unidad Responsable
              </label>
              <select
                required
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 bg-slate-50 outline-none appearance-none font-medium text-slate-700 cursor-pointer shadow-inner"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Fecha y Hora */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                <Clock className="w-3.5 h-3.5" />
                Fecha y Hora Programada
              </label>
              <input
                type="datetime-local"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 bg-slate-50 outline-none font-medium text-slate-700 shadow-inner"
              />
            </div>
          </div>

          {/* Estado de la actividad */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Estado de la Actividad</label>
            <div className="flex gap-3">
              {[
                { id: 'pendiente', label: 'Pendiente', color: 'slate', icon: <Clock className="w-4 h-4" /> },
                { id: 'completado', label: 'Completado', color: 'green', icon: <CheckCircle2 className="w-4 h-4" /> },
                { id: 'cancelado', label: 'Cancelado', color: 'red', icon: <AlertCircle className="w-4 h-4" /> }
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStatus(s.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold uppercase transition-all border-2 ${
                    status === s.id 
                    ? `bg-${s.color}-600 text-white border-${s.color}-600 shadow-lg shadow-${s.color}-100` 
                    : `bg-white text-slate-500 border-slate-100 hover:border-slate-200`
                  }`}
                >
                  {s.icon}
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tipo de Actividad */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Tipo de Actividad Judicial</label>
            <div className="grid grid-cols-4 gap-2">
              {['audiencia', 'tarea', 'recordatorio', 'reunion'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t as any)}
                  className={`py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border-2 ${
                    type === t 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200' 
                    : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
              <AlignLeft className="w-3.5 h-3.5" />
              Observaciones del Despacho
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles adicionales o notas del caso..."
              rows={4}
              className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 bg-slate-50 outline-none resize-none font-medium text-slate-600 transition-all shadow-inner"
            />
          </div>

          {/* Acciones del pie */}
          <div className="pt-6 flex items-center justify-between gap-4">
            {isEditing && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if(confirm('¿Estás seguro de eliminar esta actividad definitivamente?')) {
                    onDelete(initialEvent.id);
                  }
                }}
                className="p-4 rounded-2xl text-red-500 hover:bg-red-50 hover:text-red-600 transition-all group"
                title="Eliminar actividad"
              >
                <Trash2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>
            )}
            
            <div className="flex-1 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-[2] py-4 rounded-2xl font-bold bg-blue-600 text-white shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isEditing ? 'Guardar Cambios' : 'Agendar Actividad'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventModal;
