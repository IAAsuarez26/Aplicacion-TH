import React, { useState, useEffect } from 'react';
import { ShieldCheck, Building2, GitFork, Network, Filter, Users, Mail, Briefcase } from 'lucide-react';
import { organigramaApi } from '../../lib/insforge';
import type { ResumenResponsable } from '../../lib/types';
import { DataTable, Column } from '../common/DataTable';
import { useToast } from '../common/Toast';

export const ResponsablesModule: React.FC = () => {
  const toast = useToast();
  const [responsables, setResponsables] = useState<ResumenResponsable[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoFilter, setTipoFilter] = useState<'ALL' | 'DIRECCIÓN' | 'GERENCIA' | 'DEPARTAMENTO'>('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await organigramaApi.getResumenResponsables();
      if (error) toast.error('No se pudo cargar el resumen de responsables');
      setResponsables(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredData = responsables.filter((item) => {
    if (tipoFilter === 'ALL') return true;
    return item.tipo_unidad === tipoFilter;
  });

  const columns: Column<ResumenResponsable>[] = [
    {
      key: 'tipo_unidad',
      header: 'Nivel Jerárquico',
      sortable: true,
      render: (item) => (
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
            item.tipo_unidad === 'DIRECCIÓN'
              ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
              : item.tipo_unidad === 'GERENCIA'
              ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
              : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
          }`}
        >
          {item.tipo_unidad}
        </span>
      ),
    },
    {
      key: 'unidad_codigo',
      header: 'Código',
      sortable: true,
      render: (item) => (
        <span className="font-mono font-bold text-xs text-slate-300 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
          {item.unidad_codigo}
        </span>
      ),
    },
    {
      key: 'unidad_nombre',
      header: 'Nombre de la Unidad',
      sortable: true,
      render: (item) => (
        <div className="font-semibold text-slate-100">{item.unidad_nombre}</div>
      ),
    },
    {
      key: 'responsable_nombre',
      header: 'Líder / Responsable Asignado',
      sortable: true,
      render: (item) => {
        return item.responsable_nombre ? (
          <div>
            <div className="font-semibold text-slate-200">{item.responsable_nombre}</div>
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              {item.responsable_cargo && <span>{item.responsable_cargo}</span>}
              {item.responsable_email && (
                <span className="text-[10px] text-slate-400">({item.responsable_email})</span>
              )}
            </div>
          </div>
        ) : (
          <span className="text-xs text-amber-400/80 italic font-medium">
            ⚠ Sin líder asignado
          </span>
        );
      },
    },
    {
      key: 'total_empleados_activos',
      header: 'Personal Activo',
      sortable: true,
      render: (item) => (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 text-slate-200 font-bold text-xs">
          <Users className="w-3.5 h-3.5 text-brand-400" />
          <span>{item.total_empleados_activos}</span>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            Inventario Consolidado de Responsables por Área
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Vista unificada generada en tiempo real por <code className="text-slate-300 font-mono">vw_resumen_responsables_area</code>.
          </p>
        </div>
      </div>

      {/* Filter Component */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="text-xs text-slate-400 font-medium">Filtrar por Nivel:</span>
        <select
          value={tipoFilter}
          onChange={(e) => setTipoFilter(e.target.value as any)}
          className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-brand-500"
        >
          <option value="ALL">Todas las Unidades (Niveles 1, 2 y 3)</option>
          <option value="DIRECCIÓN">Solo Direcciones (Nivel 1)</option>
          <option value="GERENCIA">Solo Gerencias (Nivel 2)</option>
          <option value="DEPARTAMENTO">Solo Departamentos (Nivel 3)</option>
        </select>
      </div>

      {/* DataTable */}
      <DataTable
        data={filteredData}
        columns={columns}
        loading={loading}
        searchKeys={['unidad_codigo', 'unidad_nombre', 'responsable_nombre', 'responsable_cargo']}
        searchPlaceholder="Buscar por código, unidad, responsable o cargo..."
        exportFilename="resumen_responsables_area"
      />
    </div>
  );
};
