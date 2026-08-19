import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Network, User, GitFork, Filter } from 'lucide-react';
import { departamentosApi, gerenciasApi, empleadosApi } from '../../lib/insforge';
import type { Departamento, Gerencia, Empleado } from '../../lib/types';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EstadoBooleanBadge } from '../common/Badge';
import { useToast } from '../common/Toast';

export const DepartamentosModule: React.FC = () => {
  const toast = useToast();
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [gerencias, setGerencias] = useState<Gerencia[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [selectedGerenciaFilter, setSelectedGerenciaFilter] = useState<string | 'ALL'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedDepartamento, setSelectedDepartamento] = useState<Departamento | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [codigoGerencia, setCodigoGerencia] = useState<string>('');
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [jefeId, setJefeId] = useState<number | ''>('');
  const [estado, setEstado] = useState(true);

  // Delete Dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingDepto, setDeletingDepto] = useState<Departamento | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        { data: deps, error: errDeps },
        { data: gers, error: errGers },
        { data: emps, error: errEmps },
      ] = await Promise.all([
        departamentosApi.getAll(),
        gerenciasApi.getAll(),
        empleadosApi.getAll(),
      ]);

      if (errDeps) toast.error('No se pudieron cargar los departamentos');
      setDepartamentos(deps || []);
      setGerencias(gers || []);
      setEmpleados(emps || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatDepartamentoCodigo = (cod?: string | null) => {
    if (!cod) return '';
    const match = cod.match(/^dep-(\d+)$/i);
    if (match) {
      return `Dep-${match[1].padStart(4, '0')}`;
    }
    return cod;
  };

  const getNextDepartamentoConsecutive = (items: Departamento[]) => {
    if (!items || items.length === 0) {
      return 'Dep-0001';
    }
    let maxCodeNum = 0;
    for (const d of items) {
      if (d.codigo) {
        const match = d.codigo.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (!isNaN(num) && num > maxCodeNum) {
            maxCodeNum = num;
          }
        }
      }
      if (d.departamento_id && Number(d.departamento_id) > maxCodeNum) {
        maxCodeNum = Number(d.departamento_id);
      }
    }
    const nextNum = maxCodeNum + 1;
    return `Dep-${String(nextNum).padStart(4, '0')}`;
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedDepartamento(null);
    setCodigoGerencia(gerencias[0]?.codigo || '');
    setCodigo(getNextDepartamentoConsecutive(departamentos));
    setNombre('');
    setDescripcion('');
    setJefeId('');
    setEstado(true);
    setIsModalOpen(true);
  };

  const openEditModal = (dep: Departamento) => {
    setModalMode('edit');
    setSelectedDepartamento(dep);
    setCodigoGerencia(dep.codigo_gerencia || '');
    setCodigo(formatDepartamentoCodigo(dep.codigo));
    setNombre(dep.nombre);
    setDescripcion(dep.descripcion || '');
    setJefeId(dep.jefe_departamento_id || '');
    setEstado(dep.estado);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim() || !nombre.trim()) {
      toast.error('El código y el nombre del departamento son obligatorios');
      return;
    }

    setSaving(true);
    try {
      if (modalMode === 'create') {
        const { data, error } = await departamentosApi.create({
          codigo_gerencia: codigoGerencia ? codigoGerencia.trim() : null,
          codigo: codigo.trim(),
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          jefe_departamento_id: jefeId ? Number(jefeId) : null,
          estado,
        });

        if (error) {
          toast.error(error.message || 'Error al crear el departamento');
        } else {
          toast.success('Departamento creado exitosamente');
          setIsModalOpen(false);
          loadData();
        }
      } else if (selectedDepartamento) {
        const { data, error } = await departamentosApi.update(selectedDepartamento.departamento_id, {
          codigo_gerencia: codigoGerencia ? codigoGerencia.trim() : null,
          codigo: codigo.trim(),
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          jefe_departamento_id: jefeId ? Number(jefeId) : null,
          estado,
        });

        if (error) {
          toast.error(error.message || 'Error al actualizar el departamento');
        } else {
          toast.success('Departamento actualizado correctamente');
          setIsModalOpen(false);
          loadData();
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (dep: Departamento) => {
    setDeletingDepto(dep);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingDepto) return;
    setDeleting(true);
    try {
      const { success, error } = await departamentosApi.delete(deletingDepto.departamento_id);
      if (success) {
        toast.success(`Departamento ${deletingDepto.nombre} eliminado`);
        setIsDeleteDialogOpen(false);
        setDeletingDepto(null);
        loadData();
      } else {
        toast.error(
          error?.message?.includes('violates foreign key')
            ? 'No se puede eliminar el departamento porque tiene empleados adscritos. Reasigna los empleados primero.'
            : error?.message || 'Error al eliminar el departamento'
        );
      }
    } finally {
      setDeleting(false);
    }
  };

  const getGerenciaName = (gerCode?: string | null) => {
    if (!gerCode) return 'Sin asignar';
    const ger = gerencias.find((g) => g.codigo === gerCode);
    return ger ? ger.nombre : gerCode;
  };

  const getJefeName = (jId: number | null) => {
    if (!jId) return null;
    const emp = empleados.find((e) => e.empleado_id === jId);
    return emp ? `${emp.nombres} ${emp.apellidos}` : `Empleado #${jId}`;
  };

  const filteredDepartamentos = departamentos.filter((dep) => {
    if (selectedGerenciaFilter === 'ALL') return true;
    return dep.codigo_gerencia === selectedGerenciaFilter;
  });

  const columns: Column<Departamento>[] = [
    {
      key: 'codigo',
      header: 'Código',
      sortable: true,
      render: (item) => (
        <span className="font-mono font-bold text-emerald-300 text-xs px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700">
          {item.codigo}
        </span>
      ),
    },
    {
      key: 'nombre',
      header: 'Nombre del Departamento',
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
      key: 'codigo_gerencia',
      header: 'Gerencia Padre (Nivel 2)',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
          <GitFork className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>{getGerenciaName(item.codigo_gerencia)}</span>
        </div>
      ),
    },
    {
      key: 'jefe_departamento_id',
      header: 'Jefe de Departamento',
      sortable: true,
      render: (item) => {
        const jefeName = getJefeName(item.jefe_departamento_id);
        return jefeName ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center justify-center border border-emerald-500/30">
              <User className="w-3 h-3" />
            </div>
            <span className="text-xs text-slate-200 font-medium">{jefeName}</span>
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
      key: 'departamento_id',
      header: 'Acciones',
      render: (item) => (
        <div className="flex items-center gap-1.5 justify-end">
          <button
            onClick={() => openEditModal(item)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Editar Departamento"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => openDeleteDialog(item)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Eliminar Departamento"
          >
            <Trash2 className="w-4 h-4" />
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
          <h2 className="text-lg font-bold text-white">Estructura de Departamentos</h2>
          <p className="text-xs text-slate-400">
            Nivel 3 de la estructura organizacional de las empresas del grupo
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-glow transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Departamento</span>
        </button>
      </div>

      {/* Filter Component */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="text-xs text-slate-400 font-medium">Filtrar por Gerencia:</span>
        <select
          value={selectedGerenciaFilter}
          onChange={(e) =>
            setSelectedGerenciaFilter(e.target.value)
          }
          className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-brand-500"
        >
          <option value="ALL">Todas las Gerencias</option>
          {gerencias.map((g) => (
            <option key={g.codigo} value={g.codigo}>
              {g.nombre} ({g.codigo})
            </option>
          ))}
        </select>
      </div>

      {/* DataTable */}
      <DataTable
        data={filteredDepartamentos}
        columns={columns}
        loading={loading}
        searchKeys={['codigo', 'nombre', 'descripcion', 'codigo_gerencia']}
        searchPlaceholder="Buscar por código, nombre o descripción..."
        exportFilename="departamentos_nivel_3"
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Crear Nuevo Departamento' : 'Editar Departamento'}
        subtitle="Nivel 3 de la Jerarquía Organizacional"
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Gerencia Padre (Nivel 2) *
            </label>
            <select
              required
              value={codigoGerencia}
              onChange={(e) => setCodigoGerencia(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-brand-500"
            >
              <option value="" disabled>-- Selecciona una Gerencia --</option>
              {gerencias.map((g) => (
                <option key={g.codigo} value={g.codigo}>
                  {g.nombre} ({g.codigo})
                </option>
              ))}
            </select>
          </div>

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
                placeholder="Ej. Dep-0037"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Estado Operativo
              </label>
              <div className="flex items-center gap-3 pt-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={estado}
                    onChange={(e) => setEstado(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  <span className="ml-3 text-xs font-medium text-slate-300">
                    {estado ? 'Activo' : 'Inactivo'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nombre del Departamento *
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Departamento de Backend y Bases de Datos"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Jefe de Departamento Asignado
            </label>
            <select
              value={jefeId}
              onChange={(e) => setJefeId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-brand-500"
            >
              <option value="">-- Sin Jefe asignado --</option>
              {empleados.map((emp) => (
                <option key={emp.empleado_id} value={emp.empleado_id}>
                  {emp.nombres} {emp.apellidos} ({emp.codigo_empleado})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Descripción / Funciones
            </label>
            <textarea
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción operativa del departamento..."
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
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-glow transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>{modalMode === 'create' ? 'Guardar Departamento' : 'Actualizar Cambios'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Departamento"
        message={`¿Estás seguro de que deseas eliminar el departamento "${deletingDepto?.nombre}"?`}
        loading={deleting}
        confirmText="Eliminar Departamento"
      />
    </div>
  );
};
