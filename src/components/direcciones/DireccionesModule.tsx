import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Building2, User, CheckCircle2, XCircle } from 'lucide-react';
import { direccionesApi, empleadosApi } from '../../lib/insforge';
import type { Direccion, Empleado } from '../../lib/types';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EstadoBooleanBadge } from '../common/Badge';
import { useToast } from '../common/Toast';

export const DireccionesModule: React.FC = () => {
  const toast = useToast();
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedDireccion, setSelectedDireccion] = useState<Direccion | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [directorId, setDirectorId] = useState<number | ''>('');
  const [estado, setEstado] = useState(true);

  // Delete Dialog State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingDireccion, setDeletingDireccion] = useState<Direccion | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: dirs, error: errDirs }, { data: emps, error: errEmps }] = await Promise.all([
        direccionesApi.getAll(),
        empleadosApi.getAll(),
      ]);

      if (errDirs) toast.error('No se pudieron cargar las direcciones');
      setDirecciones(dirs || []);
      setEmpleados(emps || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedDireccion(null);
    setCodigo(`DIR-${Math.floor(100 + Math.random() * 900)}`);
    setNombre('');
    setDescripcion('');
    setDirectorId('');
    setEstado(true);
    setIsModalOpen(true);
  };

  const openEditModal = (dir: Direccion) => {
    setModalMode('edit');
    setSelectedDireccion(dir);
    setCodigo(dir.codigo);
    setNombre(dir.nombre);
    setDescripcion(dir.descripcion || '');
    setDirectorId(dir.director_id || '');
    setEstado(dir.estado);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim() || !nombre.trim()) {
      toast.error('El código y el nombre son campos obligatorios');
      return;
    }

    setSaving(true);
    try {
      if (modalMode === 'create') {
        const { data, error } = await direccionesApi.create({
          codigo: codigo.trim().toUpperCase(),
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          director_id: directorId ? Number(directorId) : null,
          estado,
        });

        if (error) {
          toast.error(error.message || 'Error al crear la dirección');
        } else {
          toast.success('Dirección creada exitosamente');
          setIsModalOpen(false);
          loadData();
        }
      } else if (selectedDireccion) {
        const { data, error } = await direccionesApi.update(selectedDireccion.direccion_id, {
          codigo: codigo.trim().toUpperCase(),
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          director_id: directorId ? Number(directorId) : null,
          estado,
        });

        if (error) {
          toast.error(error.message || 'Error al actualizar la dirección');
        } else {
          toast.success('Dirección actualizada correctamente');
          setIsModalOpen(false);
          loadData();
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (dir: Direccion) => {
    setDeletingDireccion(dir);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingDireccion) return;
    setDeleting(true);
    try {
      const { success, error } = await direccionesApi.delete(deletingDireccion.direccion_id);
      if (success) {
        toast.success(`Dirección ${deletingDireccion.nombre} eliminada`);
        setIsDeleteDialogOpen(false);
        setDeletingDireccion(null);
        loadData();
      } else {
        toast.error(
          error?.message?.includes('violates foreign key')
            ? 'No se puede eliminar la dirección porque contiene gerencias adscritas. Reasigna o elimina las gerencias primero.'
            : error?.message || 'Error al eliminar la dirección'
        );
      }
    } finally {
      setDeleting(false);
    }
  };

  const getDirectorName = (dirId: number | null) => {
    if (!dirId) return null;
    const emp = empleados.find((e) => e.empleado_id === dirId);
    return emp ? `${emp.nombres} ${emp.apellidos}` : `Empleado #${dirId}`;
  };

  const columns: Column<Direccion>[] = [
    {
      key: 'codigo',
      header: 'Código',
      sortable: true,
      render: (item) => (
        <span className="font-mono font-bold text-brand-300 text-xs px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700">
          {item.codigo}
        </span>
      ),
    },
    {
      key: 'nombre',
      header: 'Nombre de la Dirección',
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-semibold text-slate-100">{item.nombre}</div>
          {item.descripcion && (
            <div className="text-xs text-slate-400 truncate max-w-xs">{item.descripcion}</div>
          )}
        </div>
      ),
    },
    {
      key: 'director_id',
      header: 'Director / Responsable',
      sortable: true,
      render: (item) => {
        const directorName = getDirectorName(item.director_id);
        return directorName ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-300 text-[10px] font-bold flex items-center justify-center border border-brand-500/30">
              <User className="w-3 h-3" />
            </div>
            <span className="text-xs text-slate-200 font-medium">{directorName}</span>
          </div>
        ) : (
          <span className="text-xs text-amber-400/80 italic">Sin asignar</span>
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
            title="Editar dirección"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => openDeleteDialog(item)}
            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
            title="Eliminar dirección"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Title and Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-brand-400" />
            Direcciones Estratégicas (Nivel 1)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gestión de las direcciones ejecutivas máximas que agrupan gerencias y departamentos.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-glow transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Dirección</span>
        </button>
      </div>

      {/* DataTable */}
      <DataTable
        data={direcciones}
        columns={columns}
        loading={loading}
        searchKeys={['codigo', 'nombre', 'descripcion']}
        searchPlaceholder="Buscar por código, nombre o descripción..."
        exportFilename="direcciones_nivel_1"
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Crear Nueva Dirección' : 'Editar Dirección'}
        subtitle="Nivel 1 de la Jerarquía Organizacional"
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Código Único *
              </label>
              <input
                type="text"
                required
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ej. DIR-TECN"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Estado Operativo
              </label>
              <div className="flex items-center gap-3 pt-2">
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={estado}
                    onChange={(e) => setEstado(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  <span className="ml-3 text-xs font-medium text-slate-300">
                    {estado ? 'Activa' : 'Inactiva'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nombre de la Dirección *
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Dirección de Tecnología e Innovación"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Director / Responsable Asignado
            </label>
            <select
              value={directorId}
              onChange={(e) => setDirectorId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-brand-500"
            >
              <option value="">-- Sin Director asignado --</option>
              {empleados.map((emp) => (
                <option key={emp.empleado_id} value={emp.empleado_id}>
                  {emp.nombres} {emp.apellidos} ({emp.codigo_empleado})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Descripción / Alcance
            </label>
            <textarea
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción de funciones y objetivos de la dirección..."
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
              <span>{modalMode === 'create' ? 'Guardar Dirección' : 'Actualizar Cambios'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Dirección"
        message={`¿Estás seguro de que deseas eliminar permanentemente la dirección "${deletingDireccion?.nombre}"? Esta acción no se puede deshacer.`}
        loading={deleting}
        confirmText="Eliminar Dirección"
      />
    </div>
  );
};
