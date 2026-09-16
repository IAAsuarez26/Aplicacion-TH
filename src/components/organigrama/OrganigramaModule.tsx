import React, { useState, useEffect, useMemo } from 'react';
import {
  Network,
  Building2,
  GitFork,
  Users,
  ChevronDown,
  ChevronRight,
  Shield,
  Sparkles,
  Layers,
  Building,
  CheckCircle2,
  Briefcase,
  Layers3,
  Search,
} from 'lucide-react';
import { organigramaApi, empleadosApi, direccionesApi, gerenciasApi, departamentosApi, empresasApi } from '../../lib/insforge';
import type { OrganigramaRow, SubordinadoRow, Empleado, Direccion, Gerencia, Departamento, Empresa } from '../../lib/types';
import { EstadoLaboralBadge } from '../common/Badge';
import { useToast } from '../common/Toast';

export const OrganigramaModule: React.FC = () => {
  const toast = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'arbol' | 'subordinados' | 'tabla'>('arbol');
  const [organigramaRows, setOrganigramaRows] = useState<OrganigramaRow[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [gerencias, setGerencias] = useState<Gerencia[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtro principal por Empresa (ID de empresa o 'ALL')
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<number | 'ALL'>('ALL');

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
        { data: empData },
      ] = await Promise.all([
        organigramaApi.getOrganigramaCompleto(),
        empleadosApi.getAll(),
        direccionesApi.getAll(),
        gerenciasApi.getAll(),
        departamentosApi.getAll(),
        empresasApi.getAll(),
      ]);

      if (orgErr) toast.error('No se pudo cargar la vista de organigrama');
      setOrganigramaRows(orgData || []);
      setEmpleados(eData || []);
      setDirecciones(dData || []);
      setGerencias(gData || []);
      setDepartamentos(depData || []);
      setEmpresas(empData || []);

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
        setSelectedSupervisorId(eData[1].empleado_id);
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

  // Helpers de empresa y estilo visual según filial
  const getCompanyStyle = (code?: string | null) => {
    switch (code) {
      case 'PB':
        return {
          pillActive: 'bg-cyan-600 text-white shadow-glow ring-2 ring-cyan-400',
          badge: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
          cardBorder: 'border-cyan-500/30 hover:border-cyan-500/60',
          gradient: 'from-cyan-950/60 via-slate-900 to-slate-900',
          accent: 'text-cyan-400',
        };
      case 'LP':
        return {
          pillActive: 'bg-emerald-600 text-white shadow-glow ring-2 ring-emerald-400',
          badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
          cardBorder: 'border-emerald-500/30 hover:border-emerald-500/60',
          gradient: 'from-emerald-950/60 via-slate-900 to-slate-900',
          accent: 'text-emerald-400',
        };
      case 'PK':
        return {
          pillActive: 'bg-amber-600 text-white shadow-glow ring-2 ring-amber-400',
          badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
          cardBorder: 'border-amber-500/30 hover:border-amber-500/60',
          gradient: 'from-amber-950/60 via-slate-900 to-slate-900',
          accent: 'text-amber-400',
        };
      default:
        return {
          pillActive: 'bg-indigo-600 text-white shadow-glow ring-2 ring-indigo-400',
          badge: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
          cardBorder: 'border-purple-500/30 hover:border-purple-500/60',
          gradient: 'from-purple-950/60 via-slate-900 to-slate-900',
          accent: 'text-purple-400',
        };
    }
  };

  const getEmpresaForDireccion = (dirCode?: string | null) => {
    if (!dirCode) return null;
    const dir = direcciones.find((d) => d.codigo === dirCode);
    if (!dir || !dir.empresa_id) return null;
    return empresas.find((e) => e.empresa_id === dir.empresa_id) || null;
  };

  // Filtrado en cascada según empresa seleccionada
  const filteredDirecciones = useMemo(() => {
    if (selectedEmpresaId === 'ALL') return direcciones;
    return direcciones.filter((d) => d.empresa_id === selectedEmpresaId);
  }, [direcciones, selectedEmpresaId]);

  const dirCodesSet = useMemo(() => {
    return new Set(filteredDirecciones.map((d) => d.codigo));
  }, [filteredDirecciones]);

  const filteredGerencias = useMemo(() => {
    if (selectedEmpresaId === 'ALL') return gerencias;
    return gerencias.filter((g) => g.codigo_direccion && dirCodesSet.has(g.codigo_direccion));
  }, [gerencias, dirCodesSet, selectedEmpresaId]);

  const gerCodesSet = useMemo(() => {
    return new Set(filteredGerencias.map((g) => g.codigo));
  }, [filteredGerencias]);

  const filteredDepartamentos = useMemo(() => {
    if (selectedEmpresaId === 'ALL') return departamentos;
    return departamentos.filter((dep) => dep.codigo_gerencia && gerCodesSet.has(dep.codigo_gerencia));
  }, [departamentos, gerCodesSet, selectedEmpresaId]);

  const depCodesSet = useMemo(() => {
    return new Set(filteredDepartamentos.map((dep) => dep.codigo));
  }, [filteredDepartamentos]);

  const filteredEmpleados = useMemo(() => {
    if (selectedEmpresaId === 'ALL') return empleados;
    return empleados.filter((emp) => emp.codigo_departamento && depCodesSet.has(emp.codigo_departamento));
  }, [empleados, depCodesSet, selectedEmpresaId]);

  const filteredOrganigramaRows = useMemo(() => {
    if (selectedEmpresaId === 'ALL') return organigramaRows;
    return organigramaRows.filter((row) => row.empresa_id === selectedEmpresaId);
  }, [organigramaRows, selectedEmpresaId]);

  // Manejadores de expansión interactiva
  const toggleDir = (id: number) => {
    setExpandedDirs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleGer = (id: number) => {
    setExpandedGers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleDep = (id: number) => {
    setExpandedDeps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandirTodo = () => {
    const allDirs: Record<number, boolean> = {};
    filteredDirecciones.forEach((d) => { allDirs[d.direccion_id] = true; });
    setExpandedDirs(allDirs);

    const allGers: Record<number, boolean> = {};
    filteredGerencias.forEach((g) => { allGers[g.gerencia_id] = true; });
    setExpandedGers(allGers);

    const allDeps: Record<number, boolean> = {};
    filteredDepartamentos.forEach((dep) => { allDeps[dep.departamento_id] = true; });
    setExpandedDeps(allDeps);
  };

  const contraerTodo = () => {
    setExpandedDirs({});
    setExpandedGers({});
    setExpandedDeps({});
  };

  // Auto-expandir el primer nodo de la empresa cuando se cambia el filtro
  useEffect(() => {
    if (filteredDirecciones.length > 0) {
      const firstDir = filteredDirecciones[0];
      setExpandedDirs({ [firstDir.direccion_id]: true });
      const firstGer = filteredGerencias.find((g) => g.codigo_direccion === firstDir.codigo);
      if (firstGer) {
        setExpandedGers({ [firstGer.gerencia_id]: true });
        const firstDep = filteredDepartamentos.find((d) => d.codigo_gerencia === firstGer.codigo);
        if (firstDep) {
          setExpandedDeps({ [firstDep.departamento_id]: true });
        }
      }
    }
  }, [selectedEmpresaId]);

  const selectedEmpresaObj = useMemo(() => {
    if (selectedEmpresaId === 'ALL') return null;
    return empresas.find((e) => e.empresa_id === selectedEmpresaId) || null;
  }, [empresas, selectedEmpresaId]);

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
            Estructura jerárquica multinivel segmentada por filiales y explorador recursivo de líneas de mando.
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1">
          <button
            onClick={() => setActiveSubTab('arbol')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
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
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
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
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
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

      {/* FILTRO PRINCIPAL POR EMPRESA (MULTI-EMPRESA CONTROL) */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800/90 shadow-lg bg-slate-950/60 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Pills Selector de Filial */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mr-1">
              <Building className="w-4 h-4 text-brand-400" />
              Filial:
            </span>

            {/* Todas las Empresas */}
            <button
              onClick={() => setSelectedEmpresaId('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedEmpresaId === 'ALL'
                  ? 'bg-brand-600 text-white shadow-glow ring-2 ring-brand-400'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <span>Todas las Empresas</span>
              <span className="px-1.5 py-0.5 bg-slate-950/50 rounded-md text-[10px] font-mono text-slate-300">
                {direcciones.length} Dirs
              </span>
            </button>

            {/* Empresas individuales (PB, LP, PK) */}
            {empresas.map((emp) => {
              const isSelected = selectedEmpresaId === emp.empresa_id;
              const empCode = emp.nombre_corto || emp.codigo;
              const style = getCompanyStyle(empCode);
              const countDirs = direcciones.filter((d) => d.empresa_id === emp.empresa_id).length;

              return (
                <button
                  key={emp.empresa_id}
                  onClick={() => setSelectedEmpresaId(emp.empresa_id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? style.pillActive
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:text-white'
                  }`}
                >
                  <span className="font-mono px-1.5 py-0.5 rounded bg-black/30 text-[10px]">
                    {empCode}
                  </span>
                  <span className="truncate max-w-[160px] sm:max-w-[220px]">
                    {emp.razon_social}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${isSelected ? 'bg-black/30 text-white' : 'bg-slate-950/60 text-slate-400'}`}>
                    {countDirs} {countDirs === 1 ? 'Dir' : 'Dirs'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Metrics Bar for Selected Scope */}
          <div className="flex items-center gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800/80 text-xs text-slate-400">
            <span className="font-medium text-slate-300">Alcance visual:</span>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300 font-bold font-mono">
                {filteredDirecciones.length} Dirs
              </span>
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold font-mono">
                {filteredGerencias.length} Gers
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-bold font-mono">
                {filteredDepartamentos.length} Deptos
              </span>
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-bold font-mono">
                {filteredEmpleados.length} Emps
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW 1: ARBOL VISUAL INTERACTIVO */}
      {activeSubTab === 'arbol' && (
        <div className="glass-card rounded-2xl p-6 shadow-xl space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-400" />
                <span>Jerarquía de Unidades y Personal Adscrito</span>
                {selectedEmpresaObj ? (
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-brand-500/10 border border-brand-500/20 text-brand-300">
                    {selectedEmpresaObj.nombre_corto || selectedEmpresaObj.codigo} — {selectedEmpresaObj.razon_social}
                  </span>
                ) : (
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Todas las Empresas
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Haz clic en cada nivel para expandir o contraer sus ramas
              </p>
            </div>

            {/* Expand / Collapse All Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={expandirTodo}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Expandir todas las ramas visibles"
              >
                <ChevronDown className="w-3.5 h-3.5 text-brand-400" />
                <span>Expandir Todo</span>
              </button>
              <button
                onClick={contraerTodo}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Contraer todas las ramas visibles"
              >
                <ChevronRight className="w-3.5 h-3.5 text-brand-400" />
                <span>Contraer Todo</span>
              </button>
            </div>
          </div>

          {/* Empty state when no directions found */}
          {filteredDirecciones.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Building2 className="w-12 h-12 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-300">No hay direcciones registradas para esta empresa</p>
              <p className="text-xs text-slate-500">Crea direcciones asignadas a esta filial desde el módulo de Direcciones.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDirecciones.map((dir) => {
                const isDirOpen = !!expandedDirs[dir.direccion_id];
                const childGerencias = gerencias.filter((g) => g.codigo_direccion === dir.codigo);
                const dirDirector = empleados.find((e) => e.empleado_id === dir.director_id);
                const emp = getEmpresaForDireccion(dir.codigo);
                const empStyle = getCompanyStyle(emp?.nombre_corto);

                return (
                  <div
                    key={dir.direccion_id}
                    className={`rounded-2xl border ${empStyle.cardBorder} bg-slate-900/80 overflow-hidden shadow-lg transition-all`}
                  >
                    {/* Nivel 1 Header */}
                    <div
                      onClick={() => toggleDir(dir.direccion_id)}
                      className={`p-4 bg-gradient-to-r ${empStyle.gradient} flex items-center justify-between cursor-pointer hover:brightness-110 transition-all`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1 rounded-lg bg-black/40 text-slate-200">
                          {isDirOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                        <Building2 className={`w-5 h-5 ${empStyle.accent}`} />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Empresa Badge */}
                            {emp && (
                              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${empStyle.badge}`}>
                                {emp.nombre_corto || emp.codigo}
                              </span>
                            )}
                            <span className="text-xs font-mono font-bold text-slate-200 bg-black/40 px-2 py-0.5 rounded border border-white/10">
                              {dir.codigo}
                            </span>
                            <span className="text-sm font-bold text-white">{dir.nombre}</span>
                          </div>
                          {dirDirector ? (
                            <p className="text-xs text-slate-400 mt-0.5">
                              Director General: <strong className="text-slate-200">{dirDirector.nombres} {dirDirector.apellidos}</strong>
                            </p>
                          ) : (
                            <p className="text-xs text-slate-500 italic mt-0.5">Sin director asignado</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-slate-300 bg-black/40 px-2.5 py-1 rounded-full border border-white/10">
                          {childGerencias.length} {childGerencias.length === 1 ? 'Gerencia' : 'Gerencias'}
                        </span>
                        <div className="text-xs font-semibold text-purple-300 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20 hidden sm:block">
                          Nivel 1 (Dirección)
                        </div>
                      </div>
                    </div>

                    {/* Nivel 2: Gerencias */}
                    {isDirOpen && (
                      <div className="p-4 pl-6 sm:pl-10 border-t border-slate-800 bg-slate-950/40 space-y-4">
                        {childGerencias.length > 0 ? (
                          childGerencias.map((ger) => {
                            const isGerOpen = !!expandedGers[ger.gerencia_id];
                            const childDeptos = departamentos.filter((d) => d.codigo_gerencia === ger.codigo);
                            const gerente = empleados.find((e) => e.empleado_id === ger.gerente_id);

                            return (
                              <div
                                key={ger.gerencia_id}
                                className="rounded-xl border border-indigo-500/30 bg-slate-900/90 overflow-hidden shadow-sm"
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
                                      {gerente ? (
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                          Gerente: <strong className="text-indigo-200">{gerente.nombres} {gerente.apellidos}</strong>
                                        </p>
                                      ) : (
                                        <p className="text-[11px] text-slate-500 italic mt-0.5">Sin gerente asignado</p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded-full border border-slate-800">
                                      {childDeptos.length} {childDeptos.length === 1 ? 'Depto' : 'Deptos'}
                                    </span>
                                    <div className="text-[10px] font-semibold text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                                      Nivel 2 (Gerencia)
                                    </div>
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
                                                  {jefe ? (
                                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                                      Jefe Depto: <strong className="text-emerald-200">{jefe.nombres} {jefe.apellidos}</strong>
                                                    </p>
                                                  ) : (
                                                    <p className="text-[10px] text-slate-500 italic mt-0.5">Sin jefe asignado</p>
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
                                                  <p className="text-xs text-slate-400 italic">No hay empleados adscritos a este departamento actualmente.</p>
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
          )}
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
              <span className="text-xs font-semibold text-slate-300 shrink-0">Supervisor:</span>
              <select
                value={selectedSupervisorId}
                onChange={(e) => setSelectedSupervisorId(Number(e.target.value))}
                className="bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-brand-500 font-medium max-w-[320px] truncate"
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                Correlación Total: Vista `vw_organigrama_completo`
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Correlación de cada empleado con toda su línea de mando (Filial, Dirección, Gerencia, Depto, Supervisor y Evaluador).
              </p>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Registros en vista: <strong className="text-brand-300">{filteredOrganigramaRows.length}</strong>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-200">
              <thead className="bg-slate-900 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="px-3.5 py-3">Filial</th>
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
                {filteredOrganigramaRows.map((row) => {
                  const empCode = row.empresa_nombre_corto;
                  const empStyle = getCompanyStyle(empCode);

                  return (
                    <tr key={row.empleado_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-3.5 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${empStyle.badge}`}>
                          {empCode || 'S/F'}
                        </span>
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="font-bold text-slate-100">{row.nombre_completo_empleado}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{row.codigo_empleado}</div>
                      </td>
                      <td className="px-3.5 py-3 font-medium text-slate-200">
                        {row.cargo_nombre}
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="text-purple-300 font-semibold">{row.direccion_nombre || <em className="text-slate-500 font-normal">Sin dirección</em>}</div>
                        <div className="text-[10px] text-indigo-300">{row.gerencia_nombre || <em className="text-slate-500">Sin gerencia</em>}</div>
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="text-emerald-300 font-semibold">{row.departamento_nombre || <em className="text-slate-500 font-normal">Sin depto</em>}</div>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
