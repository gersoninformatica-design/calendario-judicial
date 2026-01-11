
export interface Unit {
  id: string;
  name: string;
  color: 'blue' | 'red' | 'purple' | 'green' | 'amber' | 'slate' | 'rose' | 'indigo';
}

export interface UserProfile {
  id: string;
  full_name: string;
  role: string;
  avatar_url?: string;
}

export interface TribunalEvent {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  unitId: string;
  user_id?: string; // ID del creador
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
