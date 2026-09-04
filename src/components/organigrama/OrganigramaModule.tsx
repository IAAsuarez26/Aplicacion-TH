import React, { useState, useEffect } from 'react';
import {
  Network,
  Building2,
  GitFork,
  Users,
  ChevronDown,
  ChevronRight,
  UserCheck,
  Shield,
  Sparkles,
  Search,
  Layers,
  ArrowRight,
  User,
  BadgeAlert,
} from 'lucide-react';
import { organigramaApi, empleadosApi, direccionesApi, gerenciasApi, departamentosApi } from '../../lib/insforge';
import type { OrganigramaRow, SubordinadoRow, Empleado, Direccion, Gerencia, Departamento } from '../../lib/types';
import { EstadoLaboralBadge } from '../common/Badge';
import { useToast } from '../common/Toast';

export const OrganigramaModule: React.FC = () => {
  const toast = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'arbol' | 'subordinados' | 'tabla'>('arbol');
  const [organigramaRows, setOrganigramaRows] = useState<OrganigramaRow[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [gerencias, setGerencias] = useState<Gerencia[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loading, setLoading] = useState(true);

  // Subordinados explorer state
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<number | ''>('');
  const [subordinados, setSubordinados] = useState<SubordinadoRow[]>([]);
  const [loadingSubordinados, setLoadingSubordinados] = useState(false);

  // Tree expansion state
  const [expandedDirs, setExpandedDirs] = useState<Record<number, boolean>>({});
  const [expandedGers, setExpandedGers] = useState<Record<number, boolean>>({});
  const [expandedDeps, setExpandedDeps] = useState<Record<number, boolean>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        { data: orgData, error: orgErr },
        { data: eData },
        { data: dData },
        { data: gData },
        { data: depData },
      ] = await Promise.all([
        organigramaApi.getOrganigramaCompleto(),
        empleadosApi.getAll(),
        direccionesApi.getAll(),
        gerenciasApi.getAll(),
        departamentosApi.getAll(),
      ]);

      if (orgErr) toast.error('No se pudo cargar la vista de organigrama');
      setOrganigramaRows(orgData || []);
      setEmpleados(eData || []);
      setDirecciones(dData || []);
      setGerencias(gData || []);
      setDepartamentos(depData || []);

      // Auto-expand first direction and gerencia
      if (dData && dData.length > 0) {
        setExpandedDirs({ [dData[0].direccion_id]: true });
      }
      if (gData && gData.length > 0) {
        setExpandedGers({ [gData[0].gerencia_id]: true });
      }
      if (depData && depData.length > 0) {
        setExpandedDeps({ [depData[0].departamento_id]: true });
      }

      // Default supervisor for explorer
      if (eData && eData.length > 1) {
        setSelectedSupervisorId(eData[1].empleado_id); // e.g. Ana Gomez
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch Subordinados using sp_obtener_subordinados
  useEffect(() => {
    if (!selectedSupervisorId) return;

    async function fetchSubordinados() {
      setLoadingSubordinados(true);
      try {
        const { data, error } = await organigramaApi.getSubordinados(Number(selectedSupervisorId));
        if (error) {
          toast.error('Error al consultar función de subordinados');
          setSubordinados([]);
        } else {
          setSubordinados(data || []);
        }
      } finally {
        setLoadingSubordinados(false);
      }
    }

    fetchSubordinados();
  }, [selectedSupervisorId]);

  const toggleDir = (id: number) => {
    setExpandedDirs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleGer = (id: number) => {
    setExpandedGers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleDep = (id: number) => {
    setExpandedDeps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Network className="w-6 h-6 text-brand-400" />
            Organigrama & Líneas de Mando
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Visualizador jerárquico multinivel y explorador recursivo de cadena de mando.
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1">
          <button
            onClick={() => setActiveSubTab('arbol')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeSubTab === 'arbol'
                ? 'bg-brand-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Árbol Organizacional</span>
          </button>

          <button
            onClick={() => setActiveSubTab('subordinados')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeSubTab === 'subordinados'
                ? 'bg-brand-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Explorador de Mando (RPC)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('tabla')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeSubTab === 'tabla'
                ? 'bg-brand-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Vista Completa (vw_organigrama)</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: ARBOL VISUAL INTERACTIVO */}
      {activeSubTab === 'arbol' && (
        <div className="glass-card rounded-2xl p-6 shadow-xl space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-400" />
              Jerarquía de Unidades y Personal Adscrito
            </h3>
            <span className="text-xs text-slate-400">
              Haz clic en cada nivel para expandir o contraer sus ramas
            </span>
          </div>

          <div className="space-y-4">
            {direcciones.map((dir) => {
              const isDirOpen = !!expandedDirs[dir.direccion_id];
              const childGerencias = gerencias.filter((g) => g.codigo_direccion === dir.codigo);
              const dirDirector = empleados.find((e) => e.empleado_id === dir.director_id);

              return (
                <div
                  key={dir.direccion_id}
                  className="rounded-2xl border border-purple-500/30 bg-slate-900/80 overflow-hidden shadow-lg"
                >
                  {/* Nivel 1 Header */}
                  <div
                    onClick={() => toggleDir(dir.direccion_id)}
                    className="p-4 bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-900 flex items-center justify-between cursor-pointer hover:bg-purple-950/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1 rounded-lg bg-purple-500/20 text-purple-300">
                        {isDirOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                      <Building2 className="w-5 h-5 text-purple-400" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                            {dir.codigo}
                          </span>
                          <span className="text-sm font-bold text-white">{dir.nombre}</span>
                        </div>
                        {dirDirector && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            Director General: <strong className="text-purple-200">{dirDirector.nombres} {dirDirector.apellidos}</strong>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-xs font-semibold text-purple-300 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                      Nivel 1 (Dirección)
                    </div>
                  </div>

                  {/* Nivel 2: Gerencias */}
                  {isDirOpen && (
                    <div className="p-4 pl-8 sm:pl-12 border-t border-purple-500/20 bg-slate-950/40 space-y-4">
                      {childGerencias.length > 0 ? (
                        childGerencias.map((ger) => {
                          const isGerOpen = !!expandedGers[ger.gerencia_id];
                          const childDeptos = departamentos.filter((d) => d.codigo_gerencia === ger.codigo);
                          const gerente = empleados.find((e) => e.empleado_id === ger.gerente_id);

                          return (
                            <div
                              key={ger.gerencia_id}
                              className="rounded-xl border border-indigo-500/30 bg-slate-900/90 overflow-hidden"
                            >
                              {/* Gerencia Header */}
                              <div
                                onClick={() => toggleGer(ger.gerencia_id)}
                                className="p-3.5 bg-gradient-to-r from-indigo-950/50 via-slate-900 to-slate-900 flex items-center justify-between cursor-pointer hover:bg-indigo-950/70 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-300">
                                    {isGerOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                  </div>
                                  <GitFork className="w-4 h-4 text-indigo-400" />
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-mono font-bold text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                                        {ger.codigo}
                                      </span>
                                      <span className="text-xs font-bold text-slate-100">{ger.nombre}</span>
                                    </div>
                                    {gerente && (
                                      <p className="text-[11px] text-slate-400 mt-0.5">
                                        Gerente: <strong className="text-indigo-200">{gerente.nombres} {gerente.apellidos}</strong>
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="text-[10px] font-semibold text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                                  Nivel 2 (Gerencia)
                                </div>
                              </div>

                              {/* Nivel 3: Departamentos */}
                              {isGerOpen && (
                                <div className="p-3.5 pl-6 sm:pl-10 border-t border-indigo-500/20 bg-slate-950/60 space-y-3">
                                  {childDeptos.length > 0 ? (
                                    childDeptos.map((dep) => {
                                      const isDepOpen = !!expandedDeps[dep.departamento_id];
                                      const deptEmployees = empleados.filter((e) => e.codigo_departamento === dep.codigo);
                                      const jefe = empleados.find((e) => e.empleado_id === dep.jefe_departamento_id);

                                      return (
                                        <div
                                          key={dep.departamento_id}
                                          className="rounded-lg border border-emerald-500/30 bg-slate-900/90 overflow-hidden"
                                        >
                                          {/* Dept Header */}
                                          <div
                                            onClick={() => toggleDep(dep.departamento_id)}
                                            className="p-3 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 flex items-center justify-between cursor-pointer hover:bg-emerald-950/60 transition-colors"
                                          >
                                            <div className="flex items-center gap-2.5">
                                              <div className="p-1 rounded bg-emerald-500/20 text-emerald-300">
                                                {isDepOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                              </div>
                                              <Network className="w-4 h-4 text-emerald-400" />
                                              <div>
                                                <div className="flex items-center gap-2">
                                                  <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                                    {dep.codigo}
                                                  </span>
                                                  <span className="text-xs font-bold text-slate-100">{dep.nombre}</span>
                                                </div>
                                                {jefe && (
                                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                                    Jefe Depto: <strong className="text-emerald-200">{jefe.nombres} {jefe.apellidos}</strong>
                                                  </p>
                                                )}
                                              </div>
                                            </div>

                                            <div className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                              {deptEmployees.length} {deptEmployees.length === 1 ? 'Empleado' : 'Empleados'}
                                            </div>
                                          </div>

                                          {/* Colaboradores dentro del Departamento */}
                                          {isDepOpen && (
                                            <div className="p-3 pl-6 border-t border-emerald-500/20 bg-slate-950/80">
                                              {deptEmployees.length > 0 ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                  {deptEmployees.map((emp) => (
                                                    <div
                                                      key={emp.empleado_id}
                                                      className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs hover:border-brand-500/40 transition-colors"
                                                    >
                                                      <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-300 text-[10px] font-bold flex items-center justify-center">
                                                          {emp.nombres.charAt(0)}
                                                        </div>
                                                        <div>
                                                          <div className="font-semibold text-slate-200">
                                                            {emp.nombres} {emp.apellidos}
                                                          </div>
                                                          <div className="text-[10px] text-slate-400 font-mono">
                                                            {emp.codigo_empleado}
                                                          </div>
                                                        </div>
                                                      </div>
                                                      <EstadoLaboralBadge estado={emp.estado_laboral} />
                                                    </div>
                                                  ))}
                                                </div>
                                              ) : (
                                                <p className="text-xs text-slate-400 italic">No hay empleados adscritos a este departamento.</p>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <p className="text-xs text-slate-400 italic">No hay departamentos creados en esta gerencia.</p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-slate-400 italic">No hay gerencias creadas en esta dirección.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: SUBORDINADOS EXPLORER (RPC: sp_obtener_subordinados) */}
      {activeSubTab === 'subordinados' && (
        <div className="glass-card rounded-2xl p-6 shadow-xl space-y-6 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-400" />
                Explorador Recursivo de Subordinados
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Ejecuta en vivo la función PostgreSQL <code className="text-brand-300 font-mono">sp_obtener_subordinados(p_supervisor_id)</code>
              </p>
            </div>

            {/* Supervisor Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300 shrink-0">Seleccionar Supervisor:</span>
              <select
                value={selectedSupervisorId}
                onChange={(e) => setSelectedSupervisorId(Number(e.target.value))}
                className="bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-brand-500 font-medium"
              >
                {[...empleados]
                  .sort((a, b) => `${a.nombres} ${a.apellidos}`.localeCompare(`${b.nombres} ${b.apellidos}`, 'es', { sensitivity: 'base' }))
                  .map((emp) => (
                    <option key={emp.empleado_id} value={emp.empleado_id}>
                      {emp.documento_identidad ? `[${emp.documento_identidad}] ` : ''}{emp.nombres} {emp.apellidos} ({emp.codigo_empleado})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Results List */}
          {loadingSubordinados ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs text-slate-400">Consultando árbol jerárquico...</p>
            </div>
          ) : subordinados.length > 0 ? (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-brand-950/40 border border-brand-500/30 flex items-center justify-between text-xs text-brand-200">
                <span>Personal bajo supervisión directa e indirecta: <strong>{subordinados.length} colaboradores</strong></span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-brand-500/20 text-brand-300">
                  Recursión PL/pgSQL
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-200">
                  <thead className="bg-slate-900 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Nivel</th>
                      <th className="px-4 py-3">Código</th>
                      <th className="px-4 py-3">Colaborador</th>
                      <th className="px-4 py-3">Cargo</th>
                      <th className="px-4 py-3">Departamento / Gerencia</th>
                      <th className="px-4 py-3">Supervisor Inmediato</th>
                      <th className="px-4 py-3">Evaluador Efectivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/30">
                    {subordinados.map((sub, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              sub.nivel_jerarquico === 1
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            }`}
                          >
                            Nivel {sub.nivel_jerarquico}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-300">
                          {sub.codigo_empleado}
                        </td>
                        <td className="px-4 py-3 font-bold text-white">
                          {sub.nombre_completo}
                        </td>
                        <td className="px-4 py-3 text-slate-200">
                          {sub.cargo}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-200">{sub.departamento}</div>
                          <div className="text-[10px] text-slate-400">{sub.gerencia}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {sub.supervisor_inmediato || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-brand-300 font-medium">{sub.evaluador_efectivo || '-'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-medium text-slate-300">Sin subordinados adscritos</p>
              <p className="text-xs text-slate-400 mt-1">Este empleado no tiene colaboradores a su cargo actualmente.</p>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: TABLA DE VISTA ORGANIGRAMA COMPLETO */}
      {activeSubTab === 'tabla' && (
        <div className="glass-card rounded-2xl p-6 shadow-xl space-y-4 animate-fade-in">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" />
              Correlación Total: Vista `vw_organigrama_completo`
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Correlación de cada empleado con toda su línea de mando (Dirección, Gerencia, Depto, Supervisor y Evaluador).
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-200">
              <thead className="bg-slate-900 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="px-3.5 py-3">Colaborador</th>
                  <th className="px-3.5 py-3">Cargo</th>
                  <th className="px-3.5 py-3">Dirección & Gerencia</th>
                  <th className="px-3.5 py-3">Departamento & Jefe</th>
                  <th className="px-3.5 py-3">Supervisor Directo</th>
                  <th className="px-3.5 py-3">Evaluador Efectivo</th>
                  <th className="px-3.5 py-3 text-center">Tipo Evaluador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/30">
                {organigramaRows.map((row) => (
                  <tr key={row.empleado_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-3.5 py-3">
                      <div className="font-bold text-slate-100">{row.nombre_completo_empleado}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{row.codigo_empleado}</div>
                    </td>
                    <td className="px-3.5 py-3 font-medium text-slate-200">
                      {row.cargo_nombre}
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="text-purple-300 font-semibold">{row.direccion_nombre}</div>
                      <div className="text-[10px] text-indigo-300">{row.gerencia_nombre}</div>
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="text-emerald-300 font-semibold">{row.departamento_nombre}</div>
                      <div className="text-[10px] text-slate-400">Jefe: {row.jefe_departamento_nombre || 'Sin asignar'}</div>
                    </td>
                    <td className="px-3.5 py-3 text-slate-200">
                      {row.supervisor_directo_nombre || <em className="text-slate-400">Directorio</em>}
                    </td>
                    <td className="px-3.5 py-3 font-semibold text-slate-100">
                      {row.evaluador_efectivo_nombre}
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          row.tipo_evaluador === 'EVALUADOR_ESPECIAL'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {row.tipo_evaluador === 'EVALUADOR_ESPECIAL' ? '★ Especial' : 'Supervisor'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
