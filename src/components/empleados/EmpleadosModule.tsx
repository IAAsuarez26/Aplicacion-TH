import React, { useState, useEffect, useMemo } from 'react';
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
  Coins,
  MapPin,
  Tag,
  Award,
  RotateCcw,
} from 'lucide-react';
import {
  empleadosApi,
  cargosApi,
  departamentosApi,
  tabuladorApi,
  tipoCostosApi,
  perfilesCompetenciasApi,
  denominacionesCargosApi,
  empresasApi,
  direccionesApi,
  gerenciasApi,
} from '../../lib/insforge';
import type {
  Empleado,
  Cargo,
  Departamento,
  TabuladorEmpresa,
  TipoCosto,
  PerfilCompetencia,
  DenominacionCargo,
  EstadoLaboral,
  Empresa,
  Direccion,
  Gerencia,
} from '../../lib/types';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EstadoLaboralBadge } from '../common/Badge';
import { useToast } from '../common/Toast';

export interface EmpleadoConEmpresa extends Empleado {
  empresa_id?: number;
  empresa_nombre?: string;
  empresa_corto?: string;
  empresa_codigo?: string;
}

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
  const [perfilesCompetencias, setPerfilesCompetencias] = useState<PerfilCompetencia[]>([]);
  const [denominaciones, setDenominaciones] = useState<DenominacionCargo[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [gerencias, setGerencias] = useState<Gerencia[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filtroEmpresa, setFiltroEmpresa] = useState<string | 'ALL'>('ALL');
  const [filtroDepartamento, setFiltroDepartamento] = useState<string | 'ALL'>('ALL');
  const [filtroCargo, setFiltroCargo] = useState<string | 'ALL'>('ALL');
  const [filtroDenominacion, setFiltroDenominacion] = useState<string | 'ALL'>('ALL');
  const [filtroTipoCosto, setFiltroTipoCosto] = useState<string | 'ALL'>('ALL');
  const [filtroPerfil, setFiltroPerfil] = useState<string | 'ALL'>('ALL');
  const [filtroSede, setFiltroSede] = useState<string | 'ALL'>('ALL');
  const [filtroGenero, setFiltroGenero] = useState<string | 'ALL'>('ALL');
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
  const [genero, setGenero] = useState<string>('');
  const [sede, setSede] = useState<string>('');
  const [email, setEmail] = useState('');
  const [emailCorporativo, setEmailCorporativo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [codigoCargo, setCodigoCargo] = useState<string>('');
  const [codigoDepartamento, setCodigoDepartamento] = useState<string>('');
  const [codigoTc, setCodigoTc] = useState<string>('');
  const [codigoPc, setCodigoPc] = useState<string>('');
  const [tabuladorId, setTabuladorId] = useState<number | ''>('');
  const [diSupervisor, setDiSupervisor] = useState<string>('');
  const [diEvaluador, setDiEvaluador] = useState<string>('');
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
        { data: pcData },
        { data: dcData },
        { data: empData },
        { data: dirData },
        { data: gerData },
      ] = await Promise.all([
        empleadosApi.getAll(),
        cargosApi.getAll(),
        departamentosApi.getAll(),
        tabuladorApi.getAll(),
        tipoCostosApi.getAll(),
        perfilesCompetenciasApi.getAll(),
        denominacionesCargosApi.getAll(),
        empresasApi.getAll(),
        direccionesApi.getAll(),
        gerenciasApi.getAll(),
      ]);

      if (eErr) toast.error('No se pudieron cargar los colaboradores');
      setEmpleados(eData || []);
      setCargos(cData || []);
      setDepartamentos(dData || []);
      setTabuladores(tData || []);
      setTipoCostos(tcData || []);
      setPerfilesCompetencias(pcData || []);
      setDenominaciones(dcData || []);
      setEmpresas(empData || []);
      setDirecciones(dirData || []);
      setGerencias(gerData || []);
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
    setGenero('');
    setSede('');
    setEmail('');
    setEmailCorporativo('');
    setTelefono('+58414' + Math.floor(1000000 + Math.random() * 9000000));
    setCodigoCargo(cargos[0]?.codigo || '');
    setCodigoDepartamento(departamentos[0]?.codigo || '');
    setCodigoTc('');
    setCodigoPc('');
    setTabuladorId('');
    setDiSupervisor('');
    setDiEvaluador('');
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
    setGenero(emp.genero || '');
    setSede(emp.sede || '');
    setEmail(emp.email);
    setEmailCorporativo(emp.email_corporativo || '');
    setTelefono(emp.telefono || '');
    setCodigoCargo(emp.codigo_cargo);
    setCodigoDepartamento(emp.codigo_departamento);
    setCodigoTc(emp.codigo_tc || '');
    setCodigoPc(emp.codigo_pc || '');
    setTabuladorId(emp.tabulador_id || '');
    setDiSupervisor(emp.di_supervisor || '');
    setDiEvaluador(emp.di_evaluador || '');
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
        const { error } = await empleadosApi.create({
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
          codigo_pc: codigoPc ? codigoPc.trim() : null,
          genero: (genero as any) || null,
          sede: sede.trim() || null,
          tabulador_id: tabuladorId ? Number(tabuladorId) : null,
          di_supervisor: diSupervisor.trim() || null,
          di_evaluador: diEvaluador.trim() || null,
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
        const { error } = await empleadosApi.update(selectedEmpleado.empleado_id, {
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
          codigo_pc: codigoPc ? codigoPc.trim() : null,
          genero: (genero as any) || null,
          sede: sede.trim() || null,
          tabulador_id: tabuladorId ? Number(tabuladorId) : null,
          di_supervisor: diSupervisor.trim() || null,
          di_evaluador: diEvaluador.trim() || null,
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

  const getCargoDenominacionInfo = (cargoCode: string) => {
    const cargo = cargos.find((c) => c.codigo === cargoCode);
    if (!cargo || !cargo.codigo_dc) return null;
    const dc = denominaciones.find((d) => d.codigo_dc === cargo.codigo_dc);
    return {
      codigo_dc: cargo.codigo_dc,
      denominacion: dc?.denominacion || cargo.codigo_dc,
    };
  };

  const getDepartamentoName = (code: string) => {
    const depto = departamentos.find((d) => d.codigo === code);
    return depto ? depto.nombre : code;
  };

  const getEmpleadoByDI = (di?: string | null) => {
    if (!di) return null;
    return empleados.find((e) => e.documento_identidad === di);
  };

  const getEmpleadoFullName = (empIdOrDI: number | string | null | undefined) => {
    if (!empIdOrDI) return null;
    if (typeof empIdOrDI === 'string') {
      const emp = empleados.find((e) => e.documento_identidad === empIdOrDI);
      return emp ? `${emp.nombres} ${emp.apellidos}` : empIdOrDI;
    }
    const emp = empleados.find((e) => e.empleado_id === empIdOrDI);
    return emp ? `${emp.nombres} ${emp.apellidos}` : `Empleado #${empIdOrDI}`;
  };

  const getTabuladorInfo = (tabId?: number | null) => {
    if (!tabId) return null;
    return tabuladores.find((t) => t.tabulador_id === tabId);
  };

  const getTipoCostoInfo = (codigo_tc?: string | null) => {
    if (!codigo_tc) return null;
    return tipoCostos.find((tc) => tc.codigo_tc === codigo_tc);
  };

  const getPerfilCompetenciaInfo = (codigo_pc?: string | null) => {
    if (!codigo_pc) return null;
    return perfilesCompetencias.find((pc) => pc.codigo_pc === codigo_pc);
  };

  // Helper de jerarquía organizacional completa: Empleado -> Departamento -> Gerencia -> Dirección -> Empresa
  const getEmpleadoHierarchy = (emp: Empleado) => {
    const depto = departamentos.find((d) => d.codigo === emp.codigo_departamento);
    const ger = depto?.codigo_gerencia ? gerencias.find((g) => g.codigo === depto.codigo_gerencia) : null;
    const dir = ger?.codigo_direccion ? direcciones.find((d) => d.codigo === ger.codigo_direccion) : null;
    let empFound = dir?.empresa_id ? empresas.find((e) => e.empresa_id === dir.empresa_id) : null;

    // Fallback por tabulador si aún no está enlazada la gerencia/dirección
    if (!empFound && emp.tabulador_id) {
      const tab = tabuladores.find((t) => t.tabulador_id === emp.tabulador_id);
      if (tab?.empresa_id) {
        empFound = empresas.find((e) => e.empresa_id === tab.empresa_id) || null;
      }
    }

    return {
      departamento: depto,
      gerencia: ger,
      direccion: dir,
      empresa: empFound,
    };
  };

  const getEmpleadoEmpresa = (emp: Empleado): Empresa | null => {
    return getEmpleadoHierarchy(emp).empresa || null;
  };

  const sedesDisponibles = Array.from(
    new Set(empleados.map((e) => e.sede?.trim()).filter(Boolean))
  ) as string[];

  // Empleados enriquecidos con datos calculados de Empresa
  const empleadosConEmpresa: EmpleadoConEmpresa[] = useMemo(() => {
    return empleados.map((emp) => {
      const hierarchy = getEmpleadoHierarchy(emp);
      return {
        ...emp,
        empresa_id: hierarchy.empresa?.empresa_id,
        empresa_nombre: hierarchy.empresa?.razon_social || '',
        empresa_corto: hierarchy.empresa?.nombre_corto || hierarchy.empresa?.codigo || '',
        empresa_codigo: hierarchy.empresa?.codigo || '',
      };
    });
  }, [empleados, departamentos, gerencias, direcciones, empresas, tabuladores]);

  // Departamentos filtrados por la empresa actualmente seleccionada
  const departamentosFiltrados = useMemo(() => {
    if (filtroEmpresa === 'ALL' || filtroEmpresa === 'SIN_EMPRESA') {
      return departamentos;
    }
    return departamentos.filter((dep) => {
      const ger = dep.codigo_gerencia ? gerencias.find((g) => g.codigo === dep.codigo_gerencia) : null;
      const dir = ger?.codigo_direccion ? direcciones.find((d) => d.codigo === ger.codigo_direccion) : null;
      return dir ? String(dir.empresa_id) === filtroEmpresa : false;
    });
  }, [departamentos, gerencias, direcciones, filtroEmpresa]);

  const filteredEmpleados = useMemo(() => {
    return empleadosConEmpresa.filter((emp) => {
      if (filtroEmpresa !== 'ALL') {
        if (filtroEmpresa === 'SIN_EMPRESA') {
          if (emp.empresa_id) return false;
        } else if (String(emp.empresa_id) !== filtroEmpresa) {
          return false;
        }
      }
      if (filtroDepartamento !== 'ALL' && emp.codigo_departamento !== filtroDepartamento) return false;
      if (filtroCargo !== 'ALL' && emp.codigo_cargo !== filtroCargo) return false;
      if (filtroDenominacion !== 'ALL') {
        const cargo = cargos.find((c) => c.codigo === emp.codigo_cargo);
        if (filtroDenominacion === 'SIN_DC') {
          if (cargo?.codigo_dc) return false;
        } else if (cargo?.codigo_dc !== filtroDenominacion) {
          return false;
        }
      }
      if (filtroTipoCosto !== 'ALL' && emp.codigo_tc !== filtroTipoCosto) return false;
      if (filtroPerfil !== 'ALL') {
        if (filtroPerfil === 'SIN_PC') {
          if (emp.codigo_pc) return false;
        } else if (emp.codigo_pc !== filtroPerfil) {
          return false;
        }
      }
      if (filtroSede !== 'ALL' && emp.sede !== filtroSede) return false;
      if (filtroGenero !== 'ALL' && emp.genero !== filtroGenero) return false;
      if (filtroEstado !== 'ALL' && emp.estado_laboral !== filtroEstado) return false;
      return true;
    });
  }, [
    empleadosConEmpresa,
    filtroEmpresa,
    filtroDepartamento,
    filtroCargo,
    filtroDenominacion,
    filtroTipoCosto,
    filtroPerfil,
    filtroSede,
    filtroGenero,
    filtroEstado,
    cargos,
  ]);

  const hasActiveFilters =
    filtroEmpresa !== 'ALL' ||
    filtroDepartamento !== 'ALL' ||
    filtroDenominacion !== 'ALL' ||
    filtroPerfil !== 'ALL' ||
    filtroTipoCosto !== 'ALL' ||
    filtroSede !== 'ALL' ||
    filtroGenero !== 'ALL' ||
    filtroCargo !== 'ALL' ||
    filtroEstado !== 'ALL';

  const resetAllFilters = () => {
    setFiltroEmpresa('ALL');
    setFiltroDepartamento('ALL');
    setFiltroDenominacion('ALL');
    setFiltroPerfil('ALL');
    setFiltroTipoCosto('ALL');
    setFiltroSede('ALL');
    setFiltroGenero('ALL');
    setFiltroCargo('ALL');
    setFiltroEstado('ALL');
  };

  const columns: Column<EmpleadoConEmpresa>[] = [
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
      header: 'Cargo & Denominación (DC)',
      sortable: true,
      render: (row) => {
        const dcInfo = getCargoDenominacionInfo(row.codigo_cargo);
        return (
          <div>
            <div className="font-medium text-slate-200">{getCargoName(row.codigo_cargo)}</div>
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              {row.empresa_corto ? (
                <span
                  className="font-bold text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 inline-flex items-center gap-1 shadow-sm"
                  title={`Empresa: ${row.empresa_nombre || row.empresa_corto} (${row.empresa_codigo})`}
                >
                  <Building2 className="w-2.5 h-2.5 text-emerald-400" />
                  {row.empresa_corto}
                </span>
              ) : null}
              <span className="text-xs text-brand-400/90">{getDepartamentoName(row.codigo_departamento)}</span>
              {dcInfo && (
                <span
                  className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-950/70 text-indigo-300 border border-indigo-800/40 inline-flex items-center gap-1"
                  title={`Denominación homologada: ${dcInfo.denominacion}`}
                >
                  <Tag className="w-2.5 h-2.5 text-indigo-400" />
                  {dcInfo.denominacion}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'codigo_pc',
      header: 'Perfil Competencias (PC)',
      sortable: true,
      render: (row) => {
        const pc = getPerfilCompetenciaInfo(row.codigo_pc);
        return pc ? (
          <div className="flex items-center gap-1.5">
            <span
              className={`font-mono text-xs font-semibold px-2.5 py-1 rounded-md border shadow-sm ${
                pc.perfil.toLowerCase().includes('líder') || pc.perfil.toLowerCase().includes('lider')
                  ? 'bg-emerald-950/70 border-emerald-800/60 text-emerald-300'
                  : pc.perfil.toLowerCase().includes('admin')
                  ? 'bg-cyan-950/70 border-cyan-800/60 text-cyan-300'
                  : 'bg-amber-950/70 border-amber-800/60 text-amber-300'
              }`}
            >
              {pc.perfil}
            </span>
            <span className="text-[10px] text-slate-400 font-mono hidden xl:inline">
              ({pc.codigo_pc})
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-500 italic">Sin asignar</span>
        );
      },
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
      key: 'sede',
      header: 'Sede & Género',
      sortable: true,
      render: (row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-200">
            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="font-medium">{row.sede || <span className="text-slate-500 italic text-[11px]">Sin sede</span>}</span>
          </div>
          {row.genero && (
            <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
              row.genero === 'Mujer'
                ? 'bg-pink-950/60 text-pink-300 border-pink-800/50'
                : 'bg-sky-950/60 text-sky-300 border-sky-800/50'
            }`}>
              {row.genero}
            </span>
          )}
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
            <span
              className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-700/50 inline-block"
              title={tab.cargos_referencia ? `Cargos ref: ${tab.cargos_referencia}` : undefined}
            >
              {tab.codigo_banda}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-500 italic">Sin Banda</span>
        );
      },
    },
    {
      key: 'di_supervisor',
      header: 'Línea de Mando',
      render: (row) => {
        const supName = getEmpleadoFullName(row.di_supervisor);
        const evalName = getEmpleadoFullName(row.di_evaluador);
        return (
          <div className="space-y-1 text-xs">
            {row.di_supervisor ? (
              <div className="text-slate-300 flex items-center gap-1">
                <span className="text-slate-500 font-semibold text-[10px] uppercase">Sup:</span>
                <span className="truncate max-w-[140px]" title={`${supName || ''} (${row.di_supervisor})`}>
                  {supName || row.di_supervisor}
                </span>
              </div>
            ) : (
              <span className="text-slate-500 italic block">Sin supervisor</span>
            )}
            {row.di_evaluador && row.di_evaluador !== row.di_supervisor && (
              <div className="text-brand-400 flex items-center gap-1 text-[11px]">
                <span className="text-brand-500/70 font-semibold text-[10px] uppercase">Eval:</span>
                <span className="truncate max-w-[140px]" title={`${evalName || ''} (${row.di_evaluador})`}>
                  {evalName || row.di_evaluador}
                </span>
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

  const totalEmpleadosConPerfil = empleados.filter((e) => Boolean(e.codigo_pc)).length;

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
            Gestión integral de colaboradores, cargos (DC), perfiles de competencias (PC) y estructura corporativa.
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
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Perfiles (PC)</span>
            <Award className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-cyan-400 mt-2">
            {totalEmpleadosConPerfil}
          </p>
          <span className="text-[11px] text-slate-500">
            {empleados.length - totalEmpleadosConPerfil} pendientes de PC
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Tabulador Salarial</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-indigo-400 mt-2">
            {empleados.filter((e) => e.tabulador_id).length}
          </p>
          <span className="text-[11px] text-slate-500">Con banda asignada</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <Filter className="w-4 h-4 text-brand-400" />
          <span>Filtros avanzados:</span>
          {filtroEmpresa !== 'ALL' && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
              Empresa activa
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Empresa Filter */}
          <select
            value={filtroEmpresa}
            onChange={(e) => {
              const newEmpresa = e.target.value;
              setFiltroEmpresa(newEmpresa);
              if (newEmpresa !== 'ALL' && newEmpresa !== 'SIN_EMPRESA' && filtroDepartamento !== 'ALL') {
                const depto = departamentos.find((d) => d.codigo === filtroDepartamento);
                const ger = depto?.codigo_gerencia ? gerencias.find((g) => g.codigo === depto.codigo_gerencia) : null;
                const dir = ger?.codigo_direccion ? direcciones.find((d) => d.codigo === ger.codigo_direccion) : null;
                if (!dir || String(dir.empresa_id) !== newEmpresa) {
                  setFiltroDepartamento('ALL');
                }
              }
            }}
            className="px-3 py-1.5 bg-slate-950 border border-emerald-700/60 text-emerald-300 font-semibold rounded-lg text-xs focus:outline-none focus:border-emerald-400 shadow-sm"
          >
            <option value="ALL">Todas las Empresas ({empleados.length})</option>
            {empresas.map((emp) => {
              const count = empleadosConEmpresa.filter((e) => e.empresa_id === emp.empresa_id).length;
              return (
                <option key={emp.empresa_id} value={String(emp.empresa_id)}>
                  {emp.nombre_corto ? `${emp.nombre_corto} - ` : ''}{emp.razon_social} ({count})
                </option>
              );
            })}
            {(() => {
              const sinEmpresaCount = empleadosConEmpresa.filter((e) => !e.empresa_id).length;
              if (sinEmpresaCount > 0) {
                return (
                  <option value="SIN_EMPRESA">-- Sin Empresa Asignada ({sinEmpresaCount}) --</option>
                );
              }
              return null;
            })()}
          </select>

          {/* Departamento Filter */}
          <select
            value={filtroDepartamento}
            onChange={(e) => setFiltroDepartamento(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-brand-500"
          >
            <option value="ALL">
              {filtroEmpresa !== 'ALL' && filtroEmpresa !== 'SIN_EMPRESA'
                ? `Todos los Departamentos (${departamentosFiltrados.length})`
                : 'Todos los Departamentos'}
            </option>
            {[...departamentosFiltrados]
              .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
              .map((d) => (
                <option key={d.codigo} value={d.codigo}>
                  {d.nombre} ({d.codigo})
                </option>
              ))}
          </select>

          {/* Denominación Filter */}
          <select
            value={filtroDenominacion}
            onChange={(e) => setFiltroDenominacion(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Todas las Denominaciones (DC)</option>
            <option value="SIN_DC">-- Cargos Sin Denominación --</option>
            {[...denominaciones]
              .sort((a, b) => a.denominacion.localeCompare(b.denominacion, 'es', { sensitivity: 'base' }))
              .map((dc) => (
                <option key={dc.codigo_dc} value={dc.codigo_dc}>
                  {dc.codigo_dc} - {dc.denominacion}
                </option>
              ))}
          </select>

          {/* Perfil de Competencias Filter */}
          <select
            value={filtroPerfil}
            onChange={(e) => setFiltroPerfil(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">Todos los Perfiles (PC)</option>
            <option value="SIN_PC">-- Sin Perfil Asignado --</option>
            {perfilesCompetencias.map((pc) => (
              <option key={pc.codigo_pc} value={pc.codigo_pc}>
                {pc.codigo_pc} - {pc.perfil}
              </option>
            ))}
          </select>

          {/* Tipo de Costo Filter */}
          <select
            value={filtroTipoCosto}
            onChange={(e) => setFiltroTipoCosto(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Todos los Tipos de Costos</option>
            {tipoCostos.map((tc) => (
              <option key={tc.codigo_tc} value={tc.codigo_tc}>
                {tc.nombre} ({tc.codigo_tc}) - {tc.descripcion}
              </option>
            ))}
          </select>

          {/* Sede Filter */}
          {sedesDisponibles.length > 0 && (
            <select
              value={filtroSede}
              onChange={(e) => setFiltroSede(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="ALL">Todas las Sedes</option>
              {sedesDisponibles.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}

          {/* Genero Filter */}
          <select
            value={filtroGenero}
            onChange={(e) => setFiltroGenero(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-pink-500"
          >
            <option value="ALL">Todos los Géneros</option>
            <option value="Mujer">Mujer</option>
            <option value="Hombre">Hombre</option>
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

          {/* Limpiar Filtros */}
          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
              title="Restablecer todos los filtros"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpiar</span>
            </button>
          )}
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        data={filteredEmpleados}
        columns={columns}
        loading={loading}
        searchKeys={[
          'codigo_empleado',
          'documento_identidad',
          'nombres',
          'apellidos',
          'email',
          'codigo_cargo',
          'codigo_departamento',
          'sede',
          'codigo_pc',
          'codigo_tc',
          'empresa_nombre',
          'empresa_corto',
          'empresa_codigo',
        ]}
        searchPlaceholder="Buscar por nombre, cédula, empresa, cargo, departamento o perfil..."
        exportFilename="plantilla_empleados"
      />

      {/* Modal Formulario Crear / Editar */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Registrar Nuevo Empleado' : 'Editar Ficha del Empleado'}
        subtitle="Expediente Maestro de Personal"
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
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-brand-300 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Documento de Identidad / C.I.
              </label>
              <input
                type="text"
                value={documentoIdentidad}
                onChange={(e) => setDocumentoIdentidad(e.target.value)}
                placeholder="V12345678"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
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
                placeholder="Juan Carlos"
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
                placeholder="Pérez Gómez"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Género
              </label>
              <select
                value={genero}
                onChange={(e) => setGenero(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
              >
                <option value="">-- No especificado --</option>
                <option value="Mujer">Mujer</option>
                <option value="Hombre">Hombre</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Sede / Localidad
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={sede}
                  onChange={(e) => setSede(e.target.value)}
                  placeholder="Ej. Planta Los Teques, Torre Este..."
                  className="w-full px-3.5 py-2 pl-9 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
              </div>
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

          {/* Cargo y Departamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Cargo Asignado *
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

              {/* Instant preview of cargo's denomination */}
              {(() => {
                const dcInfo = getCargoDenominacionInfo(codigoCargo);
                if (dcInfo) {
                  return (
                    <div className="mt-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/40 border border-indigo-800/40 flex items-center justify-between text-xs">
                      <span className="text-indigo-400 text-[11px] flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        Denominación DC:
                      </span>
                      <span className="font-semibold text-indigo-200 text-[11px]">
                        {dcInfo.denominacion} ({dcInfo.codigo_dc})
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
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

          {/* Tipo de Costo, Perfil de Competencias y Banda Salarial */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tipo de Costo
              </label>
              <select
                value={codigoTc}
                onChange={(e) => setCodigoTc(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">-- Sin Tipo Costo --</option>
                {tipoCostos.map((tc) => (
                  <option key={tc.codigo_tc} value={tc.codigo_tc}>
                    {tc.nombre} ({tc.codigo_tc})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Perfil de Competencias (PC)
              </label>
              <select
                value={codigoPc}
                onChange={(e) => setCodigoPc(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">-- Sin Perfil Asignado --</option>
                {perfilesCompetencias.map((pc) => (
                  <option key={pc.codigo_pc} value={pc.codigo_pc}>
                    {pc.codigo_pc} - {pc.perfil}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Banda Salarial
              </label>
              <select
                value={tabuladorId}
                onChange={(e) => setTabuladorId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
              >
                <option value="">-- Sin Banda --</option>
                {tabuladores.map((t) => (
                  <option key={t.tabulador_id} value={t.tabulador_id}>
                    {t.codigo_banda}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Supervisor Directo (Cédula / DI)
              </label>
              <select
                value={diSupervisor}
                onChange={(e) => setDiSupervisor(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
              >
                <option value="">-- Sin Supervisor (Máxima Autoridad) --</option>
                {[...empleados]
                  .filter((e) => (modalMode === 'edit' ? e.documento_identidad !== selectedEmpleado?.documento_identidad : true))
                  .sort((a, b) => `${a.nombres} ${a.apellidos}`.localeCompare(`${b.nombres} ${b.apellidos}`, 'es', { sensitivity: 'base' }))
                  .map((e) => (
                    <option key={e.empleado_id} value={e.documento_identidad || ''}>
                      {e.documento_identidad} - {e.nombres} {e.apellidos} ({getCargoName(e.codigo_cargo)})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Evaluador de Desempeño (Cédula / DI)
              </label>
              <select
                value={diEvaluador}
                onChange={(e) => setDiEvaluador(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
              >
                <option value="">-- Por defecto (Mismo Supervisor) --</option>
                {[...empleados]
                  .filter((e) => (modalMode === 'edit' ? e.documento_identidad !== selectedEmpleado?.documento_identidad : true))
                  .sort((a, b) => `${a.nombres} ${a.apellidos}`.localeCompare(`${b.nombres} ${b.apellidos}`, 'es', { sensitivity: 'base' }))
                  .map((e) => (
                    <option key={e.empleado_id} value={e.documento_identidad || ''}>
                      {e.documento_identidad} - {e.nombres} {e.apellidos} ({getCargoName(e.codigo_cargo)})
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
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <EstadoLaboralBadge estado={detailEmpleado.estado_laboral} />
                  {(() => {
                    const empComp = getEmpleadoEmpresa(detailEmpleado);
                    if (empComp) {
                      return (
                        <span className="text-xs font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                          <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                          {empComp.nombre_corto ? `${empComp.nombre_corto} - ` : ''}{empComp.razon_social}
                        </span>
                      );
                    }
                    return null;
                  })()}
                  <span className="text-[10px] text-slate-400 font-mono">
                    ID: {detailEmpleado.documento_identidad || 'Sin DNI'}
                  </span>
                </div>
              </div>
            </div>

            {/* Adscripción Corporativa (Empresa, Dirección, Gerencia, Departamento) */}
            {(() => {
              const hierarchy = getEmpleadoHierarchy(detailEmpleado);
              return (
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    Adscripción Corporativa (Empresa & Estructura)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-emerald-800/40">
                      <span className="text-[10px] text-emerald-400 font-semibold uppercase block mb-1">
                        Empresa
                      </span>
                      <span className="text-slate-200 font-bold truncate block" title={hierarchy.empresa?.razon_social || 'Sin asignar'}>
                        {hierarchy.empresa ? (hierarchy.empresa.nombre_corto || hierarchy.empresa.codigo) : 'Sin asignar'}
                      </span>
                      {hierarchy.empresa?.razon_social && (
                        <span className="text-[10px] text-slate-400 truncate block mt-0.5" title={hierarchy.empresa.razon_social}>
                          {hierarchy.empresa.razon_social}
                        </span>
                      )}
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-purple-800/40">
                      <span className="text-[10px] text-purple-400 font-semibold uppercase block mb-1">
                        Dirección
                      </span>
                      <span className="text-slate-200 font-bold truncate block" title={hierarchy.direccion?.nombre || 'Sin asignar'}>
                        {hierarchy.direccion?.nombre || 'Sin asignar'}
                      </span>
                      {hierarchy.direccion?.codigo && (
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                          {hierarchy.direccion.codigo}
                        </span>
                      )}
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-indigo-800/40">
                      <span className="text-[10px] text-indigo-400 font-semibold uppercase block mb-1">
                        Gerencia
                      </span>
                      <span className="text-slate-200 font-bold truncate block" title={hierarchy.gerencia?.nombre || 'Sin asignar'}>
                        {hierarchy.gerencia?.nombre || 'Sin asignar'}
                      </span>
                      {hierarchy.gerencia?.codigo && (
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                          {hierarchy.gerencia.codigo}
                        </span>
                      )}
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-brand-800/40">
                      <span className="text-[10px] text-brand-400 font-semibold uppercase block mb-1">
                        Departamento
                      </span>
                      <span className="text-slate-200 font-bold truncate block" title={hierarchy.departamento?.nombre || detailEmpleado.codigo_departamento}>
                        {hierarchy.departamento?.nombre || detailEmpleado.codigo_departamento}
                      </span>
                      {hierarchy.departamento?.codigo && (
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                          {hierarchy.departamento.codigo}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

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
                <span className="text-indigo-400 block mb-1 font-semibold flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" />
                  Denominación Cargo (DC)
                </span>
                {(() => {
                  const dcInfo = getCargoDenominacionInfo(detailEmpleado.codigo_cargo);
                  return dcInfo ? (
                    <span className="text-indigo-200 font-medium">
                      {dcInfo.denominacion} ({dcInfo.codigo_dc})
                    </span>
                  ) : (
                    <span className="text-slate-500 italic">Sin clasificar</span>
                  );
                })()}
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-cyan-400 block mb-1 font-semibold flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  Perfil de Competencias (PC)
                </span>
                {(() => {
                  const pc = getPerfilCompetenciaInfo(detailEmpleado.codigo_pc);
                  return pc ? (
                    <span className="text-cyan-200 font-medium">
                      {pc.perfil} ({pc.codigo_pc})
                    </span>
                  ) : (
                    <span className="text-slate-500 italic">No asignado</span>
                  );
                })()}
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

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-pink-400 block mb-1 font-semibold">Género</span>
                <span className="text-slate-200 font-medium">
                  {detailEmpleado.genero || <span className="text-slate-500 italic">No registrado</span>}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-rose-400 block mb-1 font-semibold flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  Sede / Ubicación
                </span>
                <span className="text-slate-200 font-medium">
                  {detailEmpleado.sede || <span className="text-slate-500 italic">No asignada</span>}
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
                      Banda {tab.codigo_banda}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300">
                    <span className="text-slate-400 font-medium">Cargos de Referencia: </span>
                    {tab.cargos_referencia}
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
                  {detailEmpleado.di_supervisor
                    ? `${getEmpleadoFullName(detailEmpleado.di_supervisor)} (${detailEmpleado.di_supervisor})`
                    : 'Directorio Ejecutivo'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-400">Evaluador de Desempeño:</span>
                <span className="text-slate-200 font-semibold">
                  {detailEmpleado.di_evaluador
                    ? `${getEmpleadoFullName(detailEmpleado.di_evaluador)} (${detailEmpleado.di_evaluador})`
                    : detailEmpleado.di_supervisor
                    ? `${getEmpleadoFullName(detailEmpleado.di_supervisor)} (${detailEmpleado.di_supervisor})`
                    : 'Supervisor Directo'}
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
