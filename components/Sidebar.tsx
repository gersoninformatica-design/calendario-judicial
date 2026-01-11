
import React from 'react';
import { 
  Gavel, 
  Calendar, 
  CheckSquare, 
  Clock, 
  ChevronRight, 
  Settings,
  Plus,
  Users,
  LogOut
} from 'lucide-react';
import { Unit, UserProfile } from '../types.ts';
import { supabase } from '../lib/supabase.ts';

interface SidebarProps {
  units: Unit[];
  activeUnitId: string | null;
  activeView: 'calendar' | 'tasks' | 'reminders' | 'reunions';
  user: UserProfile | null;
  onSelectView: (view: 'calendar' | 'tasks' | 'reminders' | 'reunions') => void;
  onSelectUnit: (unitId: string | null) => void;
  onManageUnits: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ units, activeUnitId, activeView, user, onSelectView, onSelectUnit, onManageUnits }) => {
  const menuItems = [
    { icon: <Calendar className="w-5 h-5" />, label: 'Calendario', id: 'calendar' },
    { icon: <CheckSquare className="w-5 h-5" />, label: 'Tareas', id: 'tasks' },
    { icon: <Clock className="w-5 h-5" />, label: 'Recordatorios', id: 'reminders' },
    { icon: <Users className="w-5 h-5" />, label: 'Reuniones', id: 'reunions' },
  ] as const;

  const getColorClass = (color: string) => {
    const bgMap: Record<string, string> = {
      blue: 'bg-blue-400', red: 'bg-red-400', purple: 'bg-purple-400', 
      green: 'bg-green-400', amber: 'bg-amber-400', slate: 'bg-slate-400',
      rose: 'bg-rose-400', indigo: 'bg-indigo-400'
    };
    return bgMap[color] || 'bg-slate-400';
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-screen sticky top-0 flex flex-col p-4 shrink-0">
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg shadow-blue-200">
          <Gavel className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-800">TribunalSync</h1>
      </div>

      <nav className="space-y-1 mb-10">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelectView(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
              activeView === item.id ? 'bg-blue-50 text-blue-700 font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between px-3 mb-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <span>Unidades</span>
          <button 
            onClick={onManageUnits}
            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition-colors"
            title="Gestionar Unidades"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
        
        <div className="space-y-1">
          <button
            onClick={() => onSelectUnit(null)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all ${
              activeUnitId === null ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>Todas las Unidades</span>
            {activeUnitId === null && <ChevronRight className="w-4 h-4" />}
          </button>
          
          {units.map((unit) => (
            <button
              key={unit.id}
              onClick={() => onSelectUnit(unit.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all ${
                activeUnitId === unit.id ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getColorClass(unit.color)}`} />
                <span className="truncate max-w-[140px]">{unit.name}</span>
              </div>
              {activeUnitId === unit.id && <ChevronRight className="w-4 h-4" />}
            </button>
          ))}
          
          <button
            onClick={onManageUnits}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-blue-600 hover:bg-blue-50 transition-all font-medium mt-2"
          >
            <Plus className="w-4 h-4" />
            <span>Añadir Unidad</span>
          </button>
        </div>
      </div>

      <div className="mt-auto pt-6 border-t border-slate-100">
        <div className="bg-slate-50 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs uppercase">
                {user?.full_name?.substring(0, 2) || '??'}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-800 leading-tight truncate max-w-[100px]">{user?.full_name || 'Usuario'}</p>
                <p className="text-[9px] text-slate-500 font-medium">{user?.role || 'Cargando...'}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <div className="px-1">
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest text-center mt-2">
              Calendario Judicial Cloud
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
