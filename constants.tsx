
import { Unit, TribunalEvent } from './types.ts';

export const INITIAL_UNITS: Unit[] = [
  { id: 'u1', name: 'Familia', color: 'purple' },
  { id: 'u2', name: 'Administrativo', color: 'slate' },
  { id: 'u3', name: 'Informática', color: 'blue' },
  { id: 'u4', name: 'Metas', color: 'amber' },
];

export const COLOR_OPTIONS: Unit['color'][] = ['blue', 'red', 'purple', 'green', 'amber', 'slate', 'rose', 'indigo'];

export const INITIAL_EVENTS: TribunalEvent[] = [
  {
    id: '1',
    title: 'Audiencia de Conciliación - Caso Pérez',
    description: 'Sesión presencial en Sala A.',
    startTime: new Date(new Date().setHours(9, 0, 0, 0)),
    endTime: new Date(new Date().setHours(10, 30, 0, 0)),
    unitId: 'u1',
    type: 'audiencia',
    status: 'pendiente'
  },
  {
    id: '2',
    title: 'Mantenimiento de Servidores',
    description: 'Revisión periódica de infraestructura.',
    startTime: new Date(new Date().setHours(11, 0, 0, 0)),
    endTime: new Date(new Date().setHours(12, 0, 0, 0)),
    unitId: 'u3',
    type: 'tarea',
    status: 'pendiente'
  }
];

export const getUnitColorClasses = (color: string) => {
  const maps: Record<string, { bg: string, text: string, border: string }> = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    red: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
    green: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
    slate: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
    rose: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-300' },
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
  };
  return maps[color] || maps.slate;
};
