import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Briefcase, CheckCircle2, XCircle } from 'lucide-react';
import { cargosApi, empleadosApi, formatCargoCodigo } from '../../lib/insforge';
import type { Cargo, Empleado } from '../../lib/types';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EstadoBooleanBadge } from '../common/Badge';
import { useToast } from '../common/Toast';

export const CargosModule: React.FC = () => {
  const toast = useToast();
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedCargo, setSelectedCargo] = useState<Cargo | null>(null);
  const [nextConsecutiveId, setNextConsecutiveId] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  // Form State
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [estado, setEstado] = useState(true);

  // Delete Dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingCargo, setDeletingCargo] = useState<Cargo | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: cData, error: cErr }, { data: eData }] = await Promise.all([
        cargosApi.getAll(),
        empleadosApi.getAll(),
      ]);

      if (cErr) toast.error('No se pudieron cargar los cargos');
      setCargos(cData || []);
      setEmpleados(eData || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getNextCargoConsecutive = (items: Cargo[]) => {
    if (!items || items.length === 0) {
      return { nextId: 1, nextCodigo: 'Cargo-0001' };
    }
    let maxCodeNum = 0;
    for (const c of items) {
      if (c.codigo) {
        const match = c.codigo.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (!isNaN(num) && num > maxCodeNum) {
            maxCodeNum = num;
          }
        }
      }
    }
    const nextNum = maxCodeNum > 0 ? maxCodeNum + 1 : items.length + 1;
    const nextCodigo = `Cargo-${String(nextNum).padStart(4, '0')}`;
    return { nextId: nextNum, nextCodigo };
  };

  const openCreateModal = () => {
    const { nextId, nextCodigo } = getNextCargoConsecutive(cargos);
    setModalMode('create');
    setSelectedCargo(null);
    setNextConsecutiveId(nextId);
    setCodigo(nextCodigo);
    setNombre('');
    setDescripcion('');
    setEstado(true);
    setIsModalOpen(true);
  };

  const openEditModal = (cargo: Cargo) => {
    setModalMode('edit');
    setSelectedCargo(cargo);
    setCodigo(formatCargoCodigo(cargo.codigo));
    setNombre(cargo.nombre);
    setDescripcion(cargo.descripcion || '');
    setEstado(cargo.estado);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error('El nombre del cargo es obligatorio');
      return;
    }

    setSaving(true);
    try {
      if (modalMode === 'create') {
        const autoCodigo = formatCargoCodigo(codigo) || `Cargo-${String(nextConsecutiveId).padStart(4, '0')}`;
        const { data, error } = await cargosApi.create({
          codigo: autoCodigo,
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          estado,
        });

        if (error) {
          toast.error(error.message || 'Error al registrar el cargo');
        } else {
          toast.success(`Cargo ${autoCodigo} creado exitosamente`);
          setIsModalOpen(false);
          loadData();
        }
      } else if (selectedCargo) {
        const { data, error } = await cargosApi.update(selectedCargo.cargo_id, {
          codigo: formatCargoCodigo(codigo),
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          estado,
        });

        if (error) {
          toast.error(error.message || 'Error al actualizar el cargo');
        } else {
          toast.success('Cargo actualizado correctamente');
          setIsModalOpen(false);
          loadData();
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (cargo: Cargo) => {
    setDeletingCargo(cargo);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingCargo) return;
    setDeleting(true);
    try {
      const { success, error } = await cargosApi.delete(deletingCargo.cargo_id);
      if (success) {
        toast.success(`Cargo ${deletingCargo.nombre} eliminado`);
        setIsDeleteDialogOpen(false);
        setDeletingCargo(null);
        loadData();
      } else {
        toast.error(
          error?.message?.includes('violates foreign key')
            ? 'No se puede eliminar el cargo porque hay empleados adscritos a este cargo.'
            : error?.message || 'Error al eliminar el cargo'
        );
      }
    } finally {
      setDeleting(false);
    }
  };

  const getEmployeeCount = (cargoCodigo: string) => {
    return empleados.filter((e) => e.codigo_cargo === cargoCodigo).length;
  };

  const columns: Column<Cargo>[] = [
    {
      key: 'cargo_id',
      header: 'Cargo_id',
      sortable: true,
      render: (item) => (
        <span className="font-mono font-bold text-slate-200 text-xs px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700">
          {item.cargo_id}
        </span>
      ),
    },
    {
      key: 'codigo',
      header: 'Codigo',
      sortable: true,
      render: (item) => (
        <span className="font-mono font-bold text-brand-300 text-xs px-2.5 py-1 rounded-lg bg-brand-950/40 border border-brand-800/40">
          {item.codigo}
        </span>
      ),
    },
    {
      key: 'nombre',
      header: 'Nombre',
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-semibold text-slate-100">{item.nombre}</div>
          {item.descripcion && (
            <div className="text-xs text-slate-400 truncate max-w-sm">{item.descripcion}</div>
          )}
        </div>
      ),
    },
    {
      key: 'descripcion',
      header: 'Descripcion',
      sortable: true,
      render: (item) => (
        <span className="text-xs text-slate-400 truncate max-w-xs block">
          {item.descripcion || item.nombre}
        </span>
      ),
    },
    {
      key: 'total_empleados',
      header: 'Personal Asignado',
      sortable: true,
      render: (item) => {
        const count = getEmployeeCount(item.codigo);
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-300 font-semibold px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700">
            <span>{count}</span>
            <span className="text-[10px] text-slate-400 font-normal">
              {count === 1 ? 'colaborador' : 'colaboradores'}
            </span>
          </span>
        );
      },
    },
    {
      key: 'estado',
      header: 'Estado',
      sortable: true,
      render: (item) => <EstadoBooleanBadge activo={item.estado} />,
    },
    {
      key: 'acciones',
      header: 'Acciones',
      className: 'text-right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => openEditModal(item)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            title="Editar cargo"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => openDeleteDialog(item)}
            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
            title="Eliminar cargo"
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
            <Briefcase className="w-6 h-6 text-brand-400" />
            Catálogo de Cargos
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Maestro de Cargos
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-glow transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Cargo</span>
        </button>
      </div>

      {/* DataTable */}
      <DataTable
        data={cargos}
        columns={columns}
        loading={loading}
        searchKeys={['cargo_id', 'codigo', 'nombre', 'descripcion']}
        searchPlaceholder="Buscar por ID, código o nombre de cargo..."
        exportFilename="catalogo_cargos"
      />

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Registrar Nuevo Cargo' : 'Editar Cargo'}
        subtitle="Catálogo de Cargos"
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {/* Autogenerated consecutive preview info banner */}
          <div className="p-3.5 bg-slate-900/90 border border-slate-700/80 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Cargo_id</div>
                <div className="text-sm font-mono font-bold text-emerald-400">
                  {modalMode === 'create' ? `#${nextConsecutiveId}` : `#${selectedCargo?.cargo_id}`}
                </div>
              </div>
              <div className="h-7 w-[1px] bg-slate-800" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Código Consecutivo</div>
                <div className="text-sm font-mono font-bold text-brand-300">
                  {codigo || (modalMode === 'create' ? `Cargo-${String(nextConsecutiveId).padStart(4, '0')}` : selectedCargo?.codigo)}
                </div>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {modalMode === 'create' ? 'Autogenerado' : 'Asignado'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Código del Cargo (Autogenerado)
              </label>
              <input
                type="text"
                readOnly
                value={codigo}
                className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700/80 rounded-xl text-sm font-mono text-brand-300 cursor-not-allowed select-none focus:outline-none"
              />
              <p className="text-[10px] text-slate-500 mt-1">Formato secuencial estandarizado (ej. Cargo-0096).</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Estado
              </label>
              <div className="flex items-center gap-3 pt-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={estado}
                    onChange={(e) => setEstado(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                  <span className="ml-3 text-xs font-medium text-slate-300">
                    {estado ? 'Activo' : 'Inactivo'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nombre del Cargo *
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Supervisor de Elaboración"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Descripción del Cargo
            </label>
            <textarea
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Responsabilidades y perfil requerido para este cargo..."
              className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 resize-none"
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
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-glow transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>{modalMode === 'create' ? 'Guardar Cargo' : 'Actualizar Cambios'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Cargo"
        message={`¿Estás seguro de que deseas eliminar el cargo "${deletingCargo?.nombre}"?`}
        loading={deleting}
        confirmText="Eliminar Cargo"
      />
    </div>
  );
};
