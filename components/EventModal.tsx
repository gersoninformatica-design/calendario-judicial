
import React, { useState, useEffect } from 'react';
import { X, Clock, Type, AlignLeft, User, Trash2, CheckCircle2, AlertCircle, Calendar as CalendarIcon, UserCheck } from 'lucide-react';
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
  const getLocalDatetimeString = (date: Date) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
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
      endTime: new Date(startDateObj.getTime() + 60 * 60 * 1000),
    });
    onClose();
  };

  const isEditing = !!initialEvent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
      <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh] border border-white/20">
        <div className="flex items-center justify-between p-7 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl shadow-sm ${isEditing ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'}`}>
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">
                {isEditing ? 'Gestión de Actividad' : 'Nueva Actividad Judicial'}
              </h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Control de Tiempos y Expedientes</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1 no-scrollbar">
          {isEditing && (
             <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center gap-3">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <p className="text-[10px] font-bold text-blue-800 uppercase tracking-tight">
                  Actividad vinculada al sistema de despacho colaborativo
                </p>
             </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
              <Type className="w-3.5 h-3.5 text-blue-500" />
              Objeto / Título de la Causa
            </label>
            <input
              required autoFocus value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Audiencia Preparatoria - Causa 2024-X"
              className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 focus:bg-white bg-slate-50 outline-none transition-all font-bold text-slate-700 shadow-inner"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                <User className="w-3.5 h-3.5 text-blue-500" />
                Unidad
              </label>
              <select
                required value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 bg-slate-50 outline-none appearance-none font-bold text-slate-700 cursor-pointer shadow-inner"
              >
                {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                Cronograma
              </label>
              <input
                type="datetime-local" required value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 bg-slate-50 outline-none font-bold text-slate-700 shadow-inner"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Estado Operativo</label>
            <div className="flex gap-3">
              {[
                { id: 'pendiente', label: 'Pendiente', color: 'slate', icon: <Clock className="w-4 h-4" /> },
                { id: 'completado', label: 'Resuelto', color: 'green', icon: <CheckCircle2 className="w-4 h-4" /> },
                { id: 'cancelado', label: 'Anulado', color: 'red', icon: <AlertCircle className="w-4 h-4" /> }
              ].map((s) => (
                <button
                  key={s.id} type="button" onClick={() => setStatus(s.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                    status === s.id 
                    ? `bg-slate-900 text-white border-slate-900 shadow-xl` 
                    : `bg-white text-slate-400 border-slate-100 hover:border-slate-200`
                  }`}
                >
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Categoría Jurídica</label>
            <div className="grid grid-cols-4 gap-2">
              {['audiencia', 'tarea', 'recordatorio', 'reunion'].map((t) => (
                <button
                  key={t} type="button" onClick={() => setType(t as any)}
                  className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2 ${
                    type === t ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-400 border-slate-100'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
              <AlignLeft className="w-3.5 h-3.5 text-blue-500" />
              Notas de Despacho / Observaciones
            </label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles técnicos, números de expediente o requerimientos..."
              rows={3}
              className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 bg-slate-50 outline-none resize-none font-medium text-slate-600 shadow-inner"
            />
          </div>

          <div className="pt-6 flex items-center justify-between gap-4">
            {isEditing && onDelete && (
              <button
                type="button"
                onClick={() => confirm('¿Desea eliminar este registro definitivamente?') && onDelete(initialEvent.id)}
                className="p-4 rounded-2xl text-red-500 hover:bg-red-50 transition-all"
              >
                <Trash2 className="w-6 h-6" />
              </button>
            )}
            
            <div className="flex-1 flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-colors">
                Cancelar
              </button>
              <button type="submit" className="flex-[2] py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest bg-blue-600 text-white shadow-xl hover:bg-blue-700 transition-all active:scale-[0.98]">
                {isEditing ? 'Actualizar Registro' : 'Confirmar Agenda'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventModal;
