
import React, { useState } from 'react';
import { X, Plus, Trash2, Check, Settings, AlertCircle } from 'lucide-react';
import { Unit } from '../types.ts';
import { COLOR_OPTIONS } from '../constants.tsx';

interface UnitSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  units: Unit[];
  onUpdateUnits: (units: Unit[]) => void;
}

const UnitSettingsModal: React.FC<UnitSettingsModalProps> = ({ isOpen, onClose, units, onUpdateUnits }) => {
  const [newUnitName, setNewUnitName] = useState('');
  const [selectedColor, setSelectedColor] = useState<Unit['color']>('blue');

  if (!isOpen) return null;

  const handleAddUnit = () => {
    if (!newUnitName.trim()) return;
    const newUnit: Unit = {
      id: Math.random().toString(36).substr(2, 9),
      name: newUnitName.trim(),
      color: selectedColor
    };
    onUpdateUnits([...units, newUnit]);
    setNewUnitName('');
    setSelectedColor('blue');
  };

  const handleRemoveUnit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (units.length <= 1) {
      alert("Para el correcto funcionamiento, el tribunal debe tener al menos una unidad configurada.");
      return;
    }
    const newUnits = units.filter(u => u.id !== id);
    onUpdateUnits(newUnits);
  };

  const handleRenameUnit = (id: string, name: string) => {
    onUpdateUnits(units.map(u => u.id === id ? { ...u, name } : u));
  };

  const handleColorChange = (id: string, color: Unit['color']) => {
    onUpdateUnits(units.map(u => u.id === id ? { ...u, color } : u));
  };

  const getColorHex = (color: string) => {
    const hexMap: Record<string, string> = {
      blue: '#3b82f6', red: '#ef4444', purple: '#a855f7', 
      green: '#22c55e', amber: '#f59e0b', slate: '#64748b',
      rose: '#f43f5e', indigo: '#6366f1'
    };
    return hexMap[color] || '#64748b';
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-xl">
              <Settings className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Configuración de Unidades</h3>
              <p className="text-xs text-slate-500">Añade, edita o elimina áreas del tribunal</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          <section className="space-y-4">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 px-1">
              <Plus className="w-4 h-4 text-blue-600" />
              Nueva Unidad
            </h4>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <div className="space-y-4">
                <input 
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  placeholder="Nombre de la unidad judicial..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all"
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {COLOR_OPTIONS.map(color => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 ${
                          selectedColor === color ? 'border-slate-800 shadow-md' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: getColorHex(color) }}
                      >
                        {selectedColor === color && <Check className="w-4 h-4 text-white" />}
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={handleAddUnit}
                    disabled={!newUnitName.trim()}
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50 shadow-md"
                  >
                    Crear Unidad
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h4 className="text-sm font-bold text-slate-800 px-1">Unidades del Sistema</h4>
            <div className="grid gap-3">
              {units.map(unit => (
                <div key={unit.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 group hover:border-blue-200 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full shrink-0" 
                      style={{ backgroundColor: getColorHex(unit.color) }}
                    />
                    <input 
                      value={unit.name}
                      onChange={(e) => handleRenameUnit(unit.id, e.target.value)}
                      className="flex-1 bg-transparent font-bold text-slate-700 outline-none border-b border-transparent focus:border-blue-400 px-1"
                    />
                    <button 
                      type="button"
                      onClick={(e) => handleRemoveUnit(e, unit.id)}
                      className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                      aria-label="Eliminar unidad"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Color:</span>
                    <div className="flex gap-1.5">
                      {COLOR_OPTIONS.map(color => (
                        <button
                          key={color}
                          onClick={() => handleColorChange(unit.id, color)}
                          className={`w-4 h-4 rounded-full transition-all ${
                            unit.color === color ? 'ring-2 ring-slate-800 ring-offset-1 scale-110' : 'opacity-60 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: getColorHex(color) }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-lg active:scale-[0.98]"
          >
            Guardar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnitSettingsModal;
