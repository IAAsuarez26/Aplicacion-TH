import React, { useState, useEffect } from 'react';
import {
  Users,
  Building2,
  GitFork,
  Network,
  Briefcase,
  AlertTriangle,
  UserPlus,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { dashboardApi, empleadosApi, organigramaApi } from '../../lib/insforge';
import type { DashboardMetrics, OrganigramaRow, ResumenResponsable } from '../../lib/types';
import { EstadoLaboralBadge } from '../common/Badge';
import { NavigationTab } from '../layout/Sidebar';

interface DashboardViewProps {
  onNavigate: (tab: NavigationTab) => void;
  onOpenNewEmployee: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenNewEmployee,
}) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [organigrama, setOrganigrama] = useState<OrganigramaRow[]>([]);
  const [responsables, setResponsables] = useState<ResumenResponsable[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [m, { data: org }, { data: resp }] = await Promise.all([
          dashboardApi.getMetrics(),
          organigramaApi.getOrganigramaCompleto(),
          organigramaApi.getResumenResponsables(),
        ]);
        setMetrics(m);
        setOrganigrama(org || []);
        setResponsables(resp || []);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const statCards = [
    {
      label: 'Colaboradores Totales',
      value: metrics?.totalEmpleados ?? 0,
      subvalue: `${metrics?.empleadosActivos ?? 0} Activos en nómina`,
      icon: Users,
      color: 'from-blue-600 to-indigo-600',
      badge: '+100%',
      tab: 'empleados' as NavigationTab,
    },
    {
      label: 'Direcciones (Nivel 1)',
      value: metrics?.totalDirecciones ?? 0,
      subvalue: 'Unidades Estratégicas',
      icon: Building2,
      color: 'from-purple-600 to-pink-600',
      tab: 'direcciones' as NavigationTab,
    },
    {
      label: 'Gerencias de Área (Nivel 2)',
      value: metrics?.totalGerencias ?? 0,
      subvalue: 'Unidades Tácticas',
      icon: GitFork,
      color: 'from-indigo-600 to-cyan-600',
      tab: 'gerencias' as NavigationTab,
    },
    {
      label: 'Departamentos (Nivel 3)',
      value: metrics?.totalDepartamentos ?? 0,
      subvalue: 'Unidades Operativas',
      icon: Network,
      color: 'from-emerald-600 to-teal-600',
      tab: 'departamentos' as NavigationTab,
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner / Welcome card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-900/80 via-indigo-950/60 to-slate-900 border border-brand-500/20 p-6 md:p-8 shadow-glow">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Base de Datos PostgreSQL Conectada con InsForge</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Estructura Organizacional & Talento Humano
            </h2>
            <p className="text-slate-300 text-sm mt-2 leading-relaxed">
              Monitoreo integral de los 3 niveles jerárquicos, catálogo de cargos, supervisores directos y evaluadores asignados.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenNewEmployee}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-glow transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Nuevo Empleado</span>
            </button>
            <button
              onClick={() => onNavigate('organigrama')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-medium transition-colors"
            >
              <Network className="w-4 h-4 text-brand-400" />
              <span>Ver Organigrama</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              onClick={() => onNavigate(stat.tab)}
              className="glass-card glass-card-hover rounded-2xl p-5 cursor-pointer relative overflow-hidden group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <h3 className="text-3xl font-black text-white mt-1.5 tracking-tight">
                    {loading ? '...' : stat.value}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-medium">
                    {stat.subvalue}
                  </p>
                </div>

                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${stat.color} p-0.5 shadow-md group-hover:scale-110 transition-transform`}
                >
                  <div className="w-full h-full bg-slate-900/80 rounded-[14px] flex items-center justify-center text-white">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-brand-400 font-medium">
                <span>Explorar registros</span>
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Column Layout: Responsables & Personnel Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Resumen de Responsables por Área (Live View) */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Líderes y Responsables de Área
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Datos sincronizados desde la vista <code className="text-slate-300 font-mono">vw_resumen_responsables_area</code>
              </p>
            </div>
            <button
              onClick={() => onNavigate('responsables')}
              className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1"
            >
              <span>Ver todos</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="px-3 py-2.5 rounded-l-lg">Nivel</th>
                  <th className="px-3 py-2.5">Unidad</th>
                  <th className="px-3 py-2.5">Líder Asignado</th>
                  <th className="px-3 py-2.5 text-right rounded-r-lg">Plantilla Activa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {responsables.slice(0, 6).map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-3 py-3 font-semibold">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          item.tipo_unidad === 'DIRECCIÓN'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : item.tipo_unidad === 'GERENCIA'
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {item.tipo_unidad}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-200">
                      <div>{item.unidad_nombre}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.unidad_codigo}</div>
                    </td>
                    <td className="px-3 py-3">
                      {item.responsable_nombre ? (
                        <div>
                          <div className="font-semibold text-slate-200">{item.responsable_nombre}</div>
                          <div className="text-[10px] text-slate-400">{item.responsable_cargo || item.responsable_email}</div>
                        </div>
                      ) : (
                        <span className="text-amber-400/80 italic font-normal">Sin asignar</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-slate-100">
                      <span className="inline-flex items-center justify-center px-2 py-1 rounded-lg bg-slate-800 text-slate-200">
                        {item.total_empleados_activos}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Quick Links & Summary */}
        <div className="glass-card rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
              <Briefcase className="w-5 h-5 text-indigo-400" />
              Accesos a Módulos CRUD
            </h3>
            <p className="text-xs text-slate-400 mt-2">
              Gestión directa sobre las tablas maestras de la base de datos:
            </p>

            <div className="mt-4 space-y-2">
              {[
                { label: 'Empleados & Ficha Personal', tab: 'empleados' as NavigationTab, count: metrics?.totalEmpleados },
                { label: 'Catálogo de Cargos', tab: 'cargos' as NavigationTab, count: metrics?.totalCargos },
                { label: 'Direcciones (Nivel 1)', tab: 'direcciones' as NavigationTab, count: metrics?.totalDirecciones },
                { label: 'Gerencias (Nivel 2)', tab: 'gerencias' as NavigationTab, count: metrics?.totalGerencias },
                { label: 'Departamentos (Nivel 3)', tab: 'departamentos' as NavigationTab, count: metrics?.totalDepartamentos },
                { label: 'Historial de Traslados', tab: 'historial' as NavigationTab },
              ].map((link, idx) => (
                <button
                  key={idx}
                  onClick={() => onNavigate(link.tab)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 transition-colors group"
                >
                  <span className="group-hover:text-brand-300 transition-colors">{link.label}</span>
                  <div className="flex items-center gap-2">
                    {link.count !== undefined && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                        {link.count}
                      </span>
                    )}
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-brand-400 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-tr from-brand-950/60 to-indigo-950/40 border border-brand-500/20">
            <div className="flex items-center gap-2 text-xs font-semibold text-brand-300 mb-1">
              <Sparkles className="w-4 h-4 text-brand-400" />
              <span>Línea Jerárquica</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Consulta en tiempo real la función recursiva <code className="text-brand-200">sp_obtener_subordinados</code> desde el módulo de Organigrama.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
