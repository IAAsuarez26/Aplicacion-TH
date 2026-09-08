import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  PieChart,
  FileSpreadsheet,
  CheckCircle2,
  Tag,
  Building2,
  Layers,
  Filter,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import { centrosCostosApi, departamentosApi } from '../../lib/insforge';
import type { CentroCosto, Departamento } from '../../lib/types';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EstadoBooleanBadge } from '../common/Badge';
import { useToast } from '../common/Toast';

export const CentrosCostosModule: React.FC = () => {
  const toast = useToast();
  const [centrosCostos, setCentrosCostos] = useState<CentroCosto[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [selectedCcFilter, setSelectedCcFilter] = useState<string | 'ALL'>('ALL');
  const [selectedDeptoFilter, setSelectedDeptoFilter] = useState<string | 'ALL'>('ALL');
  const [selectedEstadoFilter, setSelectedEstadoFilter] = useState<string | 'ALL'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedCentroCosto, setSelectedCentroCosto] = useState<CentroCosto | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [codigoCc, setCodigoCc] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [activo, setActivo] = useState(true);

  // Delete Dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingCentro, setDeletingCentro] = useState<CentroCosto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        { data: ccData, error: ccErr },
        { data: depData },
      ] = await Promise.all([
        centrosCostosApi.getAll(),
        departamentosApi.getAll(),
      ]);

      if (ccErr) toast.error('Error al cargar centros de costos');
      setCentrosCostos(ccData || []);
      setDepartamentos(depData || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedCentroCosto(null);
    let maxNum = 0;
    for (const c of centrosCostos) {
      const n = parseInt(c.codigo_cc, 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
    const nextNum = (maxNum > 0 ? maxNum + 1 : centrosCostos.length + 1).toString().padStart(2, '0');
    setCodigoCc(nextNum);
    setDescripcion(`Centro Costo #${maxNum > 0 ? maxNum + 1 : centrosCostos.length + 1}`);
    setActivo(true);
    setIsModalOpen(true);
  };

  const openEditModal = (item: CentroCosto) => {
    setModalMode('edit');
    setSelectedCentroCosto(item);
    setCodigoCc(item.codigo_cc);
    setDescripcion(item.descripcion);
    setActivo(item.activo);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoCc.trim() || !descripcion.trim()) {
      toast.error('El código y la descripción del centro de costo son obligatorios');
      return;
    }

    setSaving(true);
    try {
      if (modalMode === 'create') {
        const { data, error } = await centrosCostosApi.create({
          codigo_cc: codigoCc.trim(),
          descripcion: descripcion.trim(),
          activo,
        });

        if (error) {
          toast.error(error.message || 'Error al registrar el centro de costo');
        } else {
          toast.success('Centro de costo registrado exitosamente');
          setIsModalOpen(false);
          loadData();
        }
      } else if (selectedCentroCosto) {
        const { data, error } = await centrosCostosApi.update(selectedCentroCosto.centro_costo_id, {
          codigo_cc: codigoCc.trim(),
          descripcion: descripcion.trim(),
          activo,
        });

        if (error) {
          toast.error(error.message || 'Error al actualizar el centro de costo');
        } else {
          toast.success('Centro de costo actualizado correctamente');
          setIsModalOpen(false);
          loadData();
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (item: CentroCosto) => {
    setDeletingCentro(item);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingCentro) return;
    setDeleting(true);
    try {
      const { success, error } = await centrosCostosApi.delete(deletingCentro.centro_costo_id);
      if (success) {
        toast.success(`Centro de costo "${deletingCentro.descripcion}" eliminado`);
        setIsDeleteDialogOpen(false);
        setDeletingCentro(null);
        loadData();
      } else {
        toast.error(
          error?.message?.includes('violates foreign key')
            ? 'No se puede eliminar este centro de costo porque tiene departamentos asociados.'
            : error?.message || 'Error al eliminar el centro de costo'
        );
      }
    } finally {
      setDeleting(false);
    }
  };

  const getDepartamentosLinked = (codigo_cc: string) => {
    return departamentos.filter((d) => d.codigo_cc === codigo_cc);
  };

  const columns: Column<CentroCosto>[] = [
    {
      key: 'codigo_cc',
      header: 'Código CC',
      sortable: true,
      render: (item) => (
        <span className="font-mono font-bold text-cyan-300 text-xs px-2.5 py-1 rounded-lg bg-cyan-950/40 border border-cyan-800/60 shadow-sm">
          {item.codigo_cc}
        </span>
      ),
    },
    {
      key: 'descripcion',
      header: 'Descripción / Nombre',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
            {item.codigo_cc}
          </div>
          <div>
            <div className="font-semibold text-slate-100">{item.descripcion}</div>
            <div className="text-xs text-slate-400">Unidad de Imputación Contable</div>
          </div>
        </div>
      ),
    },
    {
      key: 'departamentos_count' as any,
      header: 'Departamentos Vinculados',
      render: (item) => {
        const linked = getDepartamentosLinked(item.codigo_cc);
        return (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-200">
              {linked.length} deptos
            </span>
            {linked.length > 0 && (
              <span className="text-xs text-slate-400 truncate max-w-xs">
                {linked.map((d) => d.nombre).slice(0, 2).join(', ')}
                {linked.length > 2 ? '...' : ''}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'activo',
      header: 'Estado',
      sortable: true,
      render: (item) => <EstadoBooleanBadge activo={item.activo} />,
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => openEditModal(item)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
            title="Editar Centro de Costo"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => openDeleteDialog(item)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
            title="Eliminar Centro de Costo"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const hasActiveFilters =
    selectedCcFilter !== 'ALL' ||
    selectedDeptoFilter !== 'ALL' ||
    selectedEstadoFilter !== 'ALL';

  const activeFiltersCount = [
    selectedCcFilter !== 'ALL',
    selectedDeptoFilter !== 'ALL',
    selectedEstadoFilter !== 'ALL',
  ].filter(Boolean).length;

  const resetAllFilters = () => {
    setSelectedCcFilter('ALL');
    setSelectedDeptoFilter('ALL');
    setSelectedEstadoFilter('ALL');
  };

  const filteredCentrosCostos = centrosCostos.filter((cc) => {
    if (selectedCcFilter !== 'ALL' && cc.codigo_cc !== selectedCcFilter) return false;
    if (selectedDeptoFilter !== 'ALL') {
      const dep = departamentos.find((d) => d.codigo === selectedDeptoFilter);
      if (dep?.codigo_cc !== cc.codigo_cc) return false;
    }
    if (selectedEstadoFilter !== 'ALL') {
      const isActivo = selectedEstadoFilter === 'ACTIVO';
      if (cc.activo !== isActivo) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 p-0.5 shadow-glow flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <PieChart className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Centros de Costos</h1>
              <p className="text-xs text-slate-400">
                Catálogo de centros de imputación financiera asignados a Departamentos (Nivel 3)
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-sm shadow-glow flex items-center justify-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Centro de Costo</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Centros</span>
            <Tag className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{centrosCostos.length}</div>
          <span className="text-[11px] text-cyan-400 mt-1 block">Códigos 01 a 15</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Centros Activos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {centrosCostos.filter((c) => c.activo).length}
          </div>
          <span className="text-[11px] text-emerald-400 mt-1 block">Disponibles para departamentos</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Origen</span>
            <FileSpreadsheet className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-sm font-bold text-white mt-2">Centros de Costos.xlsx</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Sincronizado con Nómina Galac</span>
        </div>
      </div>

      {/* Filter Component */}
      <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-xl shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20">
            <Filter className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Filtros
          </span>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-400 border border-brand-500/30 text-[10px] font-semibold">
              {activeFiltersCount} {activeFiltersCount === 1 ? 'activo' : 'activos'}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* 1. Centros de Costos */}
          <div className="relative min-w-[190px] flex-1 sm:flex-initial">
            <select
              value={selectedCcFilter}
              onChange={(e) => setSelectedCcFilter(e.target.value)}
              className={`w-full pl-3 pr-7 py-2 bg-slate-950/80 border rounded-xl text-xs transition-all appearance-none cursor-pointer focus:outline-none truncate ${
                selectedCcFilter !== 'ALL'
                  ? 'border-cyan-500/80 bg-cyan-500/10 text-cyan-300 font-semibold ring-1 ring-cyan-500/30'
                  : 'border-slate-800/90 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60 font-medium'
              }`}
              title="Filtrar por Centro de Costo"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">Centros de Costos</option>
              {[...centrosCostos]
                .sort((a, b) => a.codigo_cc.localeCompare(b.codigo_cc))
                .map((cc) => (
                  <option key={cc.codigo_cc} value={cc.codigo_cc} className="bg-slate-900 text-slate-200">
                    CC {cc.codigo_cc} - {cc.descripcion}
                  </option>
                ))}
            </select>
            <ChevronDown className={`w-3.5 h-3.5 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors ${
              selectedCcFilter !== 'ALL' ? 'text-cyan-400' : 'text-slate-500'
            }`} />
          </div>

          {/* 2. Departamentos */}
          <div className="relative min-w-[190px] flex-1 sm:flex-initial">
            <select
              value={selectedDeptoFilter}
              onChange={(e) => setSelectedDeptoFilter(e.target.value)}
              className={`w-full pl-3 pr-7 py-2 bg-slate-950/80 border rounded-xl text-xs transition-all appearance-none cursor-pointer focus:outline-none truncate ${
                selectedDeptoFilter !== 'ALL'
                  ? 'border-emerald-500/80 bg-emerald-500/10 text-emerald-300 font-semibold ring-1 ring-emerald-500/30'
                  : 'border-slate-800/90 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60 font-medium'
              }`}
              title="Filtrar por Departamento Vinculado"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">Departamentos</option>
              {[...departamentos]
                .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
                .map((d) => (
                  <option key={d.codigo} value={d.codigo} className="bg-slate-900 text-slate-200">
                    {d.nombre} ({d.codigo})
                  </option>
                ))}
            </select>
            <ChevronDown className={`w-3.5 h-3.5 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors ${
              selectedDeptoFilter !== 'ALL' ? 'text-emerald-400' : 'text-slate-500'
            }`} />
          </div>

          {/* 3. Estados */}
          <div className="relative min-w-[140px] flex-1 sm:flex-initial">
            <select
              value={selectedEstadoFilter}
              onChange={(e) => setSelectedEstadoFilter(e.target.value)}
              className={`w-full pl-3 pr-7 py-2 bg-slate-950/80 border rounded-xl text-xs transition-all appearance-none cursor-pointer focus:outline-none truncate ${
                selectedEstadoFilter !== 'ALL'
                  ? 'border-brand-500/80 bg-brand-500/10 text-brand-300 font-semibold ring-1 ring-brand-500/30'
                  : 'border-slate-800/90 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60 font-medium'
              }`}
              title="Filtrar por Estado"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">Estados</option>
              <option value="ACTIVO" className="bg-slate-900 text-slate-200">Activos</option>
              <option value="INACTIVO" className="bg-slate-900 text-slate-200">Inactivos</option>
            </select>
            <ChevronDown className={`w-3.5 h-3.5 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors ${
              selectedEstadoFilter !== 'ALL' ? 'text-brand-400' : 'text-slate-500'
            }`} />
          </div>

          {/* Limpiar Filtros */}
          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="px-2.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm cursor-pointer whitespace-nowrap"
              title="Restablecer todos los filtros"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpiar</span>
            </button>
          )}
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        data={filteredCentrosCostos}
        columns={columns}
        loading={loading}
        searchKeys={['codigo_cc', 'descripcion']}
        searchPlaceholder="Buscar por código o descripción..."
        exportFilename="centros_de_costos"
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Registrar Centro de Costo' : 'Editar Centro de Costo'}
        subtitle="Unidad de asignación para Departamentos"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Código CC *
              </label>
              <input
                type="text"
                required
                value={codigoCc}
                onChange={(e) => setCodigoCc(e.target.value)}
                placeholder="Ej. 01"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Estado
              </label>
              <div className="flex items-center gap-3 pt-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activo}
                    onChange={(e) => setActivo(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  <span className="ml-3 text-xs font-medium text-slate-300">
                    {activo ? 'Activo' : 'Inactivo'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Descripción / Nombre *
            </label>
            <input
              type="text"
              required
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej. Centro Costo #1"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-semibold shadow-glow transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>{modalMode === 'create' ? 'Guardar Centro de Costo' : 'Actualizar Cambios'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Centro de Costo"
        message={`¿Estás seguro de que deseas eliminar el centro de costo "${deletingCentro?.descripcion}" (${deletingCentro?.codigo_cc})?`}
        loading={deleting}
        confirmText="Eliminar"
      />
    </div>
  );
};
