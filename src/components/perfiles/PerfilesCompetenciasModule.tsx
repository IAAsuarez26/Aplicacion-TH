import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Award,
  Users,
  CheckCircle2,
  Layers,
  AlertCircle,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { perfilesCompetenciasApi, empleadosApi } from '../../lib/insforge';
import type { PerfilCompetencia, Empleado } from '../../lib/types';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EstadoBooleanBadge } from '../common/Badge';
import { useToast } from '../common/Toast';

export const PerfilesCompetenciasModule: React.FC = () => {
  const toast = useToast();
  const [perfiles, setPerfiles] = useState<PerfilCompetencia[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedItem, setSelectedItem] = useState<PerfilCompetencia | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [codigoPc, setCodigoPc] = useState('');
  const [perfil, setPerfil] = useState('');
  const [activo, setActivo] = useState(true);

  // Delete Dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<PerfilCompetencia | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filter State
  const [filtroEstado, setFiltroEstado] = useState<string>('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: pData, error: pErr }, { data: eData }] = await Promise.all([
        perfilesCompetenciasApi.getAll(),
        empleadosApi.getAll(),
      ]);

      if (pErr) toast.error('No se pudieron cargar los perfiles de competencias');
      setPerfiles(pData || []);
      setEmpleados(eData || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getNextConsecutiveCode = (items: PerfilCompetencia[]) => {
    let maxNum = 0;
    for (const item of items) {
      if (item.codigo_pc) {
        const match = item.codigo_pc.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    }
    const nextNum = maxNum > 0 ? maxNum + 1 : items.length + 1;
    return `PC-${String(nextNum).padStart(4, '0')}`;
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedItem(null);
    const nextCode = getNextConsecutiveCode(perfiles);
    setCodigoPc(nextCode);
    setPerfil('');
    setActivo(true);
    setIsModalOpen(true);
  };

  const openEditModal = (item: PerfilCompetencia) => {
    setModalMode('edit');
    setSelectedItem(item);
    setCodigoPc(item.codigo_pc);
    setPerfil(item.perfil);
    setActivo(item.activo);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!perfil.trim()) {
      toast.error('El nombre del perfil de competencia es obligatorio');
      return;
    }

    setSaving(true);
    try {
      if (modalMode === 'create') {
        const finalCode = codigoPc.trim() || getNextConsecutiveCode(perfiles);
        const { error } = await perfilesCompetenciasApi.create({
          codigo_pc: finalCode,
          perfil: perfil.trim(),
          activo,
        });

        if (error) {
          toast.error(error.message || 'Error al registrar el perfil de competencia');
        } else {
          toast.success(`Perfil ${finalCode} registrado exitosamente`);
          setIsModalOpen(false);
          loadData();
        }
      } else if (selectedItem) {
        const { error } = await perfilesCompetenciasApi.update(selectedItem.perfil_competencia_id, {
          codigo_pc: codigoPc.trim(),
          perfil: perfil.trim(),
          activo,
        });

        if (error) {
          toast.error(error.message || 'Error al actualizar el perfil de competencia');
        } else {
          toast.success('Perfil de competencia actualizado correctamente');
          setIsModalOpen(false);
          loadData();
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (item: PerfilCompetencia) => {
    setDeletingItem(item);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setDeleting(true);
    try {
      // Validar si hay empleados adscritos a este perfil
      const asociados = empleados.filter((e) => e.codigo_pc === deletingItem.codigo_pc);
      if (asociados.length > 0) {
        toast.error(
          `No se puede eliminar: existen ${asociados.length} colaborador(es) adscritos a este perfil de competencia.`
        );
        setIsDeleteDialogOpen(false);
        setDeleting(false);
        return;
      }

      const { success, error } = await perfilesCompetenciasApi.delete(deletingItem.perfil_competencia_id);
      if (success) {
        toast.success(`Perfil "${deletingItem.perfil}" eliminado`);
        setIsDeleteDialogOpen(false);
        setDeletingItem(null);
        loadData();
      } else {
        toast.error(
          error?.message?.includes('foreign key')
            ? 'No se puede eliminar: tiene dependencias en otras tablas.'
            : error?.message || 'Error al eliminar el perfil'
        );
      }
    } finally {
      setDeleting(false);
    }
  };

  const getAssociatedEmployeesCount = (codigo: string) => {
    return empleados.filter((e) => e.codigo_pc === codigo).length;
  };

  const filteredData = perfiles.filter((item) => {
    if (filtroEstado === 'ACTIVO' && !item.activo) return false;
    if (filtroEstado === 'INACTIVO' && item.activo) return false;
    return true;
  });

  const totalActivos = perfiles.filter((p) => p.activo).length;
  const totalEmpleadosConPerfil = empleados.filter((e) => Boolean(e.codigo_pc)).length;

  const getSemanticBadgeClass = (perfilNombre: string) => {
    const p = perfilNombre.toLowerCase();
    if (p.includes('líder') || p.includes('lider')) {
      return 'bg-emerald-950/70 border-emerald-800/60 text-emerald-300';
    }
    if (p.includes('admin')) {
      return 'bg-cyan-950/70 border-cyan-800/60 text-cyan-300';
    }
    if (p.includes('opera')) {
      return 'bg-amber-950/70 border-amber-800/60 text-amber-300';
    }
    return 'bg-purple-950/70 border-purple-800/60 text-purple-300';
  };

  const columns: Column<PerfilCompetencia>[] = [
    {
      key: 'perfil_competencia_id',
      header: 'ID',
      sortable: true,
      className: 'w-20',
      render: (item) => (
        <span className="font-mono text-xs text-slate-400 font-semibold px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
          #{item.perfil_competencia_id}
        </span>
      ),
    },
    {
      key: 'codigo_pc',
      header: 'Código PC',
      sortable: true,
      className: 'w-32',
      render: (item) => (
        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-cyan-950/60 text-cyan-300 border border-cyan-800/50 shadow-sm inline-block">
          {item.codigo_pc}
        </span>
      ),
    },
    {
      key: 'perfil',
      header: 'Perfil de Competencias',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2.5">
          <span
            className={`font-semibold text-xs px-3 py-1 rounded-lg border shadow-sm ${getSemanticBadgeClass(
              item.perfil
            )}`}
          >
            {item.perfil}
          </span>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Clasificación funcional de competencias
          </span>
        </div>
      ),
    },
    {
      key: 'activo',
      header: 'Colaboradores Asignados',
      sortable: true,
      render: (item) => {
        const count = getAssociatedEmployeesCount(item.codigo_pc);
        return (
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${
              count > 0
                ? 'bg-slate-800/90 text-slate-200 border-slate-700'
                : 'bg-slate-900/40 text-slate-500 border-slate-800/60'
            }`}
          >
            <Users className="w-3 h-3 text-cyan-400" />
            <span>{count}</span>
            <span className="text-[10px] text-slate-400 font-normal">
              {count === 1 ? 'colaborador' : 'colaboradores'}
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
            title="Editar perfil"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => openDeleteDialog(item)}
            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
            title="Eliminar perfil"
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
            <Award className="w-6 h-6 text-cyan-400" />
            Catálogo Maestro de Perfiles de Competencias
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Catálogo PC (Código_PC) para segmentación por competencias del personal (Administrativo, Líder, Operativo)
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-glow transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Perfil</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Perfiles
            </span>
            <Award className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{perfiles.length}</p>
          <span className="text-[11px] text-slate-500">Perfiles en catálogo</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Activos
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2">{totalActivos}</p>
          <span className="text-[11px] text-slate-500">Disponibles para asignación</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
              Personal con Perfil
            </span>
            <UserCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-cyan-400 mt-2">{totalEmpleadosConPerfil}</p>
          <span className="text-[11px] text-slate-500">De {empleados.length} colaboradores</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Pendientes PC
            </span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-2">
            {empleados.length - totalEmpleadosConPerfil}
          </p>
          <span className="text-[11px] text-slate-500">Sin perfil de competencias</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold">Filtros de Catálogo:</span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
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
        searchKeys={['codigo_pc', 'perfil']}
        searchPlaceholder="Buscar por código (PC-0001) o nombre (Líder, Administrativo)..."
        exportFilename="catalogo_perfiles_competencias"
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Nuevo Perfil de Competencia' : 'Editar Perfil'}
        subtitle="Catálogo Maestro PC (Perfiles de Competencias)"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Código de Perfil
              </div>
              <div className="text-base font-mono font-bold text-cyan-300 mt-0.5">
                {codigoPc}
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {modalMode === 'create' ? 'Autogenerado' : 'Asignado'}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Código PC *
            </label>
            <input
              type="text"
              required
              value={codigoPc}
              onChange={(e) => setCodigoPc(e.target.value.toUpperCase())}
              placeholder="Ej. PC-0004"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-cyan-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">Formato secuencial sugerido: PC-XXXX (ej. PC-0004).</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nombre del Perfil de Competencias *
            </label>
            <input
              type="text"
              required
              value={perfil}
              onChange={(e) => setPerfil(e.target.value)}
              placeholder="Ej. Administrativo, Líder, Operativo, Directivo"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
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
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                <span className="ml-3 text-xs font-medium text-slate-300">
                  {activo ? 'Activo (Disponible para colaboradores)' : 'Inactivo (Deshabilitado)'}
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
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-glow transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>{modalMode === 'create' ? 'Guardar Perfil' : 'Actualizar Cambios'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Perfil de Competencias"
        message={`¿Estás seguro de que deseas eliminar el perfil "${deletingItem?.perfil}" (${deletingItem?.codigo_pc})?`}
        loading={deleting}
        confirmText="Eliminar Perfil"
        variant="danger"
      />
    </div>
  );
};
