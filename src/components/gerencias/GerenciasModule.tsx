import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, GitFork, User, Building2, Filter, ChevronDown, RotateCcw } from 'lucide-react';
import { gerenciasApi, direccionesApi, empleadosApi, formatGerenciaCodigo } from '../../lib/insforge';
import type { Gerencia, Direccion, Empleado } from '../../lib/types';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EstadoBooleanBadge } from '../common/Badge';
import { useToast } from '../common/Toast';

export const GerenciasModule: React.FC = () => {
  const toast = useToast();
  const [gerencias, setGerencias] = useState<Gerencia[]>([]);
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [selectedDireccionFilter, setSelectedDireccionFilter] = useState<string | 'ALL'>('ALL');
  const [selectedGerenciaFilter, setSelectedGerenciaFilter] = useState<string | 'ALL'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedGerencia, setSelectedGerencia] = useState<Gerencia | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [codigoDireccion, setCodigoDireccion] = useState<string>('');
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [gerenteId, setGerenteId] = useState<number | ''>('');
  const [estado, setEstado] = useState(true);

  // Delete Dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingGerencia, setDeletingGerencia] = useState<Gerencia | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        { data: gers, error: errGers },
        { data: dirs, error: errDirs },
        { data: emps, error: errEmps },
      ] = await Promise.all([
        gerenciasApi.getAll(),
        direccionesApi.getAll(),
        empleadosApi.getAll(),
      ]);

      if (errGers) toast.error('No se pudieron cargar las gerencias');
      setGerencias(gers || []);
      setDirecciones(dirs || []);
      setEmpleados(emps || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getNextGerenciaConsecutive = (items: Gerencia[]) => {
    if (!items || items.length === 0) {
      return 'Ger-0001';
    }
    let maxCodeNum = 0;
    for (const g of items) {
      if (g.codigo) {
        const match = g.codigo.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (!isNaN(num) && num > maxCodeNum) {
            maxCodeNum = num;
          }
        }
      }
    }
    const nextNum = maxCodeNum > 0 ? maxCodeNum + 1 : items.length + 1;
    return `Ger-${String(nextNum).padStart(4, '0')}`;
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedGerencia(null);
    setCodigoDireccion(direcciones[0]?.codigo || '');
    setCodigo(getNextGerenciaConsecutive(gerencias));
    setNombre('');
    setDescripcion('');
    setGerenteId('');
    setEstado(true);
    setIsModalOpen(true);
  };

  const openEditModal = (ger: Gerencia) => {
    setModalMode('edit');
    setSelectedGerencia(ger);
    setCodigoDireccion(ger.codigo_direccion || '');
    setCodigo(formatGerenciaCodigo(ger.codigo));
    setNombre(ger.nombre);
    setDescripcion(ger.descripcion || '');
    setGerenteId(ger.gerente_id || '');
    setEstado(ger.estado);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim() || !nombre.trim()) {
      toast.error('El código y el nombre de la gerencia son obligatorios');
      return;
    }

    setSaving(true);
    try {
      if (modalMode === 'create') {
        const { data, error } = await gerenciasApi.create({
          codigo_direccion: codigoDireccion ? codigoDireccion.trim() : null,
          codigo: codigo.trim(),
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          gerente_id: gerenteId ? Number(gerenteId) : null,
          estado,
        });

        if (error) {
          toast.error(error.message || 'Error al crear la gerencia');
        } else {
          toast.success('Gerencia creada exitosamente');
          setIsModalOpen(false);
          loadData();
        }
      } else if (selectedGerencia) {
        const { data, error } = await gerenciasApi.update(selectedGerencia.gerencia_id, {
          codigo_direccion: codigoDireccion ? codigoDireccion.trim() : null,
          codigo: codigo.trim(),
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          gerente_id: gerenteId ? Number(gerenteId) : null,
          estado,
        });

        if (error) {
          toast.error(error.message || 'Error al actualizar la gerencia');
        } else {
          toast.success('Gerencia actualizada correctamente');
          setIsModalOpen(false);
          loadData();
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (ger: Gerencia) => {
    setDeletingGerencia(ger);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingGerencia) return;
    setDeleting(true);
    try {
      const { success, error } = await gerenciasApi.delete(deletingGerencia.gerencia_id);
      if (success) {
        toast.success(`Gerencia ${deletingGerencia.nombre} eliminada`);
        setIsDeleteDialogOpen(false);
        setDeletingGerencia(null);
        loadData();
      } else {
        toast.error(
          error?.message?.includes('violates foreign key')
            ? 'No se puede eliminar la gerencia porque contiene departamentos adscritos. Reasigna o elimina los departamentos primero.'
            : error?.message || 'Error al eliminar la gerencia'
        );
      }
    } finally {
      setDeleting(false);
    }
  };

  const getDireccionName = (dirCode?: string | null) => {
    if (!dirCode) return 'Sin asignar';
    const dir = direcciones.find((d) => d.codigo === dirCode);
    return dir ? dir.nombre : dirCode;
  };

  const getGerenteName = (gId: number | null) => {
    if (!gId) return null;
    const emp = empleados.find((e) => e.empleado_id === gId);
    return emp ? `${emp.nombres} ${emp.apellidos}` : `Empleado #${gId}`;
  };

  // Gerencias filtradas por dirección para el combo
  const gerenciasDisponibles = useMemo(() => {
    if (selectedDireccionFilter === 'ALL') return gerencias;
    return gerencias.filter((g) => g.codigo_direccion === selectedDireccionFilter);
  }, [gerencias, selectedDireccionFilter]);

  const hasActiveFilters =
    selectedDireccionFilter !== 'ALL' ||
    selectedGerenciaFilter !== 'ALL';

  const activeFiltersCount = [
    selectedDireccionFilter !== 'ALL',
    selectedGerenciaFilter !== 'ALL',
  ].filter(Boolean).length;

  const resetAllFilters = () => {
    setSelectedDireccionFilter('ALL');
    setSelectedGerenciaFilter('ALL');
  };

  const filteredGerencias = gerencias.filter((g) => {
    if (selectedDireccionFilter !== 'ALL' && g.codigo_direccion !== selectedDireccionFilter) return false;
    if (selectedGerenciaFilter !== 'ALL' && g.codigo !== selectedGerenciaFilter) return false;
    return true;
  });

  const columns: Column<Gerencia>[] = [
    {
      key: 'codigo',
      header: 'Código',
      sortable: true,
      render: (item) => (
        <span className="font-mono font-bold text-indigo-300 text-xs px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700">
          {item.codigo}
        </span>
      ),
    },
    {
      key: 'nombre',
      header: 'Nombre de la Gerencia',
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
      key: 'codigo_direccion',
      header: 'Dirección Padre (Nivel 1)',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
          <Building2 className="w-3.5 h-3.5 text-brand-400 shrink-0" />
          <span>{getDireccionName(item.codigo_direccion)}</span>
        </div>
      ),
    },
    {
      key: 'gerente_id',
      header: 'Gerente de Área',
      sortable: true,
      render: (item) => {
        const gerenteName = getGerenteName(item.gerente_id);
        return gerenteName ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold flex items-center justify-center border border-indigo-500/30">
              <User className="w-3 h-3" />
            </div>
            <span className="text-xs text-slate-200 font-medium">{gerenteName}</span>
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
      key: 'gerencia_id',
      header: 'Acciones',
      render: (item) => (
        <div className="flex items-center gap-1.5 justify-end">
          <button
            onClick={() => openEditModal(item)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Editar Gerencia"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => openDeleteDialog(item)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Eliminar Gerencia"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">Estructura de Gerencias</h2>
          <p className="text-xs text-slate-400">
            Nivel 2 de la estructura organizacional de las empresas del grupo
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-glow transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Gerencia</span>
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
          {/* 1. Direcciones */}
          <div className="relative min-w-[190px] flex-1 sm:flex-initial">
            <select
              value={selectedDireccionFilter}
              onChange={(e) => {
                const newDir = e.target.value;
                setSelectedDireccionFilter(newDir);
                if (newDir !== 'ALL' && selectedGerenciaFilter !== 'ALL') {
                  const ger = gerencias.find((g) => g.codigo === selectedGerenciaFilter);
                  if (ger && ger.codigo_direccion !== newDir) {
                    setSelectedGerenciaFilter('ALL');
                  }
                }
              }}
              className={`w-full pl-3 pr-7 py-2 bg-slate-950/80 border rounded-xl text-xs transition-all appearance-none cursor-pointer focus:outline-none truncate ${
                selectedDireccionFilter !== 'ALL'
                  ? 'border-brand-500/80 bg-brand-500/10 text-brand-300 font-semibold ring-1 ring-brand-500/30'
                  : 'border-slate-800/90 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60 font-medium'
              }`}
              title="Filtrar por Dirección"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">Direcciones</option>
              {[...direcciones]
                .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
                .map((d) => (
                  <option key={d.codigo} value={d.codigo} className="bg-slate-900 text-slate-200">
                    {d.nombre} ({d.codigo})
                  </option>
                ))}
            </select>
            <ChevronDown className={`w-3.5 h-3.5 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors ${
              selectedDireccionFilter !== 'ALL' ? 'text-brand-400' : 'text-slate-500'
            }`} />
          </div>

          {/* 2. Gerencias */}
          <div className="relative min-w-[190px] flex-1 sm:flex-initial">
            <select
              value={selectedGerenciaFilter}
              onChange={(e) => setSelectedGerenciaFilter(e.target.value)}
              className={`w-full pl-3 pr-7 py-2 bg-slate-950/80 border rounded-xl text-xs transition-all appearance-none cursor-pointer focus:outline-none truncate ${
                selectedGerenciaFilter !== 'ALL'
                  ? 'border-indigo-500/80 bg-indigo-500/10 text-indigo-300 font-semibold ring-1 ring-indigo-500/30'
                  : 'border-slate-800/90 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60 font-medium'
              }`}
              title="Filtrar por Gerencia"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">Gerencias</option>
              {[...gerenciasDisponibles]
                .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
                .map((g) => (
                  <option key={g.codigo} value={g.codigo} className="bg-slate-900 text-slate-200">
                    {g.nombre} ({g.codigo})
                  </option>
                ))}
            </select>
            <ChevronDown className={`w-3.5 h-3.5 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors ${
              selectedGerenciaFilter !== 'ALL' ? 'text-indigo-400' : 'text-slate-500'
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
        data={filteredGerencias}
        columns={columns}
        loading={loading}
        searchKeys={['codigo', 'nombre', 'descripcion', 'codigo_direccion']}
        searchPlaceholder="Buscar por código, nombre o descripción..."
        exportFilename="gerencias_nivel_2"
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Crear Nueva Gerencia' : 'Editar Gerencia'}
        subtitle="Nivel 2 de la Jerarquía Organizacional"
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Dirección Padre (Nivel 1) *
            </label>
            <select
              required
              value={codigoDireccion}
              onChange={(e) => setCodigoDireccion(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-brand-500"
            >
              <option value="" disabled>-- Selecciona una Dirección --</option>
              {[...direcciones]
                .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
                .map((d) => (
                  <option key={d.codigo} value={d.codigo}>
                    {d.nombre} ({d.codigo})
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
                placeholder="Ej. Ger-0024"
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
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  <span className="ml-3 text-xs font-medium text-slate-300">
                    {estado ? 'Activa' : 'Inactiva'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nombre de la Gerencia *
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Gerencia de Desarrollo de Software"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Gerente de Área Asignado
            </label>
            <select
              value={gerenteId}
              onChange={(e) => setGerenteId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-brand-500"
            >
              <option value="">-- Sin Gerente asignado --</option>
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
              Descripción / Alcance
            </label>
            <textarea
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción de objetivos y proyectos de la gerencia..."
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
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-glow transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>{modalMode === 'create' ? 'Guardar Gerencia' : 'Actualizar Cambios'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Gerencia"
        message={`¿Estás seguro de que deseas eliminar la gerencia "${deletingGerencia?.nombre}"?`}
        loading={deleting}
        confirmText="Eliminar Gerencia"
      />
    </div>
  );
};
