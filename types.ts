
export interface Unit {
  id: string;
  name: string;
  color: 'blue' | 'red' | 'purple' | 'green' | 'amber' | 'slate' | 'rose' | 'indigo';
}

export interface TribunalEvent {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  unitId: string; // Relación por ID para permitir renombrar unidades
  type: 'audiencia' | 'reunion' | 'tarea' | 'recordatorio';
  status: 'pendiente' | 'completado' | 'cancelado';
}

export interface UnitColorMap {
  [key: string]: {
    bg: string;
    text: string;
    border: string;
  };
}
