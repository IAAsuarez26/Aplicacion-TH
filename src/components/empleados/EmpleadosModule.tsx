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
  ChevronDown,
  GraduationCap,
  Share2,
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
import { HumandSyncModal } from '../humand/HumandSyncModal';
import { useAuth } from '../../context/AuthContext';


export interface EmpleadoConEmpresa extends Empleado {
  empresa_id?: number;
  empresa_nombre?: string;
  empresa_corto?: string;
  empresa_codigo?: string;
  nacionalidad?: string;
  dni_numero?: string;
}

export const parseDocumentoIdentidad = (doc: string | null | undefined): { nacionalidad: string; dniNumero: string } => {
  if (!doc) return { nacionalidad: '', dniNumero: '' };
  const trimmed = doc.trim();
  const nacMatch = trimmed.match(/^([VEve])/i);
  const nacionalidad = nacMatch ? nacMatch[1].toUpperCase() : '';
  const dniNumero = trimmed
    .replace(/^([VEve])[\s\-_.]*/i, '')
    .replace(/[-]/g, '')
    .trim();
  return { nacionalidad, dniNumero };
};

interface EmpleadosModuleProps {
  initialCreateOpen?: boolean;
  onResetInitialOpen?: () => void;
}

export const EmpleadosModule: React.FC<EmpleadosModuleProps> = ({
  initialCreateOpen = false,
  onResetInitialOpen,
}) => {
  const { canAccessTab } = useAuth();
  const canAccessTabulador = canAccessTab('tabulador');
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
  const [filtroQuickPC, setFiltroQuickPC] = useState<'ALL' | 'CON_PC' | 'SIN_PC'>('ALL');
  const [filtroQuickTabulador, setFiltroQuickTabulador] = useState<'ALL' | 'CON_BANDA' | 'SIN_BANDA'>('ALL');
  const [filtroQuickHumand, setFiltroQuickHumand] = useState<'ALL' | 'HABILITADO' | 'EXCLUIDO'>('ALL');

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null);
  const [saving, setSaving] = useState(false);

  // Detail Modal State
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailEmpleado, setDetailEmpleado] = useState<Empleado | null>(null);

  // Humand Cascade Sync Modal State
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncTargetEmpleado, setSyncTargetEmpleado] = useState<Empleado | null>(null);


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
  const [ubicacion, setUbicacion] = useState<string>('');
  const [edoCivil, setEdoCivil] = useState<string>('');
  const [nivelEducativo, setNivelEducativo] = useState<string>('');
  const [estatusH, setEstatusH] = useState<number>(1);
  const [formEmpresaId, setFormEmpresaId] = useState<string>('');

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
        canAccessTabulador ? tabuladorApi.getAll() : Promise.resolve({ data: [] }),
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
    const initialEmpId = (filtroEmpresa !== 'ALL' && filtroEmpresa !== 'SIN_EMPRESA')
      ? filtroEmpresa
      : (empresas[0]?.empresa_id ? String(empresas[0].empresa_id) : '');
    setFormEmpresaId(initialEmpId);
    setCodigoDepartamento('');
    setCodigoTc('');
    setCodigoPc('');
    setTabuladorId('');
    setDiSupervisor('');
    setDiEvaluador('');
    setFechaIngreso(new Date().toISOString().slice(0, 10));
    setEstadoLaboral('ACTIVO');
    setUbicacion('Caracas');
    setEdoCivil('');
    setNivelEducativo('');
    setEstatusH(1);
    setIsModalOpen(true);
  };

  const openEditModal = (emp: Empleado) => {
    setModalMode('edit');
    setSelectedEmpleado(emp);
    const h = getEmpleadoHierarchy(emp);
    const empIdStr = h.empresa?.empresa_id ? String(h.empresa.empresa_id) : '';
    setFormEmpresaId(empIdStr);
    setCodigoEmpleado(emp.codigo_empleado);
    setDocumentoIdentidad(emp.documento_identidad || '');
    setNombres(emp.nombres);
    setApellidos(emp.apellidos);
    setGenero(emp.genero || '');
    setSede(emp.sede || '');
    setUbicacion(emp.ubicacion || emp.sede || '');
    setEdoCivil(emp.edo_civil || '');
    setNivelEducativo(emp.nivel_educativo || '');
    setEstatusH(emp.estatus_h !== undefined ? Number(emp.estatus_h) : 1);
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
          ubicacion: ubicacion.trim() || null,
          edo_civil: edoCivil.trim() || null,
          nivel_educativo: nivelEducativo.trim() || null,
          tabulador_id: canAccessTabulador ? (tabuladorId ? Number(tabuladorId) : null) : null,
          di_supervisor: diSupervisor.trim() || null,
          di_evaluador: diEvaluador.trim() || null,
          fecha_ingreso: fechaIngreso,
          estado_laboral: estadoLaboral,
          estatus_h: estatusH,
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
          ubicacion: ubicacion.trim() || null,
          edo_civil: edoCivil.trim() || null,
          nivel_educativo: nivelEducativo.trim() || null,
          tabulador_id: canAccessTabulador
            ? (tabuladorId ? Number(tabuladorId) : null)
            : (selectedEmpleado.tabulador_id ? Number(selectedEmpleado.tabulador_id) : null),
          di_supervisor: diSupervisor.trim() || null,
          di_evaluador: diEvaluador.trim() || null,
          fecha_ingreso: fechaIngreso,
          estado_laboral: estadoLaboral,
          estatus_h: estatusH,
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

  // Helper de jerarquía organizacional directa: Departamento -> Gerencia -> Dirección -> Empresa
  const getDepartamentoHierarchy = (codigoDepto?: string | null) => {
    if (!codigoDepto) return { departamento: null, gerencia: null, direccion: null, empresa: null };
    const depto = departamentos.find((d) => d.codigo === codigoDepto);
    if (!depto) return { departamento: null, gerencia: null, direccion: null, empresa: null };

    const ger = depto.codigo_gerencia
      ? gerencias.find((g) => g.codigo === depto.codigo_gerencia)
      : null;

    const dir = ger?.codigo_direccion
      ? direcciones.find((d) => d.codigo === ger.codigo_direccion)
      : null;

    const empFound = dir?.empresa_id ? empresas.find((e) => e.empresa_id === dir.empresa_id) : null;

    return {
      departamento: depto,
      gerencia: ger || null,
      direccion: dir || null,
      empresa: empFound || null,
    };
  };

  // Helper de jerarquía organizacional completa: Empleado -> Departamento -> Gerencia -> Dirección -> Empresa
  const getEmpleadoHierarchy = (emp: Empleado) => {
    const directH = getDepartamentoHierarchy(emp.codigo_departamento);
    let empFound = directH.empresa;

    // Fallback por tabulador si aún no está enlazada la gerencia/dirección
    if (!empFound && emp.tabulador_id) {
      const tab = tabuladores.find((t) => t.tabulador_id === emp.tabulador_id);
      if (tab?.empresa_id) {
        empFound = empresas.find((e) => e.empresa_id === tab.empresa_id) || null;
      }
    }

    return {
      departamento: directH.departamento,
      gerencia: directH.gerencia,
      direccion: directH.direccion,
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
      const { nacionalidad, dniNumero } = parseDocumentoIdentidad(emp.documento_identidad);
      return {
        ...emp,
        empresa_id: hierarchy.empresa?.empresa_id,
        empresa_nombre: hierarchy.empresa?.razon_social || '',
        empresa_corto: hierarchy.empresa?.nombre_corto || hierarchy.empresa?.codigo || '',
        empresa_codigo: hierarchy.empresa?.codigo || '',
        nacionalidad,
        dni_numero: dniNumero,
      };
    });
  }, [empleados, departamentos, gerencias, direcciones, empresas, tabuladores]);

  // Departamentos filtrados por la empresa actualmente seleccionada en el toolbar
  const departamentosFiltrados = useMemo(() => {
    if (filtroEmpresa === 'ALL' || filtroEmpresa === 'SIN_EMPRESA') {
      return departamentos;
    }
    return departamentos.filter((dep) => {
      const h = getDepartamentoHierarchy(dep.codigo);
      return h.empresa ? String(h.empresa.empresa_id) === filtroEmpresa : false;
    });
  }, [departamentos, gerencias, direcciones, empresas, filtroEmpresa]);

  // Departamentos filtrados para el modal de Crear/Editar según la empresa seleccionada
  const modalDepartamentos = useMemo(() => {
    if (!formEmpresaId) {
      return departamentos;
    }
    return departamentos.filter((d) => {
      const h = getDepartamentoHierarchy(d.codigo);
      return h.empresa ? String(h.empresa.empresa_id) === String(formEmpresaId) : false;
    });
  }, [departamentos, gerencias, direcciones, empresas, formEmpresaId]);

  // Bandas salariales filtradas para el modal según la empresa seleccionada
  const modalTabuladores = useMemo(() => {
    if (!formEmpresaId) {
      return tabuladores;
    }
    return tabuladores.filter((t) => String(t.empresa_id) === String(formEmpresaId));
  }, [tabuladores, formEmpresaId]);

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
      if (filtroQuickPC === 'CON_PC' && !emp.codigo_pc) return false;
      if (filtroQuickPC === 'SIN_PC' && emp.codigo_pc) return false;
      if (canAccessTabulador) {
        if (filtroQuickTabulador === 'CON_BANDA' && !emp.tabulador_id) return false;
        if (filtroQuickTabulador === 'SIN_BANDA' && emp.tabulador_id) return false;
      } else {
        if (filtroQuickHumand === 'HABILITADO' && emp.estatus_h !== 1) return false;
        if (filtroQuickHumand === 'EXCLUIDO' && emp.estatus_h === 1) return false;
      }
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
    filtroQuickPC,
    filtroQuickTabulador,
    filtroQuickHumand,
    canAccessTabulador,
    cargos,
  ]);

  const activeFiltersCount = [
    filtroEmpresa !== 'ALL',
    filtroDepartamento !== 'ALL',
    filtroCargo !== 'ALL',
    filtroPerfil !== 'ALL',
    filtroDenominacion !== 'ALL',
    filtroTipoCosto !== 'ALL',
    filtroSede !== 'ALL',
    filtroGenero !== 'ALL',
    filtroEstado !== 'ALL',
    filtroQuickPC !== 'ALL',
    canAccessTabulador ? filtroQuickTabulador !== 'ALL' : filtroQuickHumand !== 'ALL',
  ].filter(Boolean).length;

  const hasActiveFilters = activeFiltersCount > 0;

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
    setFiltroQuickPC('ALL');
    setFiltroQuickTabulador('ALL');
    setFiltroQuickHumand('ALL');
  };

  const columns: Column<EmpleadoConEmpresa>[] = [
    {
      key: 'codigo_empleado',
      header: 'Código',
      sortable: true,
      render: (row) => (
        <span className="font-mono font-bold text-brand-300 text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
          {row.codigo_empleado}
        </span>
      ),
      className: 'w-24',
    },
    {
      key: 'nacionalidad',
      header: 'Nacionalidad',
      sortable: true,
      exportValue: (row) => row.nacionalidad || '',
      render: (row) => (
        row.nacionalidad ? (
          <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border inline-block ${
            row.nacionalidad === 'V'
              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60'
              : 'bg-amber-950/70 text-amber-300 border-amber-800/60'
          }`}>
            {row.nacionalidad}
          </span>
        ) : (
          <span className="text-slate-500 italic text-[11px]">-</span>
        )
      ),
      className: 'w-24 text-center',
    },
    {
      key: 'dni_numero',
      header: 'DNI',
      sortable: true,
      exportValue: (row) => row.dni_numero || '',
      render: (row) => (
        <span className="font-mono text-xs font-medium text-slate-200">
          {row.dni_numero || (
            <span className="text-slate-500 italic text-[11px]">Sin DNI</span>
          )}
        </span>
      ),
      className: 'w-28',
    },
    {
      key: 'nombres',
      header: 'Colaborador',
      sortable: true,
      exportValue: (row) => `${row.nombres} ${row.apellidos || ''}`.trim(),
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
      key: 'ubicacion',
      header: 'Ubicación (Humand)',
      sortable: true,
      exportValue: (row) => row.ubicacion || '',
      render: (row) => (
        row.ubicacion ? (
          <span className="font-medium text-xs text-sky-300 bg-sky-950/60 border border-sky-800/50 px-2 py-0.5 rounded inline-flex items-center gap-1">
            <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
            {row.ubicacion}
          </span>
        ) : (
          <span className="text-slate-500 italic text-[11px]">Sin asignar</span>
        )
      ),
      className: 'w-28',
    },
    {
      key: 'edo_civil',
      header: 'Edo. Civil / Nivel Ed.',
      sortable: true,
      exportValue: (row) => `${row.edo_civil || ''} / ${row.nivel_educativo || ''}`.trim(),
      render: (row) => (
        <div className="space-y-0.5 text-xs">
          {row.edo_civil ? (
            <div className="text-slate-200 font-medium">{row.edo_civil}</div>
          ) : (
            <div className="text-slate-500 italic text-[11px]">Sin Edo. Civil</div>
          )}
          {row.nivel_educativo ? (
            <div className="text-[11px] text-brand-300/90 flex items-center gap-1">
              <GraduationCap className="w-3 h-3 text-brand-400 shrink-0" />
              <span>{row.nivel_educativo}</span>
            </div>
          ) : null}
        </div>
      ),
    },
    ...(canAccessTabulador
      ? [
          {
            key: 'tabulador_id',
            header: 'Banda Salarial',
            render: (row: EmpleadoConEmpresa) => {
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
          } as Column<EmpleadoConEmpresa>,
        ]
      : []),
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
      className: 'w-24',
    },
    {
      key: 'estatus_h',
      header: 'Humand',
      sortable: true,
      exportValue: (row) => (row.estatus_h === 1 ? 'Sincronizar' : 'Solo TH'),
      render: (row) => (
        row.estatus_h === 1 ? (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
            title="Habilitado para sincronizar con Humand (estatus_h = 1)"
          >
            <Share2 className="w-2.5 h-2.5 text-emerald-400" />
            Humand
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700"
            title="Registro exclusivo de Aplicación TH (estatus_h = 0)"
          >
            Solo TH
          </span>
        )
      ),
      className: 'w-24 text-center',
    },
    {
      key: 'acciones',
      header: 'Acciones',
      exportable: false,
      className: 'text-right w-36',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => {
              setSyncTargetEmpleado(row);
              setIsSyncModalOpen(true);
            }}
            className={`p-1.5 rounded-lg border transition-colors ${
              row.estatus_h === 1
                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title={
              row.estatus_h === 1
                ? 'Sincronizar a Humand (Resolución en Cascada)'
                : 'Incorporar / Sincronizar a Humand (Resolución en Cascada)'
            }
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
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
  const totalEmpleadosSinPerfil = empleados.length - totalEmpleadosConPerfil;
  const totalEmpleadosActivos = empleados.filter((e) => e.estado_laboral === 'ACTIVO').length;
  const totalEmpleadosConBanda = empleados.filter((e) => Boolean(e.tabulador_id)).length;
  const totalEmpleadosSinBanda = empleados.length - totalEmpleadosConBanda;
  const totalEmpleadosHumand = empleados.filter((e) => e.estatus_h === 1).length;
  const totalEmpleadosNoHumand = empleados.length - totalEmpleadosHumand;

  const isTotalActive =
    filtroEstado === 'ALL' &&
    filtroQuickPC === 'ALL' &&
    (canAccessTabulador ? filtroQuickTabulador === 'ALL' : filtroQuickHumand === 'ALL') &&
    !hasActiveFilters;
  const isActivosActive = filtroEstado === 'ACTIVO';

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

      {/* KPI Cards (Interactivas) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Plantilla */}
        <button
          type="button"
          onClick={() => {
            if (hasActiveFilters) {
              resetAllFilters();
            } else {
              setFiltroEstado('ALL');
              setFiltroQuickPC('ALL');
              setFiltroQuickTabulador('ALL');
              setFiltroQuickHumand('ALL');
            }
          }}
          className={`p-4 rounded-2xl text-left backdrop-blur-xl transition-all duration-200 group cursor-pointer focus:outline-none hover:-translate-y-0.5 hover:shadow-xl ${
            isTotalActive
              ? 'bg-slate-900/80 border-2 border-brand-500/80 ring-2 ring-brand-500/20 shadow-brand-500/10 shadow-lg'
              : 'bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/90'
          }`}
          title="Clic para ver la plantilla completa"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider group-hover:text-slate-200 transition-colors">
              Total Plantilla
            </span>
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <p className="text-2xl font-bold text-white">{empleados.length}</p>
            {hasActiveFilters && (
              <span className="text-[10px] font-semibold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-500/20">
                Ver todos
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">Colaboradores registrados</span>
        </button>

        {/* 2. Activos */}
        <button
          type="button"
          onClick={() => setFiltroEstado(filtroEstado === 'ACTIVO' ? 'ALL' : 'ACTIVO')}
          className={`p-4 rounded-2xl text-left backdrop-blur-xl transition-all duration-200 group cursor-pointer focus:outline-none hover:-translate-y-0.5 hover:shadow-xl ${
            isActivosActive
              ? 'bg-emerald-950/40 border-2 border-emerald-500/80 ring-2 ring-emerald-500/30 shadow-emerald-500/10 shadow-lg'
              : 'bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/50 hover:bg-emerald-950/20'
          }`}
          title={isActivosActive ? 'Clic para quitar filtro de activos' : 'Clic para filtrar solo activos'}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Activos</span>
            <div className={`p-2 rounded-xl transition-all ${
              isActivosActive ? 'bg-emerald-500/30 text-emerald-300' : 'bg-emerald-500/10 text-emerald-400 group-hover:scale-110'
            }`}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <p className="text-2xl font-bold text-emerald-400">{totalEmpleadosActivos}</p>
            {isActivosActive && (
              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/40">
                Filtrado
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">En funciones operativas</span>
        </button>

        {/* 3. Perfiles (PC) */}
        <div
          onClick={() => setFiltroQuickPC(filtroQuickPC === 'CON_PC' ? 'ALL' : 'CON_PC')}
          className={`p-4 rounded-2xl text-left backdrop-blur-xl transition-all duration-200 group cursor-pointer focus:outline-none hover:-translate-y-0.5 hover:shadow-xl ${
            filtroQuickPC === 'CON_PC'
              ? 'bg-cyan-950/40 border-2 border-cyan-500/80 ring-2 ring-cyan-500/30 shadow-cyan-500/10 shadow-lg'
              : filtroQuickPC === 'SIN_PC'
              ? 'bg-amber-950/40 border-2 border-amber-500/80 ring-2 ring-amber-500/30 shadow-amber-500/10 shadow-lg'
              : 'bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/50 hover:bg-cyan-950/20'
          }`}
          title="Clic para filtrar colaboradores con perfil de competencias (PC)"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Perfiles (PC)</span>
            <div className={`p-2 rounded-xl transition-all ${
              filtroQuickPC === 'CON_PC' ? 'bg-cyan-500/30 text-cyan-300' : 'bg-cyan-500/10 text-cyan-400 group-hover:scale-110'
            }`}>
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <p className="text-2xl font-bold text-cyan-400">{totalEmpleadosConPerfil}</p>
            {filtroQuickPC === 'CON_PC' && (
              <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-full border border-cyan-500/40">
                Con PC
              </span>
            )}
            {filtroQuickPC === 'SIN_PC' && (
              <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40">
                Pendientes
              </span>
            )}
          </div>
          <div className="mt-1">
            {totalEmpleadosSinPerfil > 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFiltroQuickPC(filtroQuickPC === 'SIN_PC' ? 'ALL' : 'SIN_PC');
                }}
                className={`text-[11px] transition-all rounded px-1.5 py-0.5 -mx-1.5 cursor-pointer ${
                  filtroQuickPC === 'SIN_PC'
                    ? 'bg-amber-500/25 text-amber-300 font-bold border border-amber-500/40'
                    : 'text-slate-500 hover:text-amber-300 hover:bg-amber-500/15'
                }`}
                title="Clic para filtrar únicamente los pendientes de PC"
              >
                {totalEmpleadosSinPerfil} pendientes de PC
              </button>
            ) : (
              <span className="text-[11px] text-slate-500">100% con perfil asignado</span>
            )}
          </div>
        </div>

        {/* 4. Tabulador Salarial (Solo Admin y Gerente TH) o Integración Humand (Otros roles) */}
        {canAccessTabulador ? (
          <div
            onClick={() => setFiltroQuickTabulador(filtroQuickTabulador === 'CON_BANDA' ? 'ALL' : 'CON_BANDA')}
            className={`p-4 rounded-2xl text-left backdrop-blur-xl transition-all duration-200 group cursor-pointer focus:outline-none hover:-translate-y-0.5 hover:shadow-xl ${
              filtroQuickTabulador === 'CON_BANDA'
                ? 'bg-indigo-950/40 border-2 border-indigo-500/80 ring-2 ring-indigo-500/30 shadow-indigo-500/10 shadow-lg'
                : filtroQuickTabulador === 'SIN_BANDA'
                ? 'bg-rose-950/40 border-2 border-rose-500/80 ring-2 ring-rose-500/30 shadow-rose-500/10 shadow-lg'
                : 'bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/50 hover:bg-indigo-950/20'
            }`}
            title="Clic para filtrar colaboradores con banda salarial"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Tabulador Salarial</span>
              <div className={`p-2 rounded-xl transition-all ${
                filtroQuickTabulador === 'CON_BANDA' ? 'bg-indigo-500/30 text-indigo-300' : 'bg-indigo-500/10 text-indigo-400 group-hover:scale-110'
              }`}>
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <p className="text-2xl font-bold text-indigo-400">{totalEmpleadosConBanda}</p>
              {filtroQuickTabulador === 'CON_BANDA' && (
                <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/40">
                  Con Banda
                </span>
              )}
              {filtroQuickTabulador === 'SIN_BANDA' && (
                <span className="text-[10px] font-bold text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/40">
                  Sin Banda
                </span>
              )}
            </div>
            <div className="mt-1">
              {totalEmpleadosSinBanda > 0 ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFiltroQuickTabulador(filtroQuickTabulador === 'SIN_BANDA' ? 'ALL' : 'SIN_BANDA');
                  }}
                  className={`text-[11px] transition-all rounded px-1.5 py-0.5 -mx-1.5 cursor-pointer ${
                    filtroQuickTabulador === 'SIN_BANDA'
                      ? 'bg-rose-500/25 text-rose-300 font-bold border border-rose-500/40'
                      : 'text-slate-500 hover:text-rose-300 hover:bg-rose-500/15'
                  }`}
                  title="Clic para filtrar colaboradores sin banda asignada"
                >
                  <span className="font-semibold text-rose-400">{totalEmpleadosSinBanda}</span> sin banda asignada
                </button>
              ) : (
                <span className="text-[11px] text-slate-500">100% con banda asignada</span>
              )}
            </div>
          </div>
        ) : (
          <div
            onClick={() => setFiltroQuickHumand(filtroQuickHumand === 'HABILITADO' ? 'ALL' : 'HABILITADO')}
            className={`p-4 rounded-2xl text-left backdrop-blur-xl transition-all duration-200 group cursor-pointer focus:outline-none hover:-translate-y-0.5 hover:shadow-xl ${
              filtroQuickHumand === 'HABILITADO'
                ? 'bg-cyan-950/40 border-2 border-cyan-500/80 ring-2 ring-cyan-500/30 shadow-cyan-500/10 shadow-lg'
                : filtroQuickHumand === 'EXCLUIDO'
                ? 'bg-amber-950/40 border-2 border-amber-500/80 ring-2 ring-amber-500/30 shadow-amber-500/10 shadow-lg'
                : 'bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/50 hover:bg-cyan-950/20'
            }`}
            title="Clic para filtrar colaboradores sincronizados con Humand"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Integración Humand</span>
              <div className={`p-2 rounded-xl transition-all ${
                filtroQuickHumand === 'HABILITADO' ? 'bg-cyan-500/30 text-cyan-300' : 'bg-cyan-500/10 text-cyan-400 group-hover:scale-110'
              }`}>
                <Share2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <p className="text-2xl font-bold text-cyan-400">{totalEmpleadosHumand}</p>
              {filtroQuickHumand === 'HABILITADO' && (
                <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-full border border-cyan-500/40">
                  Habilitados
                </span>
              )}
              {filtroQuickHumand === 'EXCLUIDO' && (
                <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40">
                  Excluidos
                </span>
              )}
            </div>
            <div className="mt-1">
              {totalEmpleadosNoHumand > 0 ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFiltroQuickHumand(filtroQuickHumand === 'EXCLUIDO' ? 'ALL' : 'EXCLUIDO');
                  }}
                  className={`text-[11px] transition-all rounded px-1.5 py-0.5 -mx-1.5 cursor-pointer ${
                    filtroQuickHumand === 'EXCLUIDO'
                      ? 'bg-amber-500/25 text-amber-300 font-bold border border-amber-500/40'
                      : 'text-slate-500 hover:text-amber-300 hover:bg-amber-500/15'
                  }`}
                  title="Clic para filtrar colaboradores no sincronizados a Humand"
                >
                  <span className="font-semibold text-amber-400">{totalEmpleadosNoHumand}</span> excluidos de Humand
                </button>
              ) : (
                <span className="text-[11px] text-slate-500">100% habilitados en Humand</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-xl shadow-sm space-y-3">
        {/* Header toolbar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Filter className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Filtros
            </span>
            {hasActiveFilters ? (
              <span className="px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-400 border border-brand-500/30 text-[10px] font-semibold">
                {activeFiltersCount} {activeFiltersCount === 1 ? 'activo' : 'activos'}
              </span>
            ) : (
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                Sin filtros aplicados
              </span>
            )}
            {filtroEmpresa !== 'ALL' && (
              <span className="hidden sm:inline px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                Empresa activa
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Restablecer todos los filtros"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>

        {/* Combos Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2">
          {/* 1. Empresa Filter */}
          <div className="relative">
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
              className={`w-full pl-2.5 pr-7 py-2 bg-slate-950/80 border rounded-xl text-xs transition-all appearance-none cursor-pointer focus:outline-none truncate ${
                filtroEmpresa !== 'ALL'
                  ? 'border-emerald-500/80 bg-emerald-500/10 text-emerald-300 font-semibold ring-1 ring-emerald-500/30'
                  : 'border-slate-800/90 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60 font-medium'
              }`}
              title="Filtrar por Empresa"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">Empresas</option>
              {empresas.map((emp) => {
                const count = empleadosConEmpresa.filter((e) => e.empresa_id === emp.empresa_id).length;
                return (
                  <option key={emp.empresa_id} value={String(emp.empresa_id)} className="bg-slate-900 text-slate-200">
                    {emp.nombre_corto ? `${emp.nombre_corto} - ` : ''}{emp.razon_social} ({count})
                  </option>
                );
              })}
              {(() => {
                const sinEmpresaCount = empleadosConEmpresa.filter((e) => !e.empresa_id).length;
                if (sinEmpresaCount > 0) {
                  return (
                    <option value="SIN_EMPRESA" className="bg-slate-900 text-slate-200">
                      -- Sin Empresa Asignada ({sinEmpresaCount}) --
                    </option>
                  );
                }
                return null;
              })()}
            </select>
            <ChevronDown className={`w-3.5 h-3.5 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors ${
              filtroEmpresa !== 'ALL' ? 'text-emerald-400' : 'text-slate-500'
            }`} />
          </div>

          {/* 2. Departamento Filter */}
          <div className="relative">
            <select
              value={filtroDepartamento}
              onChange={(e) => setFiltroDepartamento(e.target.value)}
              className={`w-full pl-2.5 pr-7 py-2 bg-slate-950/80 border rounded-xl text-xs transition-all appearance-none cursor-pointer focus:outline-none truncate ${
                filtroDepartamento !== 'ALL'
                  ? 'border-brand-500/80 bg-brand-500/10 text-brand-300 font-semibold ring-1 ring-brand-500/30'
                  : 'border-slate-800/90 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60 font-medium'
              }`}
              title="Filtrar por Departamento"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">Departamentos</option>
              {filtroEmpresa === 'ALL' ? (
                <>
                  {empresas.map((emp) => {
                    const deptosEmp = departamentos
                      .filter((d) => getDepartamentoHierarchy(d.codigo).empresa?.empresa_id === emp.empresa_id)
                      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));

                    if (deptosEmp.length === 0) return null;
                    const empBadge = emp.nombre_corto || emp.codigo;
                    return (
                      <optgroup
                        key={emp.empresa_id}
                        label={`🏢 ${empBadge} - ${emp.razon_social}`}
                        className="bg-slate-900 font-semibold text-brand-400"
                      >
                        {deptosEmp.map((d) => (
                          <option key={d.codigo} value={d.codigo} className="bg-slate-900 text-slate-200 font-normal">
                            [{empBadge}] {d.nombre} ({d.codigo})
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                  {(() => {
                    const sinEmp = departamentos
                      .filter((d) => !getDepartamentoHierarchy(d.codigo).empresa)
                      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
                    if (sinEmp.length === 0) return null;
                    return (
                      <optgroup label="Otros / Sin Empresa" className="bg-slate-900 text-slate-400 font-semibold">
                        {sinEmp.map((d) => (
                          <option key={d.codigo} value={d.codigo} className="bg-slate-900 text-slate-300 font-normal">
                            {d.nombre} ({d.codigo})
                          </option>
                        ))}
                      </optgroup>
                    );
                  })()}
                </>
              ) : (
                [...departamentosFiltrados]
                  .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
                  .map((d) => {
                    const h = getDepartamentoHierarchy(d.codigo);
                    const empBadge = h.empresa ? (h.empresa.nombre_corto || h.empresa.codigo) : '';
                    return (
                      <option key={d.codigo} value={d.codigo} className="bg-slate-900 text-slate-200">
                        {empBadge ? `[${empBadge}] ` : ''}{d.nombre} ({d.codigo})
                      </option>
                    );
                  })
              )}
            </select>
            <ChevronDown className={`w-3.5 h-3.5 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors ${
              filtroDepartamento !== 'ALL' ? 'text-brand-400' : 'text-slate-500'
            }`} />
          </div>

          {/* 3. Cargo Filter */}
          <div className="relative">
            <select
              value={filtroCargo}
              onChange={(e) => setFiltroCargo(e.target.value)}
              className={`w-full pl-2.5 pr-7 py-2 bg-slate-950/80 border rounded-xl text-xs transition-all appearance-none cursor-pointer focus:outline-none truncate ${
                filtroCargo !== 'ALL'
                  ? 'border-brand-500/80 bg-brand-500/10 text-brand-300 font-semibold ring-1 ring-brand-500/30'
                  : 'border-slate-800/90 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60 font-medium'
              }`}
              title="Filtrar por Cargo"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">Cargos</option>
              {[...cargos]
                .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
                .map((c) => (
                  <option key={c.codigo} value={c.codigo} className="bg-slate-900 text-slate-200">
                    {c.nombre} ({c.codigo})
                  </option>
                ))}
            </select>
            <ChevronDown className={`w-3.5 h-3.5 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors ${
              filtroCargo !== 'ALL' ? 'text-brand-400' : 'text-slate-500'
            }`} />
          </div>

          {/* 4. Perfil Filter */}
          <div className="relative">
            <select
              value={filtroPerfil}
              onChange={(e) => setFiltroPerfil(e.target.value)}
              className={`w-full pl-2.5 pr-7 py-2 bg-slate-950/80 border rounded-xl text-xs transition-all appearance-none cursor-pointer focus:outline-none truncate ${
                filtroPerfil !== 'ALL'
                  ? 'border-cyan-500/80 bg-cyan-500/10 text-cyan-300 font-semibold ring-1 ring-cyan-500/30'
                  : 'border-slate-800/90 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60 font-medium'
              }`}
              title="Filtrar por Perfil de Competencias"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">Perfiles</option>
              <option value="SIN_PC" className="bg-slate-900 text-slate-200">-- Sin Perfil Asignado --</option>
              {perfilesCompetencias.map((pc) => (
                <option key={pc.codigo_pc} value={pc.codigo_pc} className="bg-slate-900 text-slate-200">
                  {pc.codigo_pc} - {pc.perfil}
                </option>
              ))}
            </select>
            <ChevronDown className={`w-3.5 h-3.5 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors ${
              filtroPerfil !== 'ALL' ? 'text-cyan-400' : 'text-slate-500'
            }`} />
          </div>

          {/* 5. Denominación Filter */}
          <div className="relative">
            <select
              value={filtroDenominacion}
              onChange={(e) => setFiltroDenominacion(e.target.value)}
              className={`w-full pl-2.5 pr-7 py-2 bg-slate-950/80 border rounded-xl text-xs transition-all appearance-none cursor-pointer focus:outline-none truncate ${
                filtroDenominacion !== 'ALL'
                  ? 'border-indigo-500/80 bg-indigo-500/10 text-indigo-300 font-semibold ring-1 ring-indigo-500/30'
                  : 'border-slate-800/90 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60 font-medium'
              }`}
              title="Filtrar por Denominación del Cargo"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">Denominaciones</option>
              <option value="SIN_DC" className="bg-slate-900 text-slate-200">-- Cargos Sin Denominación --</option>
              {[...denominaciones]
                .sort((a, b) => a.denominacion.localeCompare(b.denominacion, 'es', { sensitivity: 'base' }))
                .map((dc) => (
                  <option key={dc.codigo_dc} value={dc.codigo_dc} className="bg-slate-900 text-slate-200">
                    {dc.codigo_dc} - {dc.denominacion}
                  </option>
                ))}
            </select>
            <ChevronDown className={`w-3.5 h-3.5 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors ${
              filtroDenominacion !== 'ALL' ? 'text-indigo-400' : 'text-slate-500'
            }`} />
          </div>

          {/* 6. Tipo de Costo Filter */}
          <div className="relative">
            <select
              value={filtroTipoCosto}
              onChange={(e) => setFiltroTipoCosto(e.target.value)}
              className={`w-full pl-2.5 pr-7 py-2 bg-slate-950/80 border rounded-xl text-xs transition-all appearance-none cursor-pointer focus:outline-none truncate ${
                filtroTipoCosto !== 'ALL'
                  ? 'border-amber-500/80 bg-amber-500/10 text-amber-300 font-semibold ring-1 ring-amber-500/30'
                  : 'border-slate-800/90 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60 font-medium'
              }`}
              title="Filtrar por Tipo de Costo"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">Tipos de Costo</option>
              {tipoCostos.map((tc) => (
                <option key={tc.codigo_tc} value={tc.codigo_tc} className="bg-slate-900 text-slate-200">
                  {tc.nombre} ({tc.codigo_tc}) - {tc.descripcion}
                </option>
              ))}
            </select>
            <ChevronDown className={`w-3.5 h-3.5 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors ${
              filtroTipoCosto !== 'ALL' ? 'text-amber-400' : 'text-slate-500'
            }`} />
          </div>

          {/* 7. Sede Filter */}
          <div className="relative">
            <select
              value={filtroSede}
              onChange={(e) => setFiltroSede(e.target.value)}
              className={`w-full pl-2.5 pr-7 py-2 bg-slate-950/80 border rounded-xl text-xs transition-all appearance-none cursor-pointer focus:outline-none truncate ${
                filtroSede !== 'ALL'
                  ? 'border-rose-500/80 bg-rose-500/10 text-rose-300 font-semibold ring-1 ring-rose-500/30'
                  : 'border-slate-800/90 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60 font-medium'
              }`}
              title="Filtrar por Sede"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">Sedes</option>
              {sedesDisponibles.map((s) => (
                <option key={s} value={s} className="bg-slate-900 text-slate-200">
                  {s}
                </option>
              ))}
            </select>
            <ChevronDown className={`w-3.5 h-3.5 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors ${
              filtroSede !== 'ALL' ? 'text-rose-400' : 'text-slate-500'
            }`} />
          </div>

          {/* 8. Estado Filter */}
          <div className="relative">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className={`w-full pl-2.5 pr-7 py-2 bg-slate-950/80 border rounded-xl text-xs transition-all appearance-none cursor-pointer focus:outline-none truncate ${
                filtroEstado !== 'ALL'
                  ? 'border-emerald-500/80 bg-emerald-500/10 text-emerald-300 font-semibold ring-1 ring-emerald-500/30'
                  : 'border-slate-800/90 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60 font-medium'
              }`}
              title="Filtrar por Estado Laboral"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">Estados</option>
              <option value="ACTIVO" className="bg-slate-900 text-slate-200">ACTIVO</option>
              <option value="INACTIVO" className="bg-slate-900 text-slate-200">INACTIVO</option>
              <option value="VACACIONES" className="bg-slate-900 text-slate-200">VACACIONES</option>
              <option value="LICENCIA" className="bg-slate-900 text-slate-200">LICENCIA</option>
            </select>
            <ChevronDown className={`w-3.5 h-3.5 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors ${
              filtroEstado !== 'ALL' ? 'text-emerald-400' : 'text-slate-500'
            }`} />
          </div>

          {/* 9. Género Filter */}
          <div className="relative">
            <select
              value={filtroGenero}
              onChange={(e) => setFiltroGenero(e.target.value)}
              className={`w-full pl-2.5 pr-7 py-2 bg-slate-950/80 border rounded-xl text-xs transition-all appearance-none cursor-pointer focus:outline-none truncate ${
                filtroGenero !== 'ALL'
                  ? 'border-pink-500/80 bg-pink-500/10 text-pink-300 font-semibold ring-1 ring-pink-500/30'
                  : 'border-slate-800/90 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60 font-medium'
              }`}
              title="Filtrar por Género"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">Géneros</option>
              <option value="Mujer" className="bg-slate-900 text-slate-200">Mujer</option>
              <option value="Hombre" className="bg-slate-900 text-slate-200">Hombre</option>
            </select>
            <ChevronDown className={`w-3.5 h-3.5 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors ${
              filtroGenero !== 'ALL' ? 'text-pink-400' : 'text-slate-500'
            }`} />
          </div>
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        data={filteredEmpleados}
        columns={columns}
        loading={loading}
        searchKeys={[
          'codigo_empleado',
          'nacionalidad',
          'dni_numero',
          'documento_identidad',
          'nombres',
          'apellidos',
          'email',
          'codigo_cargo',
          'codigo_departamento',
          'sede',
          'ubicacion',
          'edo_civil',
          'nivel_educativo',
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

          {/* Ubicación (Humand), Estado Civil y Nivel Educativo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                Ubicación (Humand)
              </label>
              <select
                value={ubicacion}
                onChange={(e) => {
                  setUbicacion(e.target.value);
                  if (!sede) setSede(e.target.value);
                }}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-rose-500"
              >
                <option value="">-- Sin Ubicación --</option>
                <option value="Barquisimeto">Barquisimeto</option>
                <option value="Caracas">Caracas</option>
                <option value="Maracaibo">Maracaibo</option>
                <option value="Puerto Ordaz">Puerto Ordaz</option>
                <option value="San Cristobal">San Cristobal</option>
                <option value="Valencia">Valencia</option>
                <option value="Yagua">Yagua</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                Estado Civil
              </label>
              <select
                value={edoCivil}
                onChange={(e) => setEdoCivil(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- No especificado --</option>
                <option value="Soltero">Soltero</option>
                <option value="Casado">Casado</option>
                <option value="Divorciado">Divorciado</option>
                <option value="Viudo">Viudo</option>
                <option value="Concubinato">Concubinato</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
                Nivel Educativo
              </label>
              <select
                value={nivelEducativo}
                onChange={(e) => setNivelEducativo(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">-- No especificado --</option>
                <option value="Bachiller">Bachiller</option>
                <option value="Técnico Medio">Técnico Medio</option>
                <option value="Técnico Superior">Técnico Superior</option>
                <option value="Universitario">Universitario</option>
                <option value="Posgrado">Posgrado</option>
              </select>
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

          {/* Estructura Organizacional, Empresa y Puesto */}
          <div className="pt-2 border-t border-slate-800/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Estructura Organizacional y Puesto
                </span>
              </div>
              {formEmpresaId && (
                <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  Filtrando por empresa
                </span>
              )}
            </div>

            {/* Fila 1: Empresa, Departamento y Cargo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* 1. Selector de Empresa / Filial */}
              <div>
                <label className="block text-xs font-semibold text-emerald-400 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                    Empresa / Filial *
                  </span>
                </label>
                <select
                  value={formEmpresaId}
                  onChange={(e) => {
                    const newEmpId = e.target.value;
                    setFormEmpresaId(newEmpId);
                    // Si el departamento seleccionado actualmente no pertenece a la nueva empresa, resetearlo
                    if (codigoDepartamento && newEmpId) {
                      const h = getDepartamentoHierarchy(codigoDepartamento);
                      if (h.empresa && String(h.empresa.empresa_id) !== newEmpId) {
                        setCodigoDepartamento('');
                      }
                    }
                    // Si la banda salarial seleccionada no pertenece a la nueva empresa, resetearla
                    if (tabuladorId && newEmpId) {
                      const tab = tabuladores.find((t) => t.tabulador_id === tabuladorId);
                      if (tab && String(tab.empresa_id) !== newEmpId) {
                        setTabuladorId('');
                      }
                    }
                  }}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-emerald-500/40 focus:border-emerald-400 rounded-xl text-sm text-white focus:outline-none ring-1 ring-emerald-500/20"
                >
                  <option value="">-- Todas las Empresas --</option>
                  {empresas.map((emp) => (
                    <option key={emp.empresa_id} value={String(emp.empresa_id)}>
                      {emp.nombre_corto ? `${emp.nombre_corto} - ` : ''}{emp.razon_social}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Selector de Departamento Asignado */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Departamento Asignado *
                </label>
                <select
                  required
                  value={codigoDepartamento}
                  onChange={(e) => {
                    const newDeptoCode = e.target.value;
                    setCodigoDepartamento(newDeptoCode);
                    // Si no había empresa seleccionada, autoseleccionar la empresa del departamento
                    if (!formEmpresaId && newDeptoCode) {
                      const h = getDepartamentoHierarchy(newDeptoCode);
                      if (h.empresa?.empresa_id) {
                        setFormEmpresaId(String(h.empresa.empresa_id));
                      }
                    }
                  }}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="" disabled>-- Selecciona un Departamento --</option>
                  {formEmpresaId ? (
                    [...modalDepartamentos]
                      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
                      .map((d) => {
                        const h = getDepartamentoHierarchy(d.codigo);
                        const empBadge = h.empresa ? (h.empresa.nombre_corto || h.empresa.codigo) : '';
                        return (
                          <option key={d.codigo} value={d.codigo}>
                            {empBadge ? `[${empBadge}] ` : ''}{d.nombre} ({d.codigo})
                          </option>
                        );
                      })
                  ) : (
                    empresas.map((emp) => {
                      const deptosEmp = modalDepartamentos
                        .filter((d) => getDepartamentoHierarchy(d.codigo).empresa?.empresa_id === emp.empresa_id)
                        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
                      if (deptosEmp.length === 0) return null;
                      const empBadge = emp.nombre_corto || emp.codigo;
                      return (
                        <optgroup key={emp.empresa_id} label={`🏢 ${empBadge} - ${emp.razon_social}`} className="bg-slate-900 text-brand-400 font-semibold">
                          {deptosEmp.map((d) => (
                            <option key={d.codigo} value={d.codigo} className="bg-slate-900 text-slate-200 font-normal">
                              [{empBadge}] {d.nombre} ({d.codigo})
                            </option>
                          ))}
                        </optgroup>
                      );
                    })
                  )}
                  {!formEmpresaId && (() => {
                    const sinEmp = modalDepartamentos
                      .filter((d) => !getDepartamentoHierarchy(d.codigo).empresa)
                      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
                    if (sinEmp.length === 0) return null;
                    return (
                      <optgroup label="Sin Empresa Vinculada" className="bg-slate-900 text-slate-400 font-semibold">
                        {sinEmp.map((d) => (
                          <option key={d.codigo} value={d.codigo} className="bg-slate-900 text-slate-300 font-normal">
                            {d.nombre} ({d.codigo})
                          </option>
                        ))}
                      </optgroup>
                    );
                  })()}
                </select>
              </div>

              {/* 3. Selector de Cargo Asignado */}
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


              </div>
            </div>

            {/* Tarjeta de Confirmación de Estructura Organizacional en Tiempo Real */}
            {(() => {
              if (!codigoDepartamento) return null;
              const h = getDepartamentoHierarchy(codigoDepartamento);
              if (!h.departamento) return null;

              return (
                <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/30 text-xs shadow-inner transition-all">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5 mb-2">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Estructura Organizacional Confirmada</span>
                    </div>
                    {h.empresa && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {h.empresa.nombre_corto || h.empresa.codigo}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-300 text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-semibold">Empresa / Razón Social:</span>
                      <span className="font-medium text-white truncate block" title={h.empresa?.razon_social}>
                        {h.empresa?.razon_social || 'No asignada'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-semibold">Dirección:</span>
                      <span className="font-medium text-slate-200 truncate block" title={h.direccion?.nombre}>
                        {h.direccion?.nombre || 'No asignada'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-semibold">Gerencia:</span>
                      <span className="font-medium text-slate-200 truncate block" title={h.gerencia?.nombre}>
                        {h.gerencia?.nombre || 'No asignada'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-semibold">Centro de Costos:</span>
                      <span className="font-semibold text-amber-300 block">
                        {h.gerencia?.codigo_cc || 'Sin CC'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Tipo de Costo, Perfil de Competencias y Banda Salarial */}
          <div className={canAccessTabulador ? "grid grid-cols-1 sm:grid-cols-3 gap-4" : "grid grid-cols-1 sm:grid-cols-2 gap-4"}>
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

            {canAccessTabulador && (
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
                  {formEmpresaId ? (
                    modalTabuladores.map((t) => (
                      <option key={t.tabulador_id} value={t.tabulador_id}>
                        {t.codigo_banda} - Mediana: ${Number(t.salario_mediana_100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </option>
                    ))
                  ) : (
                    empresas.map((emp) => {
                      const tabsEmp = modalTabuladores.filter((t) => t.empresa_id === emp.empresa_id);
                      if (tabsEmp.length === 0) return null;
                      const empBadge = emp.nombre_corto || emp.codigo;
                      return (
                        <optgroup key={emp.empresa_id} label={`🏢 Bandas ${empBadge}`}>
                          {tabsEmp.map((t) => (
                            <option key={t.tabulador_id} value={t.tabulador_id}>
                              [{empBadge}] {t.codigo_banda} - Mediana: ${Number(t.salario_mediana_100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })
                  )}
                </select>
              </div>
            )}
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

          {/* Gobernanza Humand (estatus_h) */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-cyan-900/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
            <div>
              <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Share2 className="w-4 h-4 text-cyan-400" />
                Sincronización con Humand (estatus_h)
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Determina si este registro se sube y actualiza en Humand durante la sincronización.
              </p>
            </div>
            <select
              value={estatusH}
              onChange={(e) => setEstatusH(Number(e.target.value))}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border focus:outline-none transition-colors ${
                estatusH === 1
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}
            >
              <option value={1}>1 - Habilitado para Humand</option>
              <option value={0}>0 - No sincronizar (Solo TH)</option>
            </select>
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
                  Sede / Localidad
                </span>
                <span className="text-slate-200 font-medium">
                  {detailEmpleado.sede || <span className="text-slate-500 italic">No asignada</span>}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-rose-400 block mb-1 font-semibold flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  Ubicación (Humand)
                </span>
                <span className="text-slate-200 font-medium">
                  {detailEmpleado.ubicacion || detailEmpleado.sede || <span className="text-slate-500 italic">No asignada</span>}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-indigo-400 block mb-1 font-semibold flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  Estado Civil
                </span>
                <span className="text-slate-200 font-medium">
                  {detailEmpleado.edo_civil || <span className="text-slate-500 italic">No registrado</span>}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-cyan-400 block mb-1 font-semibold flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5" />
                  Nivel Educativo
                </span>
                <span className="text-slate-200 font-medium">
                  {detailEmpleado.nivel_educativo || <span className="text-slate-500 italic">No registrado</span>}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-cyan-400 block mb-1 font-semibold flex items-center gap-1">
                  <Share2 className="w-3.5 h-3.5" />
                  Integración Humand
                </span>
                <div className="flex items-center justify-between gap-2 mt-1">
                  {detailEmpleado.estatus_h === 1 ? (
                    <span className="text-cyan-300 font-bold text-xs flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      Habilitado (estatus_h = 1)
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs font-medium">
                      Excluido (estatus_h = 0)
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSyncTargetEmpleado(detailEmpleado);
                      setIsSyncModalOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors flex items-center gap-1"
                    title="Sincronizar este colaborador a Humand con resolución en cascada"
                  >
                    <Share2 className="w-3 h-3" />
                    Sincronizar a Humand
                  </button>
                </div>
              </div>
            </div>

            {/* Tabulador Card (Solo Admin y Gerente TH) */}
            {canAccessTabulador && (() => {
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

      {/* Modal de Sincronización Real en Cascada con Humand */}
      <HumandSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => {
          setIsSyncModalOpen(false);
          setSyncTargetEmpleado(null);
        }}
        empleado={syncTargetEmpleado}
        allEmpleados={empleados}
        departamentos={departamentos}
        cargos={cargos}
        onSyncComplete={() => {
          loadData();
        }}
      />
    </div>
  );
};
