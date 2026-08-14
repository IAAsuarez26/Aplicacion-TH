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
  Layers,
  DollarSign,
} from 'lucide-react';
import { empleadosApi, cargosApi, departamentosApi, tabuladorApi } from '../../lib/insforge';
import type { Empleado, Cargo, Departamento, TabuladorEmpresa, EstadoLaboral } from '../../lib/types';
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
  const [tabuladores, setTabuladores] = useState<TabuladorEmpresa[]>([]);
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
  const [tabuladorId, setTabuladorId] = useState<number | ''>('');
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
        { data: tData },
      ] = await Promise.all([
        empleadosApi.getAll(),
        cargosApi.getAll(),
        departamentosApi.getAll(),
        tabuladorApi.getAll(),
      ]);

      if (eErr) toast.error('No se pudieron cargar los colaboradores');
      setEmpleados(eData || []);
      setCargos(cData || []);
      setDepartamentos(dData || []);
      setTabuladores(tData || []);
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
    setTabuladorId('');
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
    setTabuladorId(emp.tabulador_id || '');
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
          tabulador_id: tabuladorId ? Number(tabuladorId) : null,
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
          tabulador_id: tabuladorId ? Number(tabuladorId) : null,
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
            ? 'No se puede eliminar este colaborador porque está asignado como líder o evaluador de otras áreas. Reasigna sus funciones primero.'
            : error?.message || 'Error al eliminar al empleado'
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

  const getTabuladorInfo = (tId?: number | null) => {
    if (!tId) return null;
    return tabuladores.find((t) => t.tabulador_id === tId) || null;
  };

  const getEmpleadoFullName = (eId: number | null | undefined) => {
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
      render: (row) => (
        <div>
          <span className="font-mono font-bold text-brand-300 text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
            {row.codigo_empleado}
          </span>
          {row.documento_identidad && (
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              {row.documento_identidad}
            </div>
          )}
        </div>
      ),
      className: 'w-32',
    },
    {
      key: 'nombres',
      header: 'Colaborador',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 p-0.5 text-xs font-bold text-white flex items-center justify-center shrink-0">
            <span className="bg-slate-900 w-full h-full rounded-full flex items-center justify-center">
              {row.nombres.charAt(0)}
            </span>
          </div>
          <div>
            <div className="font-semibold text-slate-100">{row.nombres} {row.apellidos}</div>
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <Mail className="w-3 h-3 text-slate-400" />
              <span>{row.email}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'cargo_id',
      header: 'Cargo & Departamento',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-medium text-slate-200">{getCargoName(row.cargo_id)}</div>
          <div className="text-xs text-brand-400/90">{getDepartamentoName(row.departamento_id)}</div>
        </div>
      ),
    },
    {
      key: 'tabulador_id',
      header: 'Banda Salarial',
      render: (row) => {
        const tab = getTabuladorInfo(row.tabulador_id);
        return tab ? (
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-xs px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-700/50">
                {tab.codigo_banda}
              </span>
              <span className="text-[11px] font-mono text-emerald-400 font-medium">
                ${Number(tab.salario_mediana_100).toFixed(2)}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              Cía: {tab.codigo_empresa}
            </div>
          </div>
        ) : (
          <span className="text-xs text-slate-500 italic">Sin asignar</span>
        );
      },
      className: 'w-36',
    },
    {
      key: 'supervisor_directo_id',
      header: 'Línea de Mando',
      render: (row) => {
        const supervisor = getEmpleadoFullName(row.supervisor_directo_id);
        const evaluador = getEmpleadoFullName(row.evaluador_id);
        const hasSpecialEvaluator = row.evaluador_id && row.evaluador_id !== row.supervisor_directo_id;

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
      render: (row) => <EstadoLaboralBadge estado={row.estado_laboral} />,
      className: 'w-24 text-center',
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => openDetailModal(row)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            title="Ver expediente"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => openEditModal(row)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            title="Editar ficha"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => openDeleteDialog(row)}
            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
            title="Eliminar empleado"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
      className: 'w-28 text-right',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-brand-400" />
            Directorio y Ficha Maestra de Personal
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Gestión integral de colaboradores, puestos de trabajo, bandas salariales y línea de supervisión.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-glow transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Colaborador</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Filter className="w-4 h-4 text-brand-400" />
          <span>Filtros Rápidos:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Dept Filter */}
          <select
            value={filtroDepartamento}
            onChange={(e) => setFiltroDepartamento(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-brand-500"
          >
            <option value="ALL">Todos los Departamentos</option>
            {departamentos.map((d) => (
              <option key={d.departamento_id} value={d.departamento_id}>
                {d.nombre}
              </option>
            ))}
          </select>

          {/* Cargo Filter */}
          <select
            value={filtroCargo}
            onChange={(e) => setFiltroCargo(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-brand-500"
          >
            <option value="ALL">Todos los Cargos</option>
            {cargos.map((c) => (
              <option key={c.cargo_id} value={c.cargo_id}>
                {c.nombre}
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
            <option value="ACTIVO">ACTIVO</option>
            <option value="INACTIVO">INACTIVO</option>
            <option value="VACACIONES">VACACIONES</option>
            <option value="LICENCIA">LICENCIA</option>
          </select>
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        data={filteredEmpleados}
        columns={columns}
        loading={loading}
        searchKeys={['nombres', 'apellidos', 'codigo_empleado', 'documento_identidad', 'email']}
        searchPlaceholder="Buscar por nombre, código, cédula o email..."
        emptyMessage="No se encontraron colaboradores que coincidan con la búsqueda"
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Registrar Nuevo Colaborador' : `Editar Colaborador: ${selectedEmpleado?.codigo_empleado}`}
        subtitle="Ingresa la ficha laboral, posición en tabulador y relaciones de supervisión."
        maxWidth="lg"
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
                placeholder="EMP-0001"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-brand-500"
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
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-brand-500"
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
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
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
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
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
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
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
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
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
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
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
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
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

          {/* Banda Salarial Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Banda Salarial Asignada (Tabulador)
            </label>
            <select
              value={tabuladorId}
              onChange={(e) => setTabuladorId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
            >
              <option value="">-- Sin banda salarial asignada --</option>
              {tabuladores.map((t) => (
                <option key={t.tabulador_id} value={t.tabulador_id}>
                  [{t.codigo_empresa}] Banda {t.codigo_banda} - Mediana: ${Number(t.salario_mediana_100).toFixed(2)} ({t.cargos_referencia})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Supervisor Directo (Mando Inmediato)
              </label>
              <select
                value={supervisorDirectoId}
                onChange={(e) => setSupervisorDirectoId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
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
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
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
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
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
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
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
              className="px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-glow transition-all disabled:opacity-50 flex items-center gap-2"
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

            {/* Tabulador Card */}
            {(() => {
              const tab = getTabuladorInfo(detailEmpleado.tabulador_id);
              return tab ? (
                <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      Banda Salarial Asignada
                    </h4>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-200 border border-indigo-700">
                      Banda {tab.codigo_banda} ({tab.codigo_empresa})
                    </span>
                  </div>

                  <div className="text-xs text-slate-300">
                    <span className="text-slate-400 font-medium">Cargos de Referencia: </span>
                    {tab.cargos_referencia}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-xs">
                    <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-center">
                      <div className="text-[10px] text-slate-400">Mínimo (80%)</div>
                      <div className="text-slate-300 mt-0.5">${Number(tab.salario_minimo_80).toFixed(2)}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-center">
                      <div className="text-[10px] text-emerald-400 font-semibold">Mediana (100%)</div>
                      <div className="text-emerald-300 font-bold mt-0.5">${Number(tab.salario_mediana_100).toFixed(2)}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-center">
                      <div className="text-[10px] text-slate-400">Máximo (120%)</div>
                      <div className="text-slate-300 mt-0.5">${Number(tab.salario_maximo_120).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

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
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
};
