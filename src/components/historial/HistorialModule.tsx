import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  History,
  Calendar,
  Building2,
  Briefcase,
  User,
  ArrowRight,
  Filter,
  Layers,
  LayoutList,
} from 'lucide-react';
import { historialApi, empleadosApi, cargosApi, departamentosApi } from '../../lib/insforge';
import type { HistorialCargoDepartamento, Empleado, Cargo, Departamento } from '../../lib/types';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useToast } from '../common/Toast';

export const HistorialModule: React.FC = () => {
  const toast = useToast();
  const [historial, setHistorial] = useState<HistorialCargoDepartamento[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('timeline');
  const [filtroEmpleado, setFiltroEmpleado] = useState<number | 'ALL'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [empleadoId, setEmpleadoId] = useState<number | ''>('');
  const [cargoId, setCargoId] = useState<number | ''>('');
  const [departamentoId, setDepartamentoId] = useState<number | ''>('');
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().slice(0, 10));
  const [fechaFin, setFechaFin] = useState('');
  const [motivoCambio, setMotivoCambio] = useState('');

  // Delete Dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        { data: hData, error: hErr },
        { data: eData },
        { data: cData },
        { data: dData },
      ] = await Promise.all([
        historialApi.getAll(),
        empleadosApi.getAll(),
        cargosApi.getAll(),
        departamentosApi.getAll(),
      ]);

      if (hErr) toast.error('No se pudo cargar el historial');
      setHistorial(hData || []);
      setEmpleados(eData || []);
      setCargos(cData || []);
      setDepartamentos(dData || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEmpleadoId(empleados[0]?.empleado_id || '');
    setCargoId(cargos[0]?.cargo_id || '');
    setDepartamentoId(departamentos[0]?.departamento_id || '');
    setFechaInicio(new Date().toISOString().slice(0, 10));
    setFechaFin('');
    setMotivoCambio('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empleadoId || !cargoId || !departamentoId || !fechaInicio) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await historialApi.create({
        empleado_id: Number(empleadoId),
        cargo_id: Number(cargoId),
        departamento_id: Number(departamentoId),
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin || null,
        motivo_cambio: motivoCambio.trim() || null,
      });

      if (error) {
        toast.error(error.message || 'Error al registrar el movimiento histórico');
      } else {
        toast.success('Movimiento histórico registrado exitosamente');
        setIsModalOpen(false);
        loadData();
      }
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (id: number) => {
    setDeletingId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleting(true);
    try {
      const { success, error } = await historialApi.delete(deletingId);
      if (success) {
        toast.success('Registro histórico eliminado');
        setIsDeleteDialogOpen(false);
        setDeletingId(null);
        loadData();
      } else {
        toast.error(error?.message || 'Error al eliminar el registro');
      }
    } finally {
      setDeleting(false);
    }
  };

  const getEmpleadoName = (eId: number) => {
    const emp = empleados.find((e) => e.empleado_id === eId);
    return emp ? `${emp.nombres} ${emp.apellidos} (${emp.codigo_empleado})` : `Empleado #${eId}`;
  };

  const getCargoName = (cId: number) => {
    const c = cargos.find((item) => item.cargo_id === cId);
    return c ? c.nombre : `Cargo #${cId}`;
  };

  const getDepartamentoName = (dId: number) => {
    const dep = departamentos.find((d) => d.departamento_id === dId);
    return dep ? dep.nombre : `Departamento #${dId}`;
  };

  const filteredHistorial = historial.filter((item) => {
    if (filtroEmpleado === 'ALL') return true;
    return item.empleado_id === filtroEmpleado;
  });

  const columns: Column<HistorialCargoDepartamento>[] = [
    {
      key: 'empleado_id',
      header: 'Empleado',
      sortable: true,
      render: (item) => (
        <div className="font-semibold text-slate-100">{getEmpleadoName(item.empleado_id)}</div>
      ),
    },
    {
      key: 'cargo_id',
      header: 'Cargo Desempeñado',
      sortable: true,
      render: (item) => (
        <div className="text-slate-200 font-medium">{getCargoName(item.cargo_id)}</div>
      ),
    },
    {
      key: 'departamento_id',
      header: 'Departamento',
      sortable: true,
      render: (item) => (
        <div className="text-brand-400 font-medium">{getDepartamentoName(item.departamento_id)}</div>
      ),
    },
    {
      key: 'fecha_inicio',
      header: 'Período',
      sortable: true,
      render: (item) => (
        <div className="text-xs text-slate-300">
          <span>{item.fecha_inicio}</span>
          <span className="text-slate-400 mx-1.5">➔</span>
          <span className={item.fecha_fin ? 'text-slate-300' : 'text-emerald-400 font-semibold'}>
            {item.fecha_fin || 'Actualmente'}
          </span>
        </div>
      ),
    },
    {
      key: 'motivo_cambio',
      header: 'Motivo del Movimiento',
      render: (item) => (
        <div className="text-xs text-slate-400 italic">
          {item.motivo_cambio || 'Sin motivo especificado'}
        </div>
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      className: 'text-right',
      render: (item) => (
        <button
          onClick={() => openDeleteDialog(item.historial_id)}
          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
          title="Eliminar registro"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <History className="w-6 h-6 text-brand-400" />
            Historial de Traslados, Ascensos y Movimientos
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Registro cronológico de rotaciones internas, promociones de cargo y reasignaciones departamentales.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1">
            <button
              onClick={() => setViewMode('timeline')}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Vista Línea de Tiempo"
            >
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">Cronología</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'table'
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Vista Tabla"
            >
              <LayoutList className="w-4 h-4" />
              <span className="hidden sm:inline">Tabla</span>
            </button>
          </div>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-glow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Movimiento</span>
          </button>
        </div>
      </div>

      {/* Filter by employee */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="text-xs text-slate-400 font-medium">Filtrar por Colaborador:</span>
        <select
          value={filtroEmpleado}
          onChange={(e) =>
            setFiltroEmpleado(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
          }
          className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-brand-500"
        >
          <option value="ALL">Todos los Colaboradores</option>
          {[...empleados]
            .sort((a, b) => `${a.nombres} ${a.apellidos}`.localeCompare(`${b.nombres} ${b.apellidos}`, 'es', { sensitivity: 'base' }))
            .map((emp) => (
              <option key={emp.empleado_id} value={emp.empleado_id}>
                {emp.nombres} {emp.apellidos} ({emp.codigo_empleado})
              </option>
            ))}
        </select>
      </div>

      {/* Content depending on view mode */}
      {viewMode === 'table' ? (
        <DataTable
          data={filteredHistorial}
          columns={columns}
          loading={loading}
          searchKeys={['motivo_cambio']}
          searchPlaceholder="Buscar en historial..."
          exportFilename="historial_movimientos_th"
        />
      ) : (
        <div className="glass-card rounded-2xl p-6 shadow-xl">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 bg-slate-800/40 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : filteredHistorial.length > 0 ? (
            <div className="relative pl-6 border-l-2 border-slate-800 space-y-8 my-2">
              {filteredHistorial.map((item) => (
                <div key={item.historial_id} className="relative group">
                  {/* Dot */}
                  <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-brand-500 border-4 border-slate-950 shadow-glow" />

                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-brand-500/40 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5 mb-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                          <User className="w-4 h-4 text-brand-400" />
                          {getEmpleadoName(item.empleado_id)}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg">
                          {item.fecha_inicio} {item.fecha_fin ? `➔ ${item.fecha_fin}` : '➔ Actual'}
                        </span>
                        <button
                          onClick={() => openDeleteDialog(item.historial_id)}
                          className="text-slate-400 hover:text-rose-400 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Briefcase className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span>Cargo: <strong className="text-white">{getCargoName(item.cargo_id)}</strong></span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-300">
                        <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Departamento: <strong className="text-white">{getDepartamentoName(item.departamento_id)}</strong></span>
                      </div>
                    </div>

                    {item.motivo_cambio && (
                      <div className="mt-3 pt-2 text-xs text-slate-400 border-t border-slate-800/60">
                        <span className="font-semibold text-slate-300">Motivo: </span>
                        {item.motivo_cambio}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              <History className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-medium text-slate-300">No se encontraron movimientos registrados</p>
              <p className="text-xs text-slate-400 mt-1">Registra ascensos o traslados para visualizar la línea de tiempo.</p>
            </div>
          )}
        </div>
      )}

      {/* Create Movement Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Movimiento o Ascenso"
        subtitle="Trazabilidad y control histórico del personal"
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Colaborador *
            </label>
            <select
              required
              value={empleadoId}
              onChange={(e) => setEmpleadoId(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-brand-500"
            >
              <option value="" disabled>-- Selecciona un Colaborador --</option>
              {[...empleados]
                .sort((a, b) => `${a.nombres} ${a.apellidos}`.localeCompare(`${b.nombres} ${b.apellidos}`, 'es', { sensitivity: 'base' }))
                .map((emp) => (
                  <option key={emp.empleado_id} value={emp.empleado_id}>
                    {emp.nombres} {emp.apellidos} ({emp.codigo_empleado})
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Cargo Ocupado *
              </label>
              <select
                required
                value={cargoId}
                onChange={(e) => setCargoId(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              >
                <option value="" disabled>-- Selecciona el Cargo --</option>
                {cargos.map((c) => (
                  <option key={c.cargo_id} value={c.cargo_id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Departamento *
              </label>
              <select
                required
                value={departamentoId}
                onChange={(e) => setDepartamentoId(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              >
                <option value="" disabled>-- Selecciona Departamento --</option>
                {departamentos.map((d) => (
                  <option key={d.departamento_id} value={d.departamento_id}>
                    {d.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Fecha de Inicio *
              </label>
              <input
                type="date"
                required
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Fecha de Fin (Opcional)
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Motivo del Cambio / Detalle de la Promoción
            </label>
            <textarea
              rows={3}
              value={motivoCambio}
              onChange={(e) => setMotivoCambio(e.target.value)}
              placeholder="Ej. Promoción a Líder Técnico tras evaluación de desempeño anual..."
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
              <span>Registrar Movimiento</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Registro Histórico"
        message="¿Estás seguro de que deseas eliminar este registro del historial laboral?"
        loading={deleting}
        confirmText="Eliminar Registro"
      />
    </div>
  );
};
