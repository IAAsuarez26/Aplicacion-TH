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
  CheckCircle2,
  Clock,
  UserCheck,
  UserPlus,
  Layers,
  DollarSign,
  Coins,
} from 'lucide-react';
import { empleadosApi, cargosApi, departamentosApi, tabuladorApi, tipoCostosApi } from '../../lib/insforge';
import type { Empleado, Cargo, Departamento, TabuladorEmpresa, TipoCosto, EstadoLaboral } from '../../lib/types';
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
  const [tipoCostos, setTipoCostos] = useState<TipoCosto[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filtroDepartamento, setFiltroDepartamento] = useState<string | 'ALL'>('ALL');
  const [filtroCargo, setFiltroCargo] = useState<string | 'ALL'>('ALL');
  const [filtroTipoCosto, setFiltroTipoCosto] = useState<string | 'ALL'>('ALL');
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
  const [emailCorporativo, setEmailCorporativo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [codigoCargo, setCodigoCargo] = useState<string>('');
  const [codigoDepartamento, setCodigoDepartamento] = useState<string>('');
  const [codigoTc, setCodigoTc] = useState<string>('');
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
        { data: tcData },
      ] = await Promise.all([
        empleadosApi.getAll(),
        cargosApi.getAll(),
        departamentosApi.getAll(),
        tabuladorApi.getAll(),
        tipoCostosApi.getAll(),
      ]);

      if (eErr) toast.error('No se pudieron cargar los colaboradores');
      setEmpleados(eData || []);
      setCargos(cData || []);
      setDepartamentos(dData || []);
      setTabuladores(tData || []);
      setTipoCostos(tcData || []);
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
    let maxEmpNum = 0;
    for (const emp of empleados) {
      if (emp.codigo_empleado) {
        const match = emp.codigo_empleado.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (!isNaN(num) && num > maxEmpNum) maxEmpNum = num;
        }
      }
    }
    const nextNum = (maxEmpNum > 0 ? maxEmpNum + 1 : empleados.length + 1).toString().padStart(4, '0');
    setCodigoEmpleado(`EMP-${nextNum}`);
    setDocumentoIdentidad(`V${Math.floor(10000000 + Math.random() * 90000000)}`);
    setNombres('');
    setApellidos('');
    setEmail('');
    setEmailCorporativo('');
    setTelefono('+58414' + Math.floor(1000000 + Math.random() * 9000000));
    setCodigoCargo(cargos[0]?.codigo || '');
    setCodigoDepartamento(departamentos[0]?.codigo || '');
    setCodigoTc('');
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
    setEmailCorporativo(emp.email_corporativo || '');
    setTelefono(emp.telefono || '');
    setCodigoCargo(emp.codigo_cargo);
    setCodigoDepartamento(emp.codigo_departamento);
    setCodigoTc(emp.codigo_tc || '');
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
    if (!codigoEmpleado.trim() || !nombres.trim() || !apellidos.trim() || !email.trim() || !codigoCargo || !codigoDepartamento) {
      toast.error('Por favor completa todos los campos requeridos (*)');
      return;
    }

    setSaving(true);
    try {
      if (modalMode === 'create') {
        const { data, error } = await empleadosApi.create({
          codigo_empleado: codigoEmpleado.trim(),
          documento_identidad: documentoIdentidad.trim() || null,
          nombres: nombres.trim(),
          apellidos: apellidos.trim(),
          email: email.trim().toLowerCase(),
          email_corporativo: emailCorporativo.trim().toLowerCase() || null,
          telefono: telefono.trim() || null,
          codigo_cargo: codigoCargo.trim(),
          codigo_departamento: codigoDepartamento.trim(),
          codigo_tc: codigoTc ? codigoTc.trim() : null,
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
          codigo_empleado: codigoEmpleado.trim(),
          documento_identidad: documentoIdentidad.trim() || null,
          nombres: nombres.trim(),
          apellidos: apellidos.trim(),
          email: email.trim().toLowerCase(),
          email_corporativo: emailCorporativo.trim().toLowerCase() || null,
          telefono: telefono.trim() || null,
          codigo_cargo: codigoCargo.trim(),
          codigo_departamento: codigoDepartamento.trim(),
          codigo_tc: codigoTc ? codigoTc.trim() : null,
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
        toast.error(error?.message || 'Error al eliminar al empleado');
      }
    } finally {
      setDeleting(false);
    }
  };

  const getCargoName = (code: string) => {
    const cargo = cargos.find((c) => c.codigo === code);
    return cargo ? cargo.nombre : code;
  };

  const getDepartamentoName = (code: string) => {
    const depto = departamentos.find((d) => d.codigo === code);
    return depto ? depto.nombre : code;
  };

  const getEmpleadoFullName = (empId: number | null) => {
    if (!empId) return null;
    const emp = empleados.find((e) => e.empleado_id === empId);
    return emp ? `${emp.nombres} ${emp.apellidos}` : `Empleado #${empId}`;
  };

  const getTabuladorInfo = (tabId?: number | null) => {
    if (!tabId) return null;
    return tabuladores.find((t) => t.tabulador_id === tabId);
  };

  const getTipoCostoInfo = (codigo_tc?: string | null) => {
    if (!codigo_tc) return null;
    return tipoCostos.find((tc) => tc.codigo_tc === codigo_tc);
  };

  const filteredEmpleados = empleados.filter((emp) => {
    if (filtroDepartamento !== 'ALL' && emp.codigo_departamento !== filtroDepartamento) return false;
    if (filtroCargo !== 'ALL' && emp.codigo_cargo !== filtroCargo) return false;
    if (filtroTipoCosto !== 'ALL' && emp.codigo_tc !== filtroTipoCosto) return false;
    if (filtroEstado !== 'ALL' && emp.estado_laboral !== filtroEstado) return false;
    return true;
  });

  const columns: Column<Empleado>[] = [
    {
      key: 'codigo_empleado',
      header: 'Código / DNI',
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
            {row.telefono && (
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-500" />
                <span>{row.telefono}</span>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      render: (row) => (
        <div className="text-xs text-slate-300 flex items-center gap-1.5 font-mono">
          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate max-w-[150px]" title={row.email}>{row.email}</span>
        </div>
      ),
    },
    {
      key: 'codigo_cargo',
      header: 'Cargo & Departamento',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-medium text-slate-200">{getCargoName(row.codigo_cargo)}</div>
          <div className="text-xs text-brand-400/90">{getDepartamentoName(row.codigo_departamento)}</div>
        </div>
      ),
    },
    {
      key: 'codigo_tc',
      header: 'Tipo de Costo',
      sortable: true,
      render: (row) => {
        const tc = getTipoCostoInfo(row.codigo_tc);
        return tc ? (
          <div className="flex items-center gap-1.5">
            <span
              className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md border ${
                tc.nombre === 'MOD'
                  ? 'bg-amber-950/60 border-amber-800/60 text-amber-300'
                  : tc.nombre === 'MOI'
                  ? 'bg-blue-950/60 border-blue-800/60 text-blue-300'
                  : 'bg-purple-950/60 border-purple-800/60 text-purple-300'
              }`}
            >
              {tc.nombre}
            </span>
            <span className="text-[11px] text-slate-400 hidden lg:inline" title={tc.descripcion || ''}>
              ({tc.codigo_tc})
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-500 italic">Sin asignar</span>
        );
      },
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
              <span className="text-[10px] text-slate-400">
                (${tab.salario_minimo_80.toLocaleString()} - ${tab.salario_maximo_120.toLocaleString()})
              </span>
            </div>
          </div>
        ) : (
          <span className="text-xs text-slate-500 italic">Sin Banda</span>
        );
      },
    },
    {
      key: 'supervisor_directo_id',
      header: 'Línea de Mando',
      render: (row) => {
        const supName = getEmpleadoFullName(row.supervisor_directo_id);
        const evalName = getEmpleadoFullName(row.evaluador_id);
        return (
          <div className="space-y-1 text-xs">
            {supName ? (
              <div className="text-slate-300 flex items-center gap-1">
                <span className="text-slate-500 font-semibold text-[10px] uppercase">Sup:</span>
                <span className="truncate max-w-[140px]">{supName}</span>
              </div>
            ) : (
              <span className="text-slate-500 italic block">Sin supervisor</span>
            )}
            {evalName && evalName !== supName && (
              <div className="text-brand-400 flex items-center gap-1 text-[11px]">
                <span className="text-brand-500/70 font-semibold text-[10px] uppercase">Eval:</span>
                <span className="truncate max-w-[140px]">{evalName}</span>
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
      className: 'w-28',
    },
    {
      key: 'acciones',
      header: 'Acciones',
      className: 'text-right w-28',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => openDetailModal(row)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            title="Ver expediente completo"
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
            title="Eliminar colaborador"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-brand-400" />
            Directorio y Ficha Maestra de Personal
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Gestión integral de colaboradores, cargos, bandas salariales, tipo de costo y línea de supervisión.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-glow transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Registrar Empleado</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Plantilla</span>
            <Users className="w-4 h-4 text-brand-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{empleados.length}</p>
          <span className="text-[11px] text-slate-500">Colaboradores registrados</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Activos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2">
            {empleados.filter((e) => e.estado_laboral === 'ACTIVO').length}
          </p>
          <span className="text-[11px] text-slate-500">En funciones operativas</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Tipos de Costo</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-2">
            {empleados.filter((e) => e.codigo_tc).length}
          </p>
          <span className="text-[11px] text-slate-500">MOD / MOI / Gastos</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Tabulador Asignado</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-indigo-400 mt-2">
            {empleados.filter((e) => e.tabulador_id).length}
          </p>
          <span className="text-[11px] text-slate-500">Con banda y percentiles</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <Filter className="w-4 h-4 text-brand-400" />
          <span>Filtros rápidos:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Departamento Filter */}
          <select
            value={filtroDepartamento}
            onChange={(e) => setFiltroDepartamento(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-brand-500"
          >
            <option value="ALL">Todos los Departamentos</option>
            {[...departamentos]
              .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
              .map((d) => (
                <option key={d.codigo} value={d.codigo}>
                  {d.nombre} ({d.codigo})
                </option>
              ))}
          </select>

          {/* Tipo de Costo Filter */}
          <select
            value={filtroTipoCosto}
            onChange={(e) => setFiltroTipoCosto(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-brand-500"
          >
            <option value="ALL">Todos los Tipos de Costos</option>
            {tipoCostos.map((tc) => (
              <option key={tc.codigo_tc} value={tc.codigo_tc}>
                {tc.nombre} ({tc.codigo_tc}) - {tc.descripcion}
              </option>
            ))}
          </select>

          {/* Cargo Filter */}
          <select
            value={filtroCargo}
            onChange={(e) => setFiltroCargo(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-brand-500"
          >
            <option value="ALL">Todos los Cargos</option>
            {[...cargos]
              .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
              .map((c) => (
                <option key={c.codigo} value={c.codigo}>
                  {c.nombre} ({c.codigo})
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
        searchKeys={['nombres', 'apellidos', 'codigo_empleado', 'documento_identidad', 'email', 'email_corporativo', 'codigo_cargo', 'codigo_departamento', 'codigo_tc']}
        searchPlaceholder="Buscar por nombre, código, cédula, cargo o tipo de costo..."
        emptyMessage="No se encontraron colaboradores que coincidan con la búsqueda"
      />

      {/* Modal Creación / Edición */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Registrar Nuevo Colaborador' : 'Editar Ficha del Colaborador'}
        subtitle="Expediente digital de Talento Humano"
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
                placeholder="EMP-0001"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Documento de Identidad (Cédula/DNI)
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
                placeholder="Carlos Eduardo"
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
                placeholder="Mendoza Ruiz"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Correo Electrónico Personal *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="carlos.mendoza@gmail.com"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Correo Electrónico Corporativo
              </label>
              <input
                type="email"
                value={emailCorporativo}
                onChange={(e) => setEmailCorporativo(e.target.value)}
                placeholder="carlos.mendoza@empresa.com"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Teléfono de Contacto
              </label>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+58 414 1234567"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
              />
            </div>

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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Cargo *
              </label>
              <select
                required
                value={codigoCargo}
                onChange={(e) => setCodigoCargo(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
              >
                <option value="" disabled>-- Selecciona un Cargo --</option>
                {[...cargos]
                  .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
                  .map((c) => (
                    <option key={c.codigo} value={c.codigo}>
                      {c.nombre} ({c.codigo})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Departamento Asignado *
              </label>
              <select
                required
                value={codigoDepartamento}
                onChange={(e) => setCodigoDepartamento(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
              >
                <option value="" disabled>-- Selecciona un Departamento --</option>
                {[...departamentos]
                  .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
                  .map((d) => (
                    <option key={d.codigo} value={d.codigo}>
                      {d.nombre} ({d.codigo})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Tipo de Costo y Banda Salarial */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tipo de Costo (Mano de Obra / Gastos)
              </label>
              <select
                value={codigoTc}
                onChange={(e) => setCodigoTc(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">-- Sin Tipo de Costo Asignado --</option>
                {tipoCostos.map((tc) => (
                  <option key={tc.codigo_tc} value={tc.codigo_tc}>
                    {tc.codigo_tc} — {tc.nombre} ({tc.descripcion})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Banda Salarial (Tabulador)
              </label>
              <select
                value={tabuladorId}
                onChange={(e) => setTabuladorId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
              >
                <option value="">-- Sin Banda Salarial Asignada --</option>
                {tabuladores.map((t) => (
                  <option key={t.tabulador_id} value={t.tabulador_id}>
                    {t.codigo_banda} — Mediana: ${t.salario_mediana_100.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Supervisor Directo
              </label>
              <select
                value={supervisorDirectoId}
                onChange={(e) => setSupervisorDirectoId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
              >
                <option value="">-- Sin Supervisor (Máxima Autoridad) --</option>
                {[...empleados]
                  .filter((e) => (modalMode === 'edit' ? e.empleado_id !== selectedEmpleado?.empleado_id : true))
                  .sort((a, b) => `${a.nombres} ${a.apellidos}`.localeCompare(`${b.nombres} ${b.apellidos}`, 'es', { sensitivity: 'base' }))
                  .map((e) => (
                    <option key={e.empleado_id} value={e.empleado_id}>
                      {e.nombres} {e.apellidos} ({getCargoName(e.codigo_cargo)})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Evaluador de Desempeño
              </label>
              <select
                value={evaluadorId}
                onChange={(e) => setEvaluadorId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
              >
                <option value="">-- Por defecto (Mismo Supervisor) --</option>
                {[...empleados]
                  .filter((e) => (modalMode === 'edit' ? e.empleado_id !== selectedEmpleado?.empleado_id : true))
                  .sort((a, b) => `${a.nombres} ${a.apellidos}`.localeCompare(`${b.nombres} ${b.apellidos}`, 'es', { sensitivity: 'base' }))
                  .map((e) => (
                    <option key={e.empleado_id} value={e.empleado_id}>
                      {e.nombres} {e.apellidos} ({getCargoName(e.codigo_cargo)})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
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

      {/* Modal Detalle Expediente */}
      {detailEmpleado && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title="Ficha del Empleado"
          subtitle={`Expediente #${detailEmpleado.codigo_empleado}`}
          maxWidth="2xl"
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
                  {getCargoName(detailEmpleado.codigo_cargo)} ({detailEmpleado.codigo_cargo})
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
                <span className="text-slate-400 block mb-1">Correo Personal</span>
                <span className="text-slate-200 font-medium break-all">{detailEmpleado.email}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-indigo-400 block mb-1 font-semibold">Correo Corporativo</span>
                <span className="text-indigo-200 font-medium break-all">
                  {detailEmpleado.email_corporativo || <span className="text-slate-500 italic">No asignado</span>}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block mb-1">Teléfono</span>
                <span className="text-slate-200 font-medium">{detailEmpleado.telefono || 'No registrado'}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block mb-1">Fecha de Ingreso</span>
                <span className="text-slate-200 font-medium">
                  {detailEmpleado.fecha_ingreso ? detailEmpleado.fecha_ingreso.slice(0, 10) : '-'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block mb-1">Departamento</span>
                <span className="text-slate-200 font-medium">
                  {getDepartamentoName(detailEmpleado.codigo_departamento)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-amber-400 block mb-1 font-semibold">Tipo de Costo</span>
                {(() => {
                  const tc = getTipoCostoInfo(detailEmpleado.codigo_tc);
                  return tc ? (
                    <span className="text-amber-200 font-medium">
                      {tc.nombre} ({tc.descripcion})
                    </span>
                  ) : (
                    <span className="text-slate-500 italic">No asignado</span>
                  );
                })()}
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
                      Banda {tab.codigo_banda}
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
