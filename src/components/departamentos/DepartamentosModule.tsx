import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, Network, User, GitFork, Filter, ChevronDown, RotateCcw } from 'lucide-react';
import { departamentosApi, gerenciasApi, empleadosApi, formatDepartamentoCodigo } from '../../lib/insforge';
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
  const [selectedDepartamentoFilter, setSelectedDepartamentoFilter] = useState<string | 'ALL'>('ALL');

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
    }
    const nextNum = maxCodeNum > 0 ? maxCodeNum + 1 : items.length + 1;
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

  // Departamentos filtrados por gerencia para el combo
  const departamentosDisponibles = useMemo(() => {
    if (selectedGerenciaFilter === 'ALL') return departamentos;
    return departamentos.filter((d) => d.codigo_gerencia === selectedGerenciaFilter);
  }, [departamentos, selectedGerenciaFilter]);

  const hasActiveFilters =
    selectedGerenciaFilter !== 'ALL' ||
    selectedDepartamentoFilter !== 'ALL';

  const activeFiltersCount = [
    selectedGerenciaFilter !== 'ALL',
    selectedDepartamentoFilter !== 'ALL',
  ].filter(Boolean).length;

  const resetAllFilters = () => {
    setSelectedGerenciaFilter('ALL');
    setSelectedDepartamentoFilter('ALL');
  };

  const filteredDepartamentos = departamentos.filter((dep) => {
    if (selectedGerenciaFilter !== 'ALL' && dep.codigo_gerencia !== selectedGerenciaFilter) return false;
    if (selectedDepartamentoFilter !== 'ALL' && dep.codigo !== selectedDepartamentoFilter) return false;
    return true;
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
      key: 'actions',
      header: 'Acciones',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => openEditModal(item)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
            title="Editar Departamento"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => openDeleteDialog(item)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
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
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 shadow-glow flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Network className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Departamentos</h1>
              <p className="text-xs text-slate-400">
                Nivel 3 de la estructura organizativa y asignación de Centros de Costos
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-glow flex items-center justify-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Departamento</span>
        </button>
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
          {/* 1. Gerencias */}
          <div className="relative min-w-[170px] flex-1 sm:flex-initial">
            <select
              value={selectedGerenciaFilter}
              onChange={(e) => {
                const newGerencia = e.target.value;
                setSelectedGerenciaFilter(newGerencia);
                if (newGerencia !== 'ALL' && selectedDepartamentoFilter !== 'ALL') {
                  const dep = departamentos.find((d) => d.codigo === selectedDepartamentoFilter);
                  if (dep && dep.codigo_gerencia !== newGerencia) {
                    setSelectedDepartamentoFilter('ALL');
                  }
                }
              }}
              className={`w-full pl-3 pr-7 py-2 bg-slate-950/80 border rounded-xl text-xs transition-all appearance-none cursor-pointer focus:outline-none truncate ${
                selectedGerenciaFilter !== 'ALL'
                  ? 'border-brand-500/80 bg-brand-500/10 text-brand-300 font-semibold ring-1 ring-brand-500/30'
                  : 'border-slate-800/90 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60 font-medium'
              }`}
              title="Filtrar por Gerencia"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">Gerencias</option>
              {[...gerencias]
                .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
                .map((g) => (
                  <option key={g.codigo} value={g.codigo} className="bg-slate-900 text-slate-200">
                    {g.nombre} ({g.codigo})
                  </option>
                ))}
            </select>
            <ChevronDown className={`w-3.5 h-3.5 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors ${
              selectedGerenciaFilter !== 'ALL' ? 'text-brand-400' : 'text-slate-500'
            }`} />
          </div>

          {/* 2. Departamentos */}
          <div className="relative min-w-[190px] flex-1 sm:flex-initial">
            <select
              value={selectedDepartamentoFilter}
              onChange={(e) => setSelectedDepartamentoFilter(e.target.value)}
              className={`w-full pl-3 pr-7 py-2 bg-slate-950/80 border rounded-xl text-xs transition-all appearance-none cursor-pointer focus:outline-none truncate ${
                selectedDepartamentoFilter !== 'ALL'
                  ? 'border-emerald-500/80 bg-emerald-500/10 text-emerald-300 font-semibold ring-1 ring-emerald-500/30'
                  : 'border-slate-800/90 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60 font-medium'
              }`}
              title="Filtrar por Departamento"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">Departamentos</option>
              {[...departamentosDisponibles]
                .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
                .map((d) => (
                  <option key={d.codigo} value={d.codigo} className="bg-slate-900 text-slate-200">
                    {d.nombre} ({d.codigo})
                  </option>
                ))}
            </select>
            <ChevronDown className={`w-3.5 h-3.5 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors ${
              selectedDepartamentoFilter !== 'ALL' ? 'text-emerald-400' : 'text-slate-500'
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
              {[...gerencias]
                .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
                .map((g) => (
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
              {[...empleados]
                .sort((a, b) => `${a.nombres} ${a.apellidos}`.localeCompare(`${b.nombres} ${b.apellidos}`, 'es', { sensitivity: 'base' }))
                .map((emp) => (
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
