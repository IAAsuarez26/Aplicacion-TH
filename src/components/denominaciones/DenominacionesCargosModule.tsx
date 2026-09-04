import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Tag,
  Briefcase,
  CheckCircle2,
  XCircle,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { denominacionesCargosApi, cargosApi } from '../../lib/insforge';
import type { DenominacionCargo, Cargo } from '../../lib/types';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EstadoBooleanBadge } from '../common/Badge';
import { useToast } from '../common/Toast';

export const DenominacionesCargosModule: React.FC = () => {
  const toast = useToast();
  const [denominaciones, setDenominaciones] = useState<DenominacionCargo[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedItem, setSelectedItem] = useState<DenominacionCargo | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [codigoDc, setCodigoDc] = useState('');
  const [denominacion, setDenominacion] = useState('');
  const [activo, setActivo] = useState(true);

  // Delete Dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<DenominacionCargo | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filter State
  const [filtroEstado, setFiltroEstado] = useState<string>('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: dData, error: dErr }, { data: cData }] = await Promise.all([
        denominacionesCargosApi.getAll(),
        cargosApi.getAll(),
      ]);

      if (dErr) toast.error('No se pudieron cargar las denominaciones de cargos');
      setDenominaciones(dData || []);
      setCargos(cData || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getNextConsecutiveCode = (items: DenominacionCargo[]) => {
    let maxNum = 0;
    for (const item of items) {
      if (item.codigo_dc) {
        const match = item.codigo_dc.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    }
    const nextNum = maxNum > 0 ? maxNum + 1 : items.length + 1;
    return `DC-${String(nextNum).padStart(4, '0')}`;
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedItem(null);
    const nextCode = getNextConsecutiveCode(denominaciones);
    setCodigoDc(nextCode);
    setDenominacion('');
    setActivo(true);
    setIsModalOpen(true);
  };

  const openEditModal = (item: DenominacionCargo) => {
    setModalMode('edit');
    setSelectedItem(item);
    setCodigoDc(item.codigo_dc);
    setDenominacion(item.denominacion);
    setActivo(item.activo);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!denominacion.trim()) {
      toast.error('La denominación es obligatoria');
      return;
    }

    setSaving(true);
    try {
      if (modalMode === 'create') {
        const finalCode = codigoDc.trim() || getNextConsecutiveCode(denominaciones);
        const { error } = await denominacionesCargosApi.create({
          codigo_dc: finalCode,
          denominacion: denominacion.trim(),
          activo,
        });

        if (error) {
          toast.error(error.message || 'Error al crear la denominación');
        } else {
          toast.success(`Denominación ${finalCode} registrada exitosamente`);
          setIsModalOpen(false);
          loadData();
        }
      } else if (selectedItem) {
        const { error } = await denominacionesCargosApi.update(selectedItem.denominacion_cargo_id, {
          codigo_dc: codigoDc.trim(),
          denominacion: denominacion.trim(),
          activo,
        });

        if (error) {
          toast.error(error.message || 'Error al actualizar la denominación');
        } else {
          toast.success('Denominación actualizada correctamente');
          setIsModalOpen(false);
          loadData();
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (item: DenominacionCargo) => {
    setDeletingItem(item);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setDeleting(true);
    try {
      // Validar si tiene cargos asociados
      const asociados = cargos.filter((c) => c.codigo_dc === deletingItem.codigo_dc);
      if (asociados.length > 0) {
        toast.error(
          `No se puede eliminar: existen ${asociados.length} cargo(s) vinculados a esta denominación.`
        );
        setIsDeleteDialogOpen(false);
        setDeleting(false);
        return;
      }

      const { success, error } = await denominacionesCargosApi.delete(deletingItem.denominacion_cargo_id);
      if (success) {
        toast.success(`Denominación "${deletingItem.denominacion}" eliminada`);
        setIsDeleteDialogOpen(false);
        setDeletingItem(null);
        loadData();
      } else {
        toast.error(
          error?.message?.includes('foreign key')
            ? 'No se puede eliminar: tiene dependencias en otras tablas.'
            : error?.message || 'Error al eliminar la denominación'
        );
      }
    } finally {
      setDeleting(false);
    }
  };

  const getAssociatedCargosCount = (codigo: string) => {
    return cargos.filter((c) => c.codigo_dc === codigo).length;
  };

  const filteredData = denominaciones.filter((item) => {
    if (filtroEstado === 'ACTIVO' && !item.activo) return false;
    if (filtroEstado === 'INACTIVO' && item.activo) return false;
    return true;
  });

  const totalActivas = denominaciones.filter((d) => d.activo).length;
  const totalCargosClasificados = cargos.filter((c) => Boolean(c.codigo_dc)).length;

  const columns: Column<DenominacionCargo>[] = [
    {
      key: 'denominacion_cargo_id',
      header: 'ID',
      sortable: true,
      className: 'w-20',
      render: (item) => (
        <span className="font-mono text-xs text-slate-400 font-semibold px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
          #{item.denominacion_cargo_id}
        </span>
      ),
    },
    {
      key: 'codigo_dc',
      header: 'Código DC',
      sortable: true,
      className: 'w-32',
      render: (item) => (
        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-indigo-950/60 text-indigo-300 border border-indigo-800/50 shadow-sm inline-block">
          {item.codigo_dc}
        </span>
      ),
    },
    {
      key: 'denominacion',
      header: 'Denominación Homologada',
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-semibold text-slate-100 flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-indigo-400" />
            <span>{item.denominacion}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Clasificación corporativa para agrupación de puestos
          </div>
        </div>
      ),
    },
    {
      key: 'activo',
      header: 'Cargos Asociados',
      sortable: true,
      render: (item) => {
        const count = getAssociatedCargosCount(item.codigo_dc);
        return (
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${
              count > 0
                ? 'bg-slate-800/90 text-slate-200 border-slate-700'
                : 'bg-slate-900/40 text-slate-500 border-slate-800/60'
            }`}
          >
            <Briefcase className="w-3 h-3 text-indigo-400" />
            <span>{count}</span>
            <span className="text-[10px] text-slate-400 font-normal">
              {count === 1 ? 'cargo' : 'cargos'}
            </span>
          </span>
        );
      },
    },
    {
      key: 'activo',
      header: 'Estado',
      sortable: true,
      className: 'w-28',
      render: (item) => <EstadoBooleanBadge activo={item.activo} />,
    },
    {
      key: 'created_at',
      header: 'Acciones',
      className: 'text-right w-28',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => openEditModal(item)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            title="Editar denominación"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => openDeleteDialog(item)}
            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
            title="Eliminar denominación"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Tag className="w-6 h-6 text-indigo-400" />
            Catálogo Maestro de Denominaciones de Cargos
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Catálogo DC (Código_DC) para estandarización y agrupación homogénea de puestos laborales
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-brand-600 hover:from-indigo-500 hover:to-brand-500 text-white text-sm font-semibold shadow-glow transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Denominación</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Catálogo
            </span>
            <Tag className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{denominaciones.length}</p>
          <span className="text-[11px] text-slate-500">Denominaciones registradas</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Activas
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2">{totalActivas}</p>
          <span className="text-[11px] text-slate-500">Disponibles para cargos</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider">
              Cargos Vinculados
            </span>
            <Briefcase className="w-4 h-4 text-brand-400" />
          </div>
          <p className="text-2xl font-bold text-brand-400 mt-2">{totalCargosClasificados}</p>
          <span className="text-[11px] text-slate-500">De {cargos.length} cargos totales</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Sin Homologar
            </span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-2">
            {cargos.length - totalCargosClasificados}
          </p>
          <span className="text-[11px] text-slate-500">Cargos pendientes de DC</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold">Filtros de Catálogo:</span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="ACTIVO">Solo Activos</option>
            <option value="INACTIVO">Solo Inactivos</option>
          </select>
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        data={filteredData}
        columns={columns}
        loading={loading}
        searchKeys={['codigo_dc', 'denominacion']}
        searchPlaceholder="Buscar por código (DC-0001) o denominación (Analista)..."
        exportFilename="catalogo_denominaciones_cargos"
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Nueva Denominación de Cargo' : 'Editar Denominación'}
        subtitle="Catálogo Maestro DC (Denominaciones de Cargos)"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Código Denominación
              </div>
              <div className="text-base font-mono font-bold text-indigo-300 mt-0.5">
                {codigoDc}
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {modalMode === 'create' ? 'Autogenerado' : 'Asignado'}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Código DC *
            </label>
            <input
              type="text"
              required
              value={codigoDc}
              onChange={(e) => setCodigoDc(e.target.value.toUpperCase())}
              placeholder="Ej. DC-0018"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-indigo-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">Formato sugerido: DC-XXXX (ej. DC-0018).</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nombre de la Denominación *
            </label>
            <input
              type="text"
              required
              value={denominacion}
              onChange={(e) => setDenominacion(e.target.value)}
              placeholder="Ej. Consultor, Asesor Técnico, Especialista"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Estado Operativo
            </label>
            <div className="flex items-center gap-3 pt-1">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                <span className="ml-3 text-xs font-medium text-slate-300">
                  {activo ? 'Activo (Disponible)' : 'Inactivo (Deshabilitado)'}
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
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-brand-600 hover:from-indigo-500 hover:to-brand-500 text-white text-sm font-semibold shadow-glow transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>{modalMode === 'create' ? 'Guardar Denominación' : 'Actualizar Cambios'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Denominación"
        message={`¿Estás seguro de que deseas eliminar la denominación "${deletingItem?.denominacion}" (${deletingItem?.codigo_dc})?`}
        loading={deleting}
        confirmText="Eliminar Denominación"
        variant="danger"
      />
    </div>
  );
};
