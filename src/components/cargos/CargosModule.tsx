import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Briefcase,
  CheckCircle2,
  XCircle,
  Tag,
  AlertCircle,
  Filter,
  Layers,
} from 'lucide-react';
import { cargosApi, empleadosApi, denominacionesCargosApi, formatCargoCodigo } from '../../lib/insforge';
import type { Cargo, Empleado, DenominacionCargo } from '../../lib/types';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EstadoBooleanBadge } from '../common/Badge';
import { useToast } from '../common/Toast';

export const CargosModule: React.FC = () => {
  const toast = useToast();
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [denominaciones, setDenominaciones] = useState<DenominacionCargo[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filtroDenominacion, setFiltroDenominacion] = useState<string | 'ALL'>('ALL');
  const [filtroEstado, setFiltroEstado] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedCargo, setSelectedCargo] = useState<Cargo | null>(null);
  const [nextConsecutiveId, setNextConsecutiveId] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  // Form State
  const [codigo, setCodigo] = useState('');
  const [codigoDc, setCodigoDc] = useState<string>('');
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
      const [{ data: cData, error: cErr }, { data: eData }, { data: dData }] = await Promise.all([
        cargosApi.getAll(),
        empleadosApi.getAll(),
        denominacionesCargosApi.getAll(),
      ]);

      if (cErr) toast.error('No se pudieron cargar los cargos');
      setCargos(cData || []);
      setEmpleados(eData || []);
      setDenominaciones(dData || []);
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
    setCodigoDc('');
    setNombre('');
    setDescripcion('');
    setEstado(true);
    setIsModalOpen(true);
  };

  const openEditModal = (cargo: Cargo) => {
    setModalMode('edit');
    setSelectedCargo(cargo);
    setCodigo(formatCargoCodigo(cargo.codigo));
    setCodigoDc(cargo.codigo_dc || '');
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
        const { error } = await cargosApi.create({
          codigo: autoCodigo,
          codigo_dc: codigoDc || null,
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
        const { error } = await cargosApi.update(selectedCargo.cargo_id, {
          codigo: formatCargoCodigo(codigo),
          codigo_dc: codigoDc || null,
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

  // KPIs
  const totalCargos = cargos.length;
  const cargosConDc = cargos.filter((c) => Boolean(c.codigo_dc)).length;
  const cargosSinDc = totalCargos - cargosConDc;
  const cargosActivos = cargos.filter((c) => c.estado).length;

  // Filtered Cargos
  const filteredCargos = cargos.filter((item) => {
    if (filtroDenominacion !== 'ALL') {
      if (filtroDenominacion === 'SIN_DC') {
        if (item.codigo_dc) return false;
      } else if (item.codigo_dc !== filtroDenominacion) {
        return false;
      }
    }
    if (filtroEstado === 'ACTIVO' && !item.estado) return false;
    if (filtroEstado === 'INACTIVO' && item.estado) return false;
    return true;
  });

  const columns: Column<Cargo>[] = [
    {
      key: 'cargo_id',
      header: 'ID',
      sortable: true,
      className: 'w-20',
      render: (item) => (
        <span className="font-mono font-bold text-slate-200 text-xs px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700">
          #{item.cargo_id}
        </span>
      ),
    },
    {
      key: 'codigo',
      header: 'Código',
      sortable: true,
      className: 'w-32',
      render: (item) => (
        <span className="font-mono font-bold text-brand-300 text-xs px-2.5 py-1 rounded-lg bg-brand-950/40 border border-brand-800/40 shadow-sm">
          {item.codigo}
        </span>
      ),
    },
    {
      key: 'nombre',
      header: 'Nombre del Puesto',
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
      key: 'codigo_dc',
      header: 'Denominación (DC)',
      sortable: true,
      render: (item) => {
        const dc = denominaciones.find((d) => d.codigo_dc === item.codigo_dc);
        if (!item.codigo_dc) {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-400/90 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
              <AlertCircle className="w-3 h-3" />
              <span>Sin clasificar</span>
            </span>
          );
        }
        return (
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-950/60 text-indigo-300 border border-indigo-800/50">
              {item.codigo_dc}
            </span>
            <span className="text-xs text-slate-200 font-medium">
              {dc?.denominacion || item.codigo_dc}
            </span>
          </div>
        );
      },
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
      className: 'w-28',
      render: (item) => <EstadoBooleanBadge activo={item.estado} />,
    },
    {
      key: 'acciones',
      header: 'Acciones',
      className: 'text-right w-28',
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
            Catálogo Maestro de Cargos
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gestión de puestos organizacionales y su vinculación con el Catálogo de Denominaciones (DC)
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Cargos
            </span>
            <Briefcase className="w-4 h-4 text-brand-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{totalCargos}</p>
          <span className="text-[11px] text-slate-500">Puestos definidos</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              Con Denominación
            </span>
            <Tag className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-indigo-400 mt-2">{cargosConDc}</p>
          <span className="text-[11px] text-slate-500">Clasificados con Código_DC</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Sin Clasificar
            </span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-2">{cargosSinDc}</p>
          <span className="text-[11px] text-slate-500">Pendientes de asignar DC</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Cargos Activos
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2">{cargosActivos}</p>
          <span className="text-[11px] text-slate-500">En uso operativo</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
          <Filter className="w-4 h-4 text-brand-400" />
          <span>Filtros rápidos:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Denominacion Filter */}
          <select
            value={filtroDenominacion}
            onChange={(e) => setFiltroDenominacion(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Todas las Denominaciones</option>
            <option value="SIN_DC">-- Sin Clasificar (Sin DC) --</option>
            {[...denominaciones]
              .sort((a, b) => a.denominacion.localeCompare(b.denominacion, 'es', { sensitivity: 'base' }))
              .map((d) => (
                <option key={d.codigo_dc} value={d.codigo_dc}>
                  {d.codigo_dc} - {d.denominacion}
                </option>
              ))}
          </select>

          {/* Estado Filter */}
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-brand-500"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="ACTIVO">Solo Activos</option>
            <option value="INACTIVO">Solo Inactivos</option>
          </select>
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        data={filteredCargos}
        columns={columns}
        loading={loading}
        searchKeys={['cargo_id', 'codigo', 'nombre', 'descripcion', 'codigo_dc']}
        searchPlaceholder="Buscar por ID, código, nombre o denominación DC..."
        exportFilename="catalogo_cargos"
      />

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Registrar Nuevo Cargo' : 'Editar Cargo'}
        subtitle="Catálogo Maestro de Cargos"
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
              Denominación del Cargo (Catálogo DC)
            </label>
            <select
              value={codigoDc}
              onChange={(e) => setCodigoDc(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- Sin Denominación Asignada --</option>
              {[...denominaciones]
                .sort((a, b) => a.denominacion.localeCompare(b.denominacion, 'es', { sensitivity: 'base' }))
                .map((dc) => (
                  <option key={dc.codigo_dc} value={dc.codigo_dc}>
                    {dc.codigo_dc} - {dc.denominacion}
                  </option>
                ))}
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              Clasificación estandarizada para agrupar cargos homogéneos (ej. DC-0001 Analista, DC-0010 Gerente).
            </p>
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
