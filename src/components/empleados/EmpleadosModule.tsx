import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Users,
  Eye,
  Mail,
  Phone,
  Calendar,
  Building2,
  Briefcase,
  Shield,
  Filter,
  CheckCircle,
  Clock,
  UserCheck,
} from 'lucide-react';
import { empleadosApi, cargosApi, departamentosApi } from '../../lib/insforge';
import type { Empleado, Cargo, Departamento, EstadoLaboral } from '../../lib/types';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EstadoLaboralBadge } from '../common/Badge';
import { useToast } from '../common/Toast';

interface EmpleadosModuleProps {
  initialCreateOpen?: boolean;
  onResetInitialOpen?: () => void;
}

export const EmpleadosModule: React.FC<EmpleadosModuleProps> = ({
  initialCreateOpen = false,
  onResetInitialOpen,
}) => {
  const toast = useToast();
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filtroDepartamento, setFiltroDepartamento] = useState<number | 'ALL'>('ALL');
  const [filtroCargo, setFiltroCargo] = useState<number | 'ALL'>('ALL');
  const [filtroEstado, setFiltroEstado] = useState<string>('ALL');

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null);
  const [saving, setSaving] = useState(false);

  // Detail Modal State
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailEmpleado, setDetailEmpleado] = useState<Empleado | null>(null);

  // Form Fields
  const [codigoEmpleado, setCodigoEmpleado] = useState('');
  const [documentoIdentidad, setDocumentoIdentidad] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [cargoId, setCargoId] = useState<number | ''>('');
  const [departamentoId, setDepartamentoId] = useState<number | ''>('');
  const [supervisorDirectoId, setSupervisorDirectoId] = useState<number | ''>('');
  const [evaluadorId, setEvaluadorId] = useState<number | ''>('');
  const [fechaIngreso, setFechaIngreso] = useState(new Date().toISOString().slice(0, 10));
  const [estadoLaboral, setEstadoLaboral] = useState<EstadoLaboral>('ACTIVO');

  // Delete Dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingEmpleado, setDeletingEmpleado] = useState<Empleado | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        { data: eData, error: eErr },
        { data: cData, error: cErr },
        { data: dData, error: dErr },
      ] = await Promise.all([
        empleadosApi.getAll(),
        cargosApi.getAll(),
        departamentosApi.getAll(),
      ]);

      if (eErr) toast.error('No se pudieron cargar los colaboradores');
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

  useEffect(() => {
    if (initialCreateOpen) {
      openCreateModal();
      if (onResetInitialOpen) onResetInitialOpen();
    }
  }, [initialCreateOpen]);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedEmpleado(null);
    const nextNum = (empleados.length + 1).toString().padStart(4, '0');
    setCodigoEmpleado(`EMP-${nextNum}`);
    setDocumentoIdentidad(`V${Math.floor(10000000 + Math.random() * 90000000)}`);
    setNombres('');
    setApellidos('');
    setEmail('');
    setTelefono('+58414' + Math.floor(1000000 + Math.random() * 9000000));
    setCargoId(cargos[0]?.cargo_id || '');
    setDepartamentoId(departamentos[0]?.departamento_id || '');
    setSupervisorDirectoId('');
    setEvaluadorId('');
    setFechaIngreso(new Date().toISOString().slice(0, 10));
    setEstadoLaboral('ACTIVO');
    setIsModalOpen(true);
  };

  const openEditModal = (emp: Empleado) => {
    setModalMode('edit');
    setSelectedEmpleado(emp);
    setCodigoEmpleado(emp.codigo_empleado);
    setDocumentoIdentidad(emp.documento_identidad || '');
    setNombres(emp.nombres);
    setApellidos(emp.apellidos);
    setEmail(emp.email);
    setTelefono(emp.telefono || '');
    setCargoId(emp.cargo_id);
    setDepartamentoId(emp.departamento_id);
    setSupervisorDirectoId(emp.supervisor_directo_id || '');
    setEvaluadorId(emp.evaluador_id || '');
    setFechaIngreso(emp.fecha_ingreso ? emp.fecha_ingreso.slice(0, 10) : '');
    setEstadoLaboral(emp.estado_laboral);
    setIsModalOpen(true);
  };

  const openDetailModal = (emp: Empleado) => {
    setDetailEmpleado(emp);
    setIsDetailOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoEmpleado.trim() || !nombres.trim() || !apellidos.trim() || !email.trim() || !cargoId || !departamentoId) {
      toast.error('Por favor completa todos los campos requeridos (*)');
      return;
    }

    setSaving(true);
    try {
      if (modalMode === 'create') {
        const { data, error } = await empleadosApi.create({
          codigo_empleado: codigoEmpleado.trim().toUpperCase(),
          documento_identidad: documentoIdentidad.trim() || null,
          nombres: nombres.trim(),
          apellidos: apellidos.trim(),
          email: email.trim().toLowerCase(),
          telefono: telefono.trim() || null,
          cargo_id: Number(cargoId),
          departamento_id: Number(departamentoId),
          supervisor_directo_id: supervisorDirectoId ? Number(supervisorDirectoId) : null,
          evaluador_id: evaluadorId ? Number(evaluadorId) : null,
          fecha_ingreso: fechaIngreso,
          estado_laboral: estadoLaboral,
        });

        if (error) {
          toast.error(error.message || 'Error al registrar al empleado');
        } else {
          toast.success('Empleado registrado exitosamente');
          setIsModalOpen(false);
          loadData();
        }
      } else if (selectedEmpleado) {
        const { data, error } = await empleadosApi.update(selectedEmpleado.empleado_id, {
          codigo_empleado: codigoEmpleado.trim().toUpperCase(),
          documento_identidad: documentoIdentidad.trim() || null,
          nombres: nombres.trim(),
          apellidos: apellidos.trim(),
          email: email.trim().toLowerCase(),
          telefono: telefono.trim() || null,
          cargo_id: Number(cargoId),
          departamento_id: Number(departamentoId),
          supervisor_directo_id: supervisorDirectoId ? Number(supervisorDirectoId) : null,
          evaluador_id: evaluadorId ? Number(evaluadorId) : null,
          fecha_ingreso: fechaIngreso,
          estado_laboral: estadoLaboral,
        });

        if (error) {
          toast.error(error.message || 'Error al actualizar al empleado');
        } else {
          toast.success('Ficha del empleado actualizada correctamente');
          setIsModalOpen(false);
          loadData();
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (emp: Empleado) => {
    setDeletingEmpleado(emp);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingEmpleado) return;
    setDeleting(true);
    try {
      const { success, error } = await empleadosApi.delete(deletingEmpleado.empleado_id);
      if (success) {
        toast.success(`Empleado ${deletingEmpleado.nombres} ${deletingEmpleado.apellidos} eliminado`);
        setIsDeleteDialogOpen(false);
        setDeletingEmpleado(null);
        loadData();
      } else {
        toast.error(
          error?.message?.includes('violates foreign key')
            ? 'No se puede eliminar el empleado porque está asignado como director, gerente, jefe o supervisor de otros colaboradores. Reasigna esas responsabilidades primero.'
            : error?.message || 'Error al eliminar el empleado'
        );
      }
    } finally {
      setDeleting(false);
    }
  };

  const getCargoName = (cId: number) => {
    const cargo = cargos.find((c) => c.cargo_id === cId);
    return cargo ? cargo.nombre : `Cargo #${cId}`;
  };

  const getDepartamentoName = (dId: number) => {
    const dep = departamentos.find((d) => d.departamento_id === dId);
    return dep ? dep.nombre : `Departamento #${dId}`;
  };

  const getEmpleadoFullName = (eId: number | null) => {
    if (!eId) return null;
    const emp = empleados.find((e) => e.empleado_id === eId);
    return emp ? `${emp.nombres} ${emp.apellidos}` : `Empleado #${eId}`;
  };

  // Filtered List
  const filteredEmpleados = empleados.filter((emp) => {
    if (filtroDepartamento !== 'ALL' && emp.departamento_id !== filtroDepartamento) return false;
    if (filtroCargo !== 'ALL' && emp.cargo_id !== filtroCargo) return false;
    if (filtroEstado !== 'ALL' && emp.estado_laboral !== filtroEstado) return false;
    return true;
  });

  const columns: Column<Empleado>[] = [
    {
      key: 'codigo_empleado',
      header: 'Código / Cédula',
      sortable: true,
      render: (item) => (
        <div>
          <span className="font-mono font-bold text-brand-300 text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
            {item.codigo_empleado}
          </span>
          {item.documento_identidad && (
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              {item.documento_identidad}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'nombres',
      header: 'Colaborador',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 p-0.5 text-xs font-bold text-white flex items-center justify-center shrink-0">
            <span className="bg-slate-900 w-full h-full rounded-full flex items-center justify-center">
              {item.nombres.charAt(0)}
            </span>
          </div>
          <div>
            <div className="font-semibold text-slate-100">{item.nombres} {item.apellidos}</div>
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <Mail className="w-3 h-3 text-slate-400" />
              <span>{item.email}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'cargo_id',
      header: 'Cargo & Departamento',
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-medium text-slate-200">{getCargoName(item.cargo_id)}</div>
          <div className="text-xs text-brand-400/90">{getDepartamentoName(item.departamento_id)}</div>
        </div>
      ),
    },
    {
      key: 'supervisor_directo_id',
      header: 'Línea de Mando',
      render: (item) => {
        const supervisor = getEmpleadoFullName(item.supervisor_directo_id);
        const evaluador = getEmpleadoFullName(item.evaluador_id);
        const hasSpecialEvaluator = item.evaluador_id && item.evaluador_id !== item.supervisor_directo_id;

        return (
          <div className="text-xs space-y-0.5">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Sup: </span>
              <span className="text-slate-200">{supervisor || <em className="text-slate-400">Directorio</em>}</span>
            </div>
            {hasSpecialEvaluator && (
              <div className="text-amber-400">
                <span className="text-[10px] uppercase font-semibold">Eval. Especial: </span>
                <span>{evaluador}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'estado_laboral',
      header: 'Estado',
      sortable: true,
      render: (item) => <EstadoLaboralBadge estado={item.estado_laboral} />,
    },
    {
      key: 'acciones',
      header: 'Acciones',
      className: 'text-right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => openDetailModal(item)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 border border-slate-700 transition-colors"
            title="Ver Ficha Ejecutiva"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => openEditModal(item)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            title="Editar empleado"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => openDeleteDialog(item)}
            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
            title="Eliminar empleado"
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
            <Users className="w-6 h-6 text-brand-400" />
            Ficha Maestra de Empleados
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gestión completa de colaboradores, asignación departamental, supervisión directa y evaluación de desempeño.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-glow transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Empleado</span>
        </button>
      </div>

      {/* Multi-Filters bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <Filter className="w-3.5 h-3.5" />
          <span>Filtros:</span>
        </div>

        {/* Dept filter */}
        <select
          value={filtroDepartamento}
          onChange={(e) =>
            setFiltroDepartamento(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
          }
          className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-brand-500"
        >
          <option value="ALL">Todos los Departamentos</option>
          {departamentos.map((d) => (
            <option key={d.departamento_id} value={d.departamento_id}>
              {d.nombre}
            </option>
          ))}
        </select>

        {/* Cargo filter */}
        <select
          value={filtroCargo}
          onChange={(e) =>
            setFiltroCargo(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
          }
          className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-brand-500"
        >
          <option value="ALL">Todos los Cargos</option>
          {cargos.map((c) => (
            <option key={c.cargo_id} value={c.cargo_id}>
              {c.nombre}
            </option>
          ))}
        </select>

        {/* Estado filter */}
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-brand-500"
        >
          <option value="ALL">Todos los Estados</option>
          <option value="ACTIVO">ACTIVO</option>
          <option value="INACTIVO">INACTIVO</option>
          <option value="VACACIONES">VACACIONES</option>
          <option value="LICENCIA">LICENCIA</option>
        </select>

        {(filtroDepartamento !== 'ALL' || filtroCargo !== 'ALL' || filtroEstado !== 'ALL') && (
          <button
            onClick={() => {
              setFiltroDepartamento('ALL');
              setFiltroCargo('ALL');
              setFiltroEstado('ALL');
            }}
            className="text-xs text-brand-400 hover:text-brand-300 font-medium ml-auto"
          >
            Restablecer filtros
          </button>
        )}
      </div>

      {/* DataTable */}
      <DataTable
        data={filteredEmpleados}
        columns={columns}
        loading={loading}
        searchKeys={['codigo_empleado', 'documento_identidad', 'nombres', 'apellidos', 'email', 'telefono']}
        searchPlaceholder="Buscar por código, cédula, nombres, correo..."
        exportFilename="empleados_ficha_maestra"
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Registrar Nuevo Empleado' : 'Editar Ficha de Empleado'}
        subtitle="Datos Personales, Posición Organizacional y Línea de Supervisión"
        maxWidth="2xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Código de Empleado *
              </label>
              <input
                type="text"
                required
                value={codigoEmpleado}
                onChange={(e) => setCodigoEmpleado(e.target.value)}
                placeholder="EMP-0006"
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Documento de Identidad / Cédula
              </label>
              <input
                type="text"
                value={documentoIdentidad}
                onChange={(e) => setDocumentoIdentidad(e.target.value)}
                placeholder="V12345678"
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nombres *
              </label>
              <input
                type="text"
                required
                value={nombres}
                onChange={(e) => setNombres(e.target.value)}
                placeholder="Carlos"
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Apellidos *
              </label>
              <input
                type="text"
                required
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                placeholder="Mendoza"
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Correo Electrónico Corporativo *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="carlos.mendoza@empresa.com"
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Teléfono de Contacto
              </label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+584141112233"
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Cargo / Puesto *
              </label>
              <select
                required
                value={cargoId}
                onChange={(e) => setCargoId(Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              >
                <option value="" disabled>-- Selecciona un Cargo --</option>
                {cargos.map((c) => (
                  <option key={c.cargo_id} value={c.cargo_id}>
                    {c.nombre} ({c.codigo})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Departamento Asignado (Nivel 3) *
              </label>
              <select
                required
                value={departamentoId}
                onChange={(e) => setDepartamentoId(Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              >
                <option value="" disabled>-- Selecciona un Departamento --</option>
                {departamentos.map((d) => (
                  <option key={d.departamento_id} value={d.departamento_id}>
                    {d.nombre} ({d.codigo})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Supervisor Directo (Mando Inmediato)
              </label>
              <select
                value={supervisorDirectoId}
                onChange={(e) => setSupervisorDirectoId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              >
                <option value="">-- Sin supervisor (Directorio Máximo) --</option>
                {empleados
                  .filter((e) => !selectedEmpleado || e.empleado_id !== selectedEmpleado.empleado_id)
                  .map((emp) => (
                    <option key={emp.empleado_id} value={emp.empleado_id}>
                      {emp.nombres} {emp.apellidos} ({emp.codigo_empleado})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Evaluador de Desempeño Específico
              </label>
              <select
                value={evaluadorId}
                onChange={(e) => setEvaluadorId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              >
                <option value="">-- Por defecto (Mismo Supervisor Directo) --</option>
                {empleados
                  .filter((e) => !selectedEmpleado || e.empleado_id !== selectedEmpleado.empleado_id)
                  .map((emp) => (
                    <option key={emp.empleado_id} value={emp.empleado_id}>
                      {emp.nombres} {emp.apellidos} ({emp.codigo_empleado})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Fecha de Ingreso *
              </label>
              <input
                type="date"
                required
                value={fechaIngreso}
                onChange={(e) => setFechaIngreso(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Estado Laboral *
              </label>
              <select
                required
                value={estadoLaboral}
                onChange={(e) => setEstadoLaboral(e.target.value as EstadoLaboral)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              >
                <option value="ACTIVO">ACTIVO</option>
                <option value="INACTIVO">INACTIVO</option>
                <option value="VACACIONES">VACACIONES</option>
                <option value="LICENCIA">LICENCIA</option>
              </select>
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
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-glow transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>{modalMode === 'create' ? 'Guardar Empleado' : 'Actualizar Ficha'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      {detailEmpleado && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title="Ficha Ejecutiva del Colaborador"
          subtitle={`Expediente #${detailEmpleado.codigo_empleado}`}
          maxWidth="lg"
        >
          <div className="space-y-6">
            {/* Header card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-950/80 to-slate-900 border border-brand-500/30 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-600/30 border border-brand-500/40 flex items-center justify-center text-brand-300 text-xl font-bold">
                {detailEmpleado.nombres.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">
                  {detailEmpleado.nombres} {detailEmpleado.apellidos}
                </h3>
                <p className="text-xs text-brand-300 font-medium">
                  {getCargoName(detailEmpleado.cargo_id)}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <EstadoLaboralBadge estado={detailEmpleado.estado_laboral} />
                  <span className="text-[10px] text-slate-400 font-mono">
                    ID: {detailEmpleado.documento_identidad || 'Sin DNI'}
                  </span>
                </div>
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block mb-1">Correo Electrónico</span>
                <span className="text-slate-200 font-medium break-all">{detailEmpleado.email}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block mb-1">Teléfono</span>
                <span className="text-slate-200 font-medium">{detailEmpleado.telefono || 'No registrado'}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block mb-1">Departamento</span>
                <span className="text-slate-200 font-medium">{getDepartamentoName(detailEmpleado.departamento_id)}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block mb-1">Fecha de Ingreso</span>
                <span className="text-slate-200 font-medium">
                  {detailEmpleado.fecha_ingreso ? detailEmpleado.fecha_ingreso.slice(0, 10) : '-'}
                </span>
              </div>
            </div>

            {/* Line of command */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Estructura de Supervisión & Evaluación
              </h4>

              <div className="flex items-center justify-between text-xs py-1 border-b border-slate-800">
                <span className="text-slate-400">Supervisor Directo:</span>
                <span className="text-slate-200 font-semibold">
                  {getEmpleadoFullName(detailEmpleado.supervisor_directo_id) || 'Directorio Ejecutivo'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-400">Evaluador de Desempeño:</span>
                <span className="text-slate-200 font-semibold">
                  {detailEmpleado.evaluador_id
                    ? getEmpleadoFullName(detailEmpleado.evaluador_id)
                    : getEmpleadoFullName(detailEmpleado.supervisor_directo_id) || 'Supervisor Directo'}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
              >
                Cerrar Expediente
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Empleado"
        message={`¿Estás seguro de que deseas eliminar permanentemente a ${deletingEmpleado?.nombres} ${deletingEmpleado?.apellidos}?`}
        loading={deleting}
        confirmText="Eliminar Empleado"
      />
    </div>
  );
};
