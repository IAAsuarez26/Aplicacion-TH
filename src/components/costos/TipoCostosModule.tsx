import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Coins,
  FileSpreadsheet,
  CheckCircle2,
  Tag,
  Info,
  TrendingUp,
  Filter,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import { tipoCostosApi } from '../../lib/insforge';
import type { TipoCosto } from '../../lib/types';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EstadoBooleanBadge } from '../common/Badge';
import { useToast } from '../common/Toast';

export const TipoCostosModule: React.FC = () => {
  const toast = useToast();
  const [tiposCostos, setTiposCostos] = useState<TipoCosto[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [selectedTcFilter, setSelectedTcFilter] = useState<string | 'ALL'>('ALL');
  const [selectedEstadoFilter, setSelectedEstadoFilter] = useState<string | 'ALL'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedTipoCosto, setSelectedTipoCosto] = useState<TipoCosto | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [codigoTc, setCodigoTc] = useState('');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [activo, setActivo] = useState(true);

  // Delete Dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingTipo, setDeletingTipo] = useState<TipoCosto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await tipoCostosApi.getAll();
      if (error) toast.error('Error al cargar tipos de costos');
      setTiposCostos(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedTipoCosto(null);
    const nextNum = (tiposCostos.length + 1).toString().padStart(2, '0');
    setCodigoTc(nextNum);
    setNombre('');
    setDescripcion('');
    setActivo(true);
    setIsModalOpen(true);
  };

  const openEditModal = (item: TipoCosto) => {
    setModalMode('edit');
    setSelectedTipoCosto(item);
    setCodigoTc(item.codigo_tc);
    setNombre(item.nombre);
    setDescripcion(item.descripcion || '');
    setActivo(item.activo);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoTc.trim() || !nombre.trim()) {
      toast.error('El código y el nombre del tipo de costo son obligatorios');
      return;
    }

    setSaving(true);
    try {
      if (modalMode === 'create') {
        const { data, error } = await tipoCostosApi.create({
          codigo_tc: codigoTc.trim(),
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          activo,
        });

        if (error) {
          toast.error(error.message || 'Error al registrar el tipo de costo');
        } else {
          toast.success('Tipo de costo registrado exitosamente');
          setIsModalOpen(false);
          loadData();
        }
      } else if (selectedTipoCosto) {
        const { data, error } = await tipoCostosApi.update(selectedTipoCosto.tipo_costo_id, {
          codigo_tc: codigoTc.trim(),
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          activo,
        });

        if (error) {
          toast.error(error.message || 'Error al actualizar el tipo de costo');
        } else {
          toast.success('Tipo de costo actualizado correctamente');
          setIsModalOpen(false);
          loadData();
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (item: TipoCosto) => {
    setDeletingTipo(item);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingTipo) return;
    setDeleting(true);
    try {
      const { success, error } = await tipoCostosApi.delete(deletingTipo.tipo_costo_id);
      if (success) {
        toast.success(`Tipo de costo "${deletingTipo.nombre}" eliminado`);
        setIsDeleteDialogOpen(false);
        setDeletingTipo(null);
        loadData();
      } else {
        toast.error(
          error?.message?.includes('violates foreign key')
            ? 'No se puede eliminar este tipo de costo porque tiene colaboradores asociados.'
            : error?.message || 'Error al eliminar el tipo de costo'
        );
      }
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<TipoCosto>[] = [
    {
      key: 'codigo_tc',
      header: 'Código TC',
      sortable: true,
      render: (item) => (
        <span className="font-mono font-bold text-amber-300 text-xs px-2.5 py-1 rounded-lg bg-amber-950/40 border border-amber-800/60 shadow-sm">
          {item.codigo_tc}
        </span>
      ),
    },
    {
      key: 'nombre',
      header: 'Nombre / Tipo',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
            {item.nombre.slice(0, 3).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-slate-100">{item.nombre}</div>
            <div className="text-xs text-slate-400">Categoría de Mano de Obra / Gastos</div>
          </div>
        </div>
      ),
    },
    {
      key: 'descripcion',
      header: 'Descripción Detallada',
      sortable: true,
      render: (item) => (
        <span className="text-xs text-slate-300 font-medium">
          {item.descripcion || '—'}
        </span>
      ),
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
            title="Editar Tipo de Costo"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => openDeleteDialog(item)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
            title="Eliminar Tipo de Costo"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const hasActiveFilters =
    selectedTcFilter !== 'ALL' ||
    selectedEstadoFilter !== 'ALL';

  const activeFiltersCount = [
    selectedTcFilter !== 'ALL',
    selectedEstadoFilter !== 'ALL',
  ].filter(Boolean).length;

  const resetAllFilters = () => {
    setSelectedTcFilter('ALL');
    setSelectedEstadoFilter('ALL');
  };

  const filteredTiposCostos = tiposCostos.filter((tc) => {
    if (selectedTcFilter !== 'ALL' && tc.codigo_tc !== selectedTcFilter) return false;
    if (selectedEstadoFilter !== 'ALL') {
      const isActivo = selectedEstadoFilter === 'ACTIVO';
      if (tc.activo !== isActivo) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 p-0.5 shadow-glow flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Coins className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Tipos de Costos</h1>
              <p className="text-xs text-slate-400">
                Catálogo maestro de clasificación de costos de nómina (Nómina Galac / Nómina TH)
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold text-sm shadow-glow flex items-center justify-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Tipo de Costo</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Tipos</span>
            <Tag className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{tiposCostos.length}</div>
          <span className="text-[11px] text-amber-400 mt-1 block">MOD, MOI, Gastos</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tipos Activos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {tiposCostos.filter((t) => t.activo).length}
          </div>
          <span className="text-[11px] text-emerald-400 mt-1 block">Disponibles para asignación</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Origen</span>
            <FileSpreadsheet className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-sm font-bold text-white mt-2">TiposdeCostos.xlsx</div>
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
          {/* 1. Tipos de Costo */}
          <div className="relative min-w-[190px] flex-1 sm:flex-initial">
            <select
              value={selectedTcFilter}
              onChange={(e) => setSelectedTcFilter(e.target.value)}
              className={`w-full pl-3 pr-7 py-2 bg-slate-950/80 border rounded-xl text-xs transition-all appearance-none cursor-pointer focus:outline-none truncate ${
                selectedTcFilter !== 'ALL'
                  ? 'border-amber-500/80 bg-amber-500/10 text-amber-300 font-semibold ring-1 ring-amber-500/30'
                  : 'border-slate-800/90 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60 font-medium'
              }`}
              title="Filtrar por Tipo de Costo"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">Tipos de Costos</option>
              {[...tiposCostos]
                .sort((a, b) => a.codigo_tc.localeCompare(b.codigo_tc))
                .map((tc) => (
                  <option key={tc.codigo_tc} value={tc.codigo_tc} className="bg-slate-900 text-slate-200">
                    {tc.nombre} ({tc.codigo_tc})
                  </option>
                ))}
            </select>
            <ChevronDown className={`w-3.5 h-3.5 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors ${
              selectedTcFilter !== 'ALL' ? 'text-amber-400' : 'text-slate-500'
            }`} />
          </div>

          {/* 2. Estados */}
          <div className="relative min-w-[140px] flex-1 sm:flex-initial">
            <select
              value={selectedEstadoFilter}
              onChange={(e) => setSelectedEstadoFilter(e.target.value)}
              className={`w-full pl-3 pr-7 py-2 bg-slate-950/80 border rounded-xl text-xs transition-all appearance-none cursor-pointer focus:outline-none truncate ${
                selectedEstadoFilter !== 'ALL'
                  ? 'border-emerald-500/80 bg-emerald-500/10 text-emerald-300 font-semibold ring-1 ring-emerald-500/30'
                  : 'border-slate-800/90 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60 font-medium'
              }`}
              title="Filtrar por Estado"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">Estados</option>
              <option value="ACTIVO" className="bg-slate-900 text-slate-200">Activos</option>
              <option value="INACTIVO" className="bg-slate-900 text-slate-200">Inactivos</option>
            </select>
            <ChevronDown className={`w-3.5 h-3.5 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors ${
              selectedEstadoFilter !== 'ALL' ? 'text-emerald-400' : 'text-slate-500'
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
        data={filteredTiposCostos}
        columns={columns}
        loading={loading}
        searchKeys={['codigo_tc', 'nombre', 'descripcion']}
        searchPlaceholder="Buscar por código, nombre o descripción..."
        exportFilename="tipos_de_costos"
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Registrar Tipo de Costo' : 'Editar Tipo de Costo'}
        subtitle="Estructura de costos de personal"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Código TC *
              </label>
              <input
                type="text"
                required
                value={codigoTc}
                onChange={(e) => setCodigoTc(e.target.value)}
                placeholder="Ej. 01"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nombre Corto *
              </label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. MOD, MOI, Gastos"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Descripción Detallada
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej. Mano de Obra Directa"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
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
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                <span className="ml-3 text-xs font-medium text-slate-300">
                  {activo ? 'Activo' : 'Inactivo'}
                </span>
              </label>
            </div>
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
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-sm font-semibold shadow-glow transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>{modalMode === 'create' ? 'Guardar Tipo de Costo' : 'Actualizar Cambios'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Tipo de Costo"
        message={`¿Estás seguro de que deseas eliminar el tipo de costo "${deletingTipo?.nombre}" (${deletingTipo?.codigo_tc})?`}
        loading={deleting}
        confirmText="Eliminar"
      />
    </div>
  );
};
