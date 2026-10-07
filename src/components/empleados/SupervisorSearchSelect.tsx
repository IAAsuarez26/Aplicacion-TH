import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  X,
  User,
  Check,
  ChevronDown,
  Building2,
  Briefcase,
  Sparkles,
  Award,
  Layers,
  MapPin,
} from 'lucide-react';
import type { Cargo, Departamento, Empresa, EmpleadoConEmpresa } from '../../lib/types';

interface SupervisorSearchSelectProps {
  label: string;
  value: string; // Documento de Identidad del supervisor o ''
  onChange: (di: string) => void;
  empleados: EmpleadoConEmpresa[];
  cargos: Cargo[];
  departamentos: Departamento[];
  empresas: Empresa[];
  formEmpresaId?: string;
  codigoDepartamento?: string;
  codigoCargo?: string;
  excludeDocumento?: string | null; // Para evitar que se seleccione a sí mismo en edición
  emptyLabel?: string;
  required?: boolean;
  disabled?: boolean;
}

// Roles de liderazgo para detección inteligente
const LEADERSHIP_KEYWORDS = [
  'gerente',
  'director',
  'directora',
  'jefe',
  'jefa',
  'coordinador',
  'coordinadora',
  'supervisor',
  'supervisora',
  'lider',
  'líder',
  'presidente',
  'presidenta',
  'vicepresidente',
  'superintendente',
  'encargado',
  'encargada',
  'administrador',
  'administradora',
  'consultor',
  'especialista',
];

export const SupervisorSearchSelect: React.FC<SupervisorSearchSelectProps> = ({
  label,
  value,
  onChange,
  empleados,
  cargos,
  departamentos,
  empresas,
  formEmpresaId,
  codigoDepartamento,
  codigoCargo,
  excludeDocumento,
  emptyLabel = '-- Sin Supervisor (Máxima Autoridad) --',
  required = false,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Alcance de filtrado inteligente: 'empresa' | 'depto' | 'all'
  const [scopeFilter, setScopeFilter] = useState<'empresa' | 'depto' | 'all'>('empresa');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mapas auxiliares para resolución rápida
  const cargoMap = useMemo(() => {
    const map = new Map<string, Cargo>();
    cargos.forEach((c) => map.set(c.codigo, c));
    return map;
  }, [cargos]);

  const deptoMap = useMemo(() => {
    const map = new Map<string, Departamento>();
    departamentos.forEach((d) => map.set(d.codigo, d));
    return map;
  }, [departamentos]);

  const empresaMap = useMemo(() => {
    const map = new Map<number, Empresa>();
    empresas.forEach((e) => map.set(e.empresa_id, e));
    return map;
  }, [empresas]);

  // Si cambia la empresa seleccionada en el formulario y estaba en 'all', mantenerla o sincronizar
  useEffect(() => {
    if (formEmpresaId) {
      setScopeFilter('empresa');
    } else {
      setScopeFilter('all');
    }
  }, [formEmpresaId]);

  // Cerrar al hacer click fuera o al presionar Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Autoenfocar el input de búsqueda al abrir
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Supervisor actualmente seleccionado
  const selectedSupervisor = useMemo(() => {
    if (!value) return null;
    return empleados.find((e) => e.documento_identidad === value) || null;
  }, [value, empleados]);

  // Información de la empresa activa del formulario
  const activeEmpresa = useMemo(() => {
    if (!formEmpresaId) return null;
    return empresas.find((e) => String(e.empresa_id) === String(formEmpresaId)) || null;
  }, [formEmpresaId, empresas]);

  // Información del departamento activo del formulario
  const activeDepto = useMemo(() => {
    if (!codigoDepartamento) return null;
    return deptoMap.get(codigoDepartamento) || null;
  }, [codigoDepartamento, deptoMap]);

  // Helper para normalizar cadenas para búsquedas
  const normalize = (text: string | null | undefined) => {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[.\-\s]/g, '');
  };

  // Filtrado y ordenamiento inteligente de candidatos
  const candidateSupervisors = useMemo(() => {
    // 1. Excluir al mismo empleado si está en modo edición
    let list = empleados.filter((e) => {
      if (excludeDocumento && e.documento_identidad === excludeDocumento) return false;
      return true;
    });

    // 2. Filtrado contextual según el alcance activo (empresa / departamento / toda la organización)
    if (scopeFilter === 'depto' && codigoDepartamento) {
      list = list.filter((e) => e.codigo_departamento === codigoDepartamento);
    } else if (scopeFilter === 'empresa' && formEmpresaId) {
      list = list.filter((e) => {
        if (!e.empresa_id) return true; // Permitir corporativos sin empresa estricta
        return String(e.empresa_id) === String(formEmpresaId);
      });
    }

    // 3. Filtrado por texto de búsqueda ingresado por el usuario
    if (searchQuery.trim()) {
      const qNorm = normalize(searchQuery);
      const qWords = searchQuery.toLowerCase().trim().split(/\s+/);

      list = list.filter((emp) => {
        const fullText = `${emp.nombres} ${emp.apellidos} ${emp.documento_identidad || ''} ${emp.codigo_empleado || ''}`.toLowerCase();
        const cargoName = cargoMap.get(emp.codigo_cargo)?.nombre?.toLowerCase() || '';
        const deptoName = deptoMap.get(emp.codigo_departamento)?.nombre?.toLowerCase() || '';
        const empName = emp.empresa_corto?.toLowerCase() || emp.empresa_nombre?.toLowerCase() || '';

        // Coincidencia exacta o normalizada por documento de identidad
        const docNorm = normalize(emp.documento_identidad);
        if (docNorm.includes(qNorm)) return true;

        // Coincidencia por palabras en nombre, cargo, departamento o empresa
        return qWords.every((word) =>
          fullText.includes(word) ||
          cargoName.includes(word) ||
          deptoName.includes(word) ||
          empName.includes(word)
        );
      });
    }

    // 4. Ordenamiento inteligente con ponderación:
    //    a) Candidatos del mismo departamento primero (si hay departamento seleccionado)
    //    b) Candidatos con cargos de liderazgo (Gerente, Director, Jefe, etc.)
    //    c) Orden alfabético por nombre
    return list.sort((a, b) => {
      // Ponderación por departamento
      if (codigoDepartamento) {
        const aMismoDepto = a.codigo_departamento === codigoDepartamento ? 1 : 0;
        const bMismoDepto = b.codigo_departamento === codigoDepartamento ? 1 : 0;
        if (aMismoDepto !== bMismoDepto) return bMismoDepto - aMismoDepto;
      }

      // Ponderación por cargo de liderazgo
      const aCargoNombre = (cargoMap.get(a.codigo_cargo)?.nombre || '').toLowerCase();
      const bCargoNombre = (cargoMap.get(b.codigo_cargo)?.nombre || '').toLowerCase();
      const aIsLeader = LEADERSHIP_KEYWORDS.some((kw) => aCargoNombre.includes(kw)) ? 1 : 0;
      const bIsLeader = LEADERSHIP_KEYWORDS.some((kw) => bCargoNombre.includes(kw)) ? 1 : 0;
      if (aIsLeader !== bIsLeader) return bIsLeader - aIsLeader;

      // Alfabético
      const aNombre = `${a.nombres} ${a.apellidos}`.toLowerCase();
      const bNombre = `${b.nombres} ${b.apellidos}`.toLowerCase();
      return aNombre.localeCompare(bNombre, 'es', { sensitivity: 'base' });
    });
  }, [
    empleados,
    excludeDocumento,
    scopeFilter,
    codigoDepartamento,
    formEmpresaId,
    searchQuery,
    cargoMap,
    deptoMap,
  ]);

  // Conteo de candidatos por alcance para las insignias
  const counts = useMemo(() => {
    const valid = empleados.filter((e) => !excludeDocumento || e.documento_identidad !== excludeDocumento);
    const empresaCount = formEmpresaId
      ? valid.filter((e) => !e.empresa_id || String(e.empresa_id) === String(formEmpresaId)).length
      : valid.length;
    const deptoCount = codigoDepartamento
      ? valid.filter((e) => e.codigo_departamento === codigoDepartamento).length
      : 0;
    return {
      all: valid.length,
      empresa: empresaCount,
      depto: deptoCount,
    };
  }, [empleados, excludeDocumento, formEmpresaId, codigoDepartamento]);

  const handleSelect = (di: string) => {
    onChange(di);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5 text-brand-400" />
          {label} {required && <span className="text-rose-400">*</span>}
        </span>
        {formEmpresaId && activeEmpresa && (
          <span className="text-[10px] text-brand-400 font-mono bg-brand-500/10 border border-brand-500/20 px-1.5 py-0.2 rounded-md flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-brand-400 animate-pulse" />
            Filtrado contextual activo
          </span>
        )}
      </label>

      {/* Tarjeta de visualización cuando hay un supervisor seleccionado */}
      {selectedSupervisor && !isOpen ? (
        <div className="flex items-center justify-between p-2.5 bg-slate-950 border border-brand-500/40 rounded-xl hover:border-brand-500/70 transition-all group shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-indigo-700 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
              {selectedSupervisor.nombres.charAt(0)}
              {selectedSupervisor.apellidos.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-white truncate">
                  {selectedSupervisor.nombres} {selectedSupervisor.apellidos}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-800 text-brand-300 border border-slate-700">
                  {selectedSupervisor.documento_identidad || 'Sin C.I.'}
                </span>
                {selectedSupervisor.empresa_corto && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    {selectedSupervisor.empresa_corto}
                  </span>
                )}
                {codigoDepartamento && selectedSupervisor.codigo_departamento === codigoDepartamento && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    Mismo Depto
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                <span className="truncate text-slate-300">
                  {cargoMap.get(selectedSupervisor.codigo_cargo)?.nombre || selectedSupervisor.codigo_cargo}
                </span>
                {selectedSupervisor.codigo_departamento && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="truncate text-slate-400">
                      {deptoMap.get(selectedSupervisor.codigo_departamento)?.nombre || selectedSupervisor.codigo_departamento}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              disabled={disabled}
              className="px-2 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              title="Cambiar supervisor"
            >
              Cambiar
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled}
              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              title="Quitar supervisor"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Gatillo cuando NO hay supervisor seleccionado o cuando está abierto */
        <div
          onClick={() => !disabled && setIsOpen(true)}
          className={`w-full px-3.5 py-2 bg-slate-950 border rounded-xl text-sm flex items-center justify-between cursor-pointer transition-all ${
            isOpen
              ? 'border-brand-500 ring-2 ring-brand-500/20'
              : 'border-slate-800 hover:border-slate-700 text-slate-400'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <span className={value ? 'text-white font-medium' : 'text-slate-400'}>
              {value
                ? `C.I. ${value}`
                : 'Escribir nombre, cédula o seleccionar supervisor...'}
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      )}

      {/* Menú Desplegable Flotante de Búsqueda y Filtro Inteligente */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden text-left flex flex-col max-h-[380px] animate-in fade-in zoom-in-95 duration-150">
          {/* Barra de Búsqueda en tiempo real */}
          <div className="p-2.5 border-b border-slate-800 bg-slate-950/90 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-brand-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por cédula (ej: 12345), nombre, cargo..."
                className="w-full pl-9 pr-8 py-2 bg-slate-900 border border-slate-800 focus:border-brand-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Pastillas de alcance inteligente para reducir opciones */}
            {(formEmpresaId || codigoDepartamento) && (
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-800/80 flex-wrap">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-0.5">
                  Filtro inteligente:
                </span>

                {formEmpresaId && (
                  <button
                    type="button"
                    onClick={() => setScopeFilter('empresa')}
                    className={`px-2 py-0.5 text-[11px] rounded-lg font-medium transition-colors flex items-center gap-1 ${
                      scopeFilter === 'empresa'
                        ? 'bg-brand-500 text-white font-semibold shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Building2 className="w-3 h-3" />
                    <span>
                      {activeEmpresa?.nombre_corto || activeEmpresa?.codigo || 'Misma Empresa'} ({counts.empresa})
                    </span>
                  </button>
                )}

                {codigoDepartamento && (
                  <button
                    type="button"
                    onClick={() => setScopeFilter('depto')}
                    className={`px-2 py-0.5 text-[11px] rounded-lg font-medium transition-colors flex items-center gap-1 ${
                      scopeFilter === 'depto'
                        ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                    <span>Mismo Depto ({counts.depto})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setScopeFilter('all')}
                  className={`px-2 py-0.5 text-[11px] rounded-lg font-medium transition-colors flex items-center gap-1 ${
                    scopeFilter === 'all'
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>Toda la Organización ({counts.all})</span>
                </button>
              </div>
            )}
          </div>

          {/* Lista de Opciones */}
          <div className="p-1.5 overflow-y-auto flex-1 divide-y divide-slate-800/50">
            {/* Opción fija: Sin Supervisor (Máxima Autoridad) */}
            <div
              onClick={() => handleSelect('')}
              className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between group ${
                !value
                  ? 'bg-brand-500/15 border border-brand-500/30 text-white'
                  : 'hover:bg-slate-800/80 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-white">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold block">{emptyLabel}</span>
                  <span className="text-[10px] text-slate-400">
                    El colaborador reporta directamente a la directiva o no tiene supervisor
                  </span>
                </div>
              </div>
              {!value && <Check className="w-4 h-4 text-brand-400 shrink-0" />}
            </div>

            {/* Listado de Supervisores Coincidentes */}
            {candidateSupervisors.length > 0 ? (
              candidateSupervisors.map((emp) => {
                const isSelected = value === emp.documento_identidad;
                const cargoNombre = cargoMap.get(emp.codigo_cargo)?.nombre || emp.codigo_cargo;
                const deptoNombre = deptoMap.get(emp.codigo_departamento)?.nombre || emp.codigo_departamento;
                const esMismoDepto = codigoDepartamento && emp.codigo_departamento === codigoDepartamento;
                const esLider = LEADERSHIP_KEYWORDS.some((kw) => cargoNombre.toLowerCase().includes(kw));

                return (
                  <div
                    key={emp.empleado_id}
                    onClick={() => handleSelect(emp.documento_identidad || '')}
                    className={`p-2 rounded-xl cursor-pointer transition-all flex items-center justify-between group ${
                      isSelected
                        ? 'bg-brand-500/20 border border-brand-500/40 text-white'
                        : 'hover:bg-slate-800/80 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          esMismoDepto
                            ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                            : esLider
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {emp.nombres.charAt(0)}
                        {emp.apellidos.charAt(0)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-white truncate group-hover:text-brand-300 transition-colors">
                            {emp.nombres} {emp.apellidos}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-950 text-brand-400 border border-slate-800">
                            {emp.documento_identidad || 'Sin C.I.'}
                          </span>
                          {emp.empresa_corto && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300">
                              {emp.empresa_corto}
                            </span>
                          )}
                          {esMismoDepto && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5">
                              <Sparkles className="w-2.5 h-2.5" />
                              Mismo Depto
                            </span>
                          )}
                          {esLider && !esMismoDepto && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                              <Award className="w-2.5 h-2.5" />
                              Liderazgo
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                          <span className="truncate text-slate-300">{cargoNombre}</span>
                          {deptoNombre && (
                            <>
                              <span className="text-slate-600">•</span>
                              <span className="truncate text-slate-400">{deptoNombre}</span>
                            </>
                          )}
                          {emp.sede && (
                            <>
                              <span className="text-slate-600">•</span>
                              <span className="text-slate-500 text-[10px] flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5" />
                                {emp.sede}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 pl-1">
                      {isSelected ? (
                        <Check className="w-4 h-4 text-brand-400" />
                      ) : (
                        <span className="text-[10px] text-slate-500 group-hover:text-brand-300 opacity-0 group-hover:opacity-100 transition-opacity">
                          Elegir
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center">
                <p className="text-xs text-slate-400">
                  No se encontraron supervisores que coincidan con &ldquo;{searchQuery}&rdquo; en el filtro activo.
                </p>
                {scopeFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => {
                      setScopeFilter('all');
                    }}
                    className="mt-2.5 px-3 py-1.5 text-xs font-semibold text-brand-300 bg-brand-500/15 hover:bg-brand-500/25 border border-brand-500/30 rounded-xl transition-colors"
                  >
                    Buscar en toda la organización ({counts.all})
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Barra inferior de estado */}
          <div className="p-2 px-3 border-t border-slate-800 bg-slate-950/80 text-[10px] text-slate-400 flex items-center justify-between shrink-0">
            <span>
              Mostrando <strong className="text-slate-200">{candidateSupervisors.length}</strong> supervisores
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              Cerrar (Esc)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
