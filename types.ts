
export interface Unit {
  id: string;
  name: string;
  color: 'blue' | 'red' | 'purple' | 'green' | 'amber' | 'slate' | 'rose' | 'indigo';
}

export interface UserProfile {
  id: string;
  full_name: string;
  email?: string;
  role: string;
  avatar_url?: string;
  is_approved: boolean; // Control de seguridad de Gerson
}

export interface TribunalEvent {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  unitId: string;
  user_id?: string;
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
