import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Building,
  Calculator,
  TrendingUp,
  Percent,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  DollarSign,
  Sparkles,
  Zap,
} from 'lucide-react';
import { tabuladorApi, empresasApi, empleadosApi } from '../../lib/insforge';
import type { TabuladorEmpresa, Empresa, Empleado, PosicionSalarialEval } from '../../lib/types';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EstadoBooleanBadge } from '../common/Badge';
import { useToast } from '../common/Toast';

export const TabuladorModule: React.FC = () => {
  const toast = useToast();
  const [tabuladores, setTabuladores] = useState<TabuladorEmpresa[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter by Empresa
  const [selectedEmpresaFilter, setSelectedEmpresaFilter] = useState<number | 'all'>('all');

  // Modal State: Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedBanda, setSelectedBanda] = useState<TabuladorEmpresa | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [empresaId, setEmpresaId] = useState<number | ''>('');
  const [codigoEmpresa, setCodigoEmpresa] = useState('');
  const [codigoBanda, setCodigoBanda] = useState('');
  const [cargosReferencia, setCargosReferencia] = useState('');
  const [salarioMinimo80, setSalarioMinimo80] = useState<number | ''>('');
  const [salarioMedioBajo90, setSalarioMedioBajo90] = useState<number | ''>('');
  const [salarioMediana100, setSalarioMediana100] = useState<number | ''>('');
  const [salarioMedioAlto110, setSalarioMedioAlto110] = useState<number | ''>('');
  const [salarioMaximo120, setSalarioMaximo120] = useState<number | ''>('');
  const [progresion, setProgresion] = useState<number | ''>(0);
  const [activo, setActivo] = useState(true);

  // Modal State: Compa-Ratio Calculator / Simulator
  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);
  const [calcEmpresaCodigo, setCalcEmpresaCodigo] = useState('');
  const [calcBandaCodigo, setCalcBandaCodigo] = useState('');
  const [calcSalario, setCalcSalario] = useState<number | ''>('');
  const [calcResult, setCalcResult] = useState<PosicionSalarialEval | null>(null);

  // Delete Dialog State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingBanda, setDeletingBanda] = useState<TabuladorEmpresa | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: tabData, error: tabErr }, { data: empData }, { data: empsData }] =
        await Promise.all([
          tabuladorApi.getResumen(),
          empresasApi.getAll(),
          empleadosApi.getAll(),
        ]);

      if (tabErr) toast.error('No se pudieron cargar las bandas salariales');
      setTabuladores(tabData || []);
      setEmpresas(empData || []);
      setEmpleados(empsData || []);

      if (empData && empData.length > 0) {
        setCalcEmpresaCodigo(empData[0].codigo);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When changing empresaId in form, update codigoEmpresa
  const handleEmpresaChange = (id: number) => {
    setEmpresaId(id);
    const emp = empresas.find(e => e.empresa_id === id);
    if (emp) setCodigoEmpresa(emp.codigo);
  };

  // Auto-calculate scale levels from median (100%)
  const autoCalculateScale = () => {
    if (!salarioMediana100 || Number(salarioMediana100) <= 0) {
      toast.error('Ingresa primero el valor de la Mediana (100%)');
      return;
    }
    const med = Number(salarioMediana100);
    setSalarioMinimo80(Number((med * 0.8).toFixed(4)));
    setSalarioMedioBajo90(Number((med * 0.9).toFixed(4)));
    setSalarioMedioAlto110(Number((med * 1.1).toFixed(4)));
    setSalarioMaximo120(Number((med * 1.2).toFixed(4)));
    toast.success('Escala calculada: 80%, 90%, 110% y 120%');
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedBanda(null);
    const defaultEmp = empresas[0];
    setEmpresaId(defaultEmp?.empresa_id || '');
    setCodigoEmpresa(defaultEmp?.codigo || '');
    setCodigoBanda('');
    setCargosReferencia('');
    setSalarioMinimo80('');
    setSalarioMedioBajo90('');
    setSalarioMediana100('');
    setSalarioMedioAlto110('');
    setSalarioMaximo120('');
    setProgresion(0.2);
    setActivo(true);
    setIsModalOpen(true);
  };

  const openEditModal = (banda: TabuladorEmpresa) => {
    setModalMode('edit');
    setSelectedBanda(banda);
    setEmpresaId(banda.empresa_id);
    setCodigoEmpresa(banda.codigo_empresa);
    setCodigoBanda(banda.codigo_banda);
    setCargosReferencia(banda.cargos_referencia);
    setSalarioMinimo80(banda.salario_minimo_80);
    setSalarioMedioBajo90(banda.salario_medio_bajo_90);
    setSalarioMediana100(banda.salario_mediana_100);
    setSalarioMedioAlto110(banda.salario_medio_alto_110);
    setSalarioMaximo120(banda.salario_maximo_120);
    setProgresion(banda.progresion);
    setActivo(banda.activo);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !empresaId ||
      !codigoBanda.trim() ||
      !cargosReferencia.trim() ||
      salarioMinimo80 === '' ||
      salarioMediana100 === '' ||
      salarioMaximo120 === ''
    ) {
      toast.error('Completa los campos obligatorios del tabulador');
      return;
    }

    setSaving(true);
    try {
      if (modalMode === 'create') {
        const { data, error } = await tabuladorApi.create({
          empresa_id: Number(empresaId),
          codigo_empresa: codigoEmpresa,
          codigo_banda: codigoBanda.trim().toUpperCase(),
          cargos_referencia: cargosReferencia.trim(),
          salario_minimo_80: Number(salarioMinimo80),
          salario_medio_bajo_90: Number(salarioMedioBajo90),
          salario_mediana_100: Number(salarioMediana100),
          salario_medio_alto_110: Number(salarioMedioAlto110),
          salario_maximo_120: Number(salarioMaximo120),
          progresion: Number(progresion || 0),
          activo,
        });

        if (error) {
          toast.error(error.message || 'Error al registrar la banda salarial');
        } else {
          toast.success('Banda salarial registrada exitosamente');
          setIsModalOpen(false);
          loadData();
        }
      } else if (selectedBanda) {
        const { data, error } = await tabuladorApi.update(selectedBanda.tabulador_id, {
          empresa_id: Number(empresaId),
          codigo_empresa: codigoEmpresa,
          codigo_banda: codigoBanda.trim().toUpperCase(),
          cargos_referencia: cargosReferencia.trim(),
          salario_minimo_80: Number(salarioMinimo80),
          salario_medio_bajo_90: Number(salarioMedioBajo90),
          salario_mediana_100: Number(salarioMediana100),
          salario_medio_alto_110: Number(salarioMedioAlto110),
          salario_maximo_120: Number(salarioMaximo120),
          progresion: Number(progresion || 0),
          activo,
        });

        if (error) {
          toast.error(error.message || 'Error al actualizar la banda salarial');
        } else {
          toast.success('Banda salarial actualizada correctamente');
          setIsModalOpen(false);
          loadData();
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (banda: TabuladorEmpresa) => {
    setDeletingBanda(banda);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingBanda) return;
    setDeleting(true);
    try {
      const { success, error } = await tabuladorApi.delete(deletingBanda.tabulador_id);
      if (success) {
        toast.success(`Banda ${deletingBanda.codigo_banda} eliminada`);
        setIsDeleteDialogOpen(false);
        setDeletingBanda(null);
        loadData();
      } else {
        toast.error(
          error?.message?.includes('foreign key')
            ? 'No se puede eliminar la banda salarial porque tiene colaboradores asignados.'
            : error?.message || 'Error al eliminar la banda'
        );
      }
    } finally {
      setDeleting(false);
    }
  };

  // Open Calculator with specific band preselected
  const openCalculator = (banda?: TabuladorEmpresa) => {
    if (banda) {
      setCalcEmpresaCodigo(banda.codigo_empresa);
      setCalcBandaCodigo(banda.codigo_banda);
      setCalcSalario(banda.salario_mediana_100);
    } else {
      if (tabuladores.length > 0) {
        setCalcEmpresaCodigo(tabuladores[0].codigo_empresa);
        setCalcBandaCodigo(tabuladores[0].codigo_banda);
        setCalcSalario(tabuladores[0].salario_mediana_100);
      }
    }
    setCalcResult(null);
    setIsCalcModalOpen(true);
  };

  const evaluateSalaryPosition = () => {
    if (!calcEmpresaCodigo || !calcBandaCodigo || calcSalario === '') {
      toast.error('Ingresa los parámetros requeridos para la evaluación');
      return;
    }
    const banda = tabuladores.find(
      t => t.codigo_empresa === calcEmpresaCodigo && t.codigo_banda === calcBandaCodigo
    );
    if (!banda) {
      toast.error('Banda no encontrada');
      return;
    }

    const sal = Number(calcSalario);
    const med = Number(banda.salario_mediana_100);
    const compaRatio = Number(((sal / med) * 100).toFixed(2));

    let pos = '';
    if (sal < banda.salario_minimo_80) pos = 'Por debajo del mínimo (<80%)';
    else if (sal < banda.salario_medio_bajo_90) pos = 'Nivel Inferior (80% - 90%)';
    else if (sal < banda.salario_mediana_100) pos = 'Nivel Medio-Bajo (90% - 100%)';
    else if (sal === banda.salario_mediana_100) pos = 'En la Mediana Exacta (100%)';
    else if (sal <= banda.salario_medio_alto_110) pos = 'Nivel Medio-Alto (100% - 110%)';
    else if (sal <= banda.salario_maximo_120) pos = 'Nivel Superior (110% - 120%)';
    else pos = 'Por encima del máximo (>120%)';

    setCalcResult({
      codigo_empresa: calcEmpresaCodigo,
      codigo_banda: calcBandaCodigo,
      salario_actual: sal,
      mediana: med,
      compa_ratio: compaRatio,
      posicion_banda: pos,
    });
  };

  // Filtered dataset
  const filteredData = tabuladores.filter((item) => {
    if (selectedEmpresaFilter === 'all') return true;
    return item.empresa_id === selectedEmpresaFilter;
  });

  const columns: Column<TabuladorEmpresa>[] = [
    {
      key: 'codigo_empresa',
      header: 'Empresa',
      sortable: true,
      render: (row) => {
        const emp = empresas.find(e => e.empresa_id === row.empresa_id);
        return (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-brand-400 border border-slate-700">
              {row.codigo_empresa}
            </span>
            <span className="text-xs text-slate-300 hidden md:inline truncate max-w-[120px]">
              {emp?.nombre_corto || row.nombre_empresa || 'Empresa'}
            </span>
          </div>
        );
      },
      className: 'w-36',
    },
    {
      key: 'codigo_banda',
      header: 'Banda',
      sortable: true,
      render: (row) => (
        <span className="font-mono font-bold text-sm text-white px-2 py-1 rounded bg-indigo-950/80 border border-indigo-700/50 text-indigo-300">
          {row.codigo_banda}
        </span>
      ),
      className: 'w-24 text-center',
    },
    {
      key: 'cargos_referencia',
      header: 'Cargos de Referencia',
      sortable: true,
      render: (row) => (
        <div className="text-xs font-medium text-slate-200 truncate max-w-[280px]" title={row.cargos_referencia}>
          {row.cargos_referencia}
        </div>
      ),
    },
    {
      key: 'salario_minimo_80',
      header: 'Min (80%)',
      sortable: true,
      render: (row) => (
        <span className="text-xs font-mono text-slate-400">
          ${Number(row.salario_minimo_80).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
      className: 'text-right',
    },
    {
      key: 'salario_medio_bajo_90',
      header: '90%',
      render: (row) => (
        <span className="text-xs font-mono text-slate-400">
          ${Number(row.salario_medio_bajo_90).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
      className: 'text-right hidden sm:table-cell',
    },
    {
      key: 'salario_mediana_100',
      header: 'Mediana (100%)',
      sortable: true,
      render: (row) => (
        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          ${Number(row.salario_mediana_100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
      className: 'text-right',
    },
    {
      key: 'salario_medio_alto_110',
      header: '110%',
      render: (row) => (
        <span className="text-xs font-mono text-slate-400">
          ${Number(row.salario_medio_alto_110).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
      className: 'text-right hidden sm:table-cell',
    },
    {
      key: 'salario_maximo_120',
      header: 'Max (120%)',
      sortable: true,
      render: (row) => (
        <span className="text-xs font-mono text-slate-400">
          ${Number(row.salario_maximo_120).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
      className: 'text-right',
    },
    {
      key: 'progresion',
      header: 'Progresión',
      render: (row) => {
        const prog = (Number(row.progresion) * 100).toFixed(1);
        return (
          <span className="text-xs font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded">
            +{prog}%
          </span>
        );
      },
      className: 'text-center hidden md:table-cell w-28',
    },
    {
      key: 'activo',
      header: 'Estado',
      sortable: true,
      render: (row) => <EstadoBooleanBadge activo={row.activo} />,
      className: 'w-24 text-center',
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => openCalculator(row)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            title="Evaluar Compa-Ratio"
          >
            <Calculator className="w-4 h-4" />
          </button>
          <button
            onClick={() => openEditModal(row)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Editar Banda"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => openDeleteDialog(row)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Eliminar Banda"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
      className: 'w-28 text-right',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-brand-400" />
            Tabulador Salarial & Bandas por Empresa
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Estructura de compensación salarial, progresión de niveles (80% a 120%) y evaluación de equidad interna.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => openCalculator()}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-semibold transition-colors"
          >
            <Calculator className="w-4 h-4 text-emerald-400" />
            <span>Simulador Compa-Ratio</span>
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-glow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Banda</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{tabuladores.length}</div>
            <div className="text-xs text-slate-400 font-medium">Bandas Salariales Registradas</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">40.0%</div>
            <div className="text-xs text-slate-400 font-medium">Amplitud Salarial Estandarizada (Min a Max)</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{empresas.length} Filiales</div>
            <div className="text-xs text-slate-400 font-medium">Estructuras Corporativas con Tabulador</div>
          </div>
        </div>
      </div>

      {/* Filter by Empresa Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800">
        <button
          onClick={() => setSelectedEmpresaFilter('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            selectedEmpresaFilter === 'all'
              ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Todas las Empresas ({tabuladores.length})
        </button>
        {empresas.map((emp) => {
          const count = tabuladores.filter(t => t.empresa_id === emp.empresa_id).length;
          return (
            <button
              key={emp.empresa_id}
              onClick={() => setSelectedEmpresaFilter(emp.empresa_id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedEmpresaFilter === emp.empresa_id
                  ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {emp.codigo} - {emp.nombre_corto || emp.razon_social} ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Table */}
      <DataTable
        data={filteredData}
        columns={columns}
        loading={loading}
        searchKeys={['codigo_banda', 'codigo_empresa', 'cargos_referencia']}
        searchPlaceholder="Buscar por código de banda, cargos de referencia o código de empresa..."
        emptyMessage="No se encontraron bandas salariales para los criterios seleccionados"
      />

      {/* Modal: Crear / Editar Banda */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Registrar Nueva Banda Salarial' : `Editar Banda: ${selectedBanda?.codigo_banda}`}
        subtitle="Define los parámetros de la banda salarial y sus niveles de compensación."
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Empresa Vinculada <span className="text-brand-400">*</span>
              </label>
              <select
                required
                value={empresaId}
                onChange={(e) => handleEmpresaChange(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
              >
                <option value="">Selecciona una empresa...</option>
                {empresas.map((emp) => (
                  <option key={emp.empresa_id} value={emp.empresa_id}>
                    {emp.codigo} - {emp.razon_social} ({emp.nombre_corto || 'Filial'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Código de Banda <span className="text-brand-400">*</span>
              </label>
              <input
                type="text"
                required
                value={codigoBanda}
                onChange={(e) => setCodigoBanda(e.target.value)}
                placeholder="PB7, LP4, VT2, PK1..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Cargos / Perfiles de Referencia <span className="text-brand-400">*</span>
            </label>
            <textarea
              rows={2}
              required
              value={cargosReferencia}
              onChange={(e) => setCargosReferencia(e.target.value)}
              placeholder="Directores / Especialistas / Coordinadores / Analistas..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Scale Calculation Section */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Escala Salarial y Factores de Banda
              </div>
              <button
                type="button"
                onClick={autoCalculateScale}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold transition-colors self-start sm:self-auto"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Calcular Escala desde Mediana</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Mínimo (80%)</label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={salarioMinimo80}
                  onChange={(e) => setSalarioMinimo80(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="80.00"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Medio-Bajo (90%)</label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={salarioMedioBajo90}
                  onChange={(e) => setSalarioMedioBajo90(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="90.00"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs text-emerald-400 font-semibold mb-1">
                  Mediana (100% Referencia) *
                </label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={salarioMediana100}
                  onChange={(e) => setSalarioMediana100(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="100.00"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-emerald-500/50 text-emerald-300 font-mono font-bold text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Medio-Alto (110%)</label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={salarioMedioAlto110}
                  onChange={(e) => setSalarioMedioAlto110(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="110.00"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Máximo (120%)</label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={salarioMaximo120}
                  onChange={(e) => setSalarioMaximo120(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="120.00"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Factor Progresión (0.2 = 20%)</label>
                <input
                  type="number"
                  step="0.000001"
                  value={progresion}
                  onChange={(e) => setProgresion(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0.20"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
            <span className="text-xs font-medium text-slate-300">
              {activo ? 'Banda Activa en Tabulador' : 'Banda Inactiva'}
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-sm font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-glow disabled:opacity-50 transition-all"
            >
              {saving ? 'Guardando...' : modalMode === 'create' ? 'Registrar Banda' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Simulador Compa-Ratio */}
      <Modal
        isOpen={isCalcModalOpen}
        onClose={() => setIsCalcModalOpen(false)}
        title="Simulador de Posición Salarial & Compa-Ratio"
        subtitle="Evalúa la ubicación de una remuneración respecto al punto medio (mediana) de su banda salarial."
        maxWidth="md"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Empresa</label>
              <select
                value={calcEmpresaCodigo}
                onChange={(e) => {
                  setCalcEmpresaCodigo(e.target.value);
                  const availableBandas = tabuladores.filter(t => t.codigo_empresa === e.target.value);
                  if (availableBandas.length > 0) setCalcBandaCodigo(availableBandas[0].codigo_banda);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-brand-500"
              >
                {empresas.map((emp) => (
                  <option key={emp.empresa_id} value={emp.codigo}>
                    {emp.codigo} - {emp.nombre_corto || emp.razon_social}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Banda Salarial</label>
              <select
                value={calcBandaCodigo}
                onChange={(e) => setCalcBandaCodigo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-brand-500"
              >
                {tabuladores
                  .filter(t => t.codigo_empresa === calcEmpresaCodigo)
                  .map((b) => (
                    <option key={b.tabulador_id} value={b.codigo_banda}>
                      {b.codigo_banda} - Mediana: ${Number(b.salario_mediana_100).toFixed(2)}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Salario o Remuneración a Evaluar ($)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                value={calcSalario}
                onChange={(e) => setCalcSalario(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Ej. 180.00"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-brand-500"
              />
              <button
                type="button"
                onClick={evaluateSalaryPosition}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shrink-0 transition-colors flex items-center gap-1.5"
              >
                <Calculator className="w-4 h-4" />
                <span>Evaluar</span>
              </button>
            </div>
          </div>

          {/* Evaluation Result Card */}
          {calcResult && (
            <div className="p-4 rounded-2xl bg-gradient-to-tr from-slate-950 to-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Compa-Ratio Resultante:</span>
                <span
                  className={`text-xl font-bold font-mono px-2.5 py-0.5 rounded-lg border ${
                    calcResult.compa_ratio >= 90 && calcResult.compa_ratio <= 110
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : calcResult.compa_ratio < 90
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                  }`}
                >
                  {calcResult.compa_ratio}%
                </span>
              </div>

              {/* Graphical Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                  <span>80% (Mín)</span>
                  <span>100% (Mediana)</span>
                  <span>120% (Máx)</span>
                </div>
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-emerald-500 to-indigo-500 transition-all duration-300"
                    style={{ width: `${Math.min(Math.max((calcResult.compa_ratio / 140) * 100, 5), 100)}%` }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="text-xs">
                  <div className="font-bold text-white">{calcResult.posicion_banda}</div>
                  <div className="text-slate-400 mt-0.5">
                    Salario evaluado: ${calcResult.salario_actual.toFixed(2)} | Mediana de referencia: ${calcResult.mediana.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setIsCalcModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Banda Salarial"
        message={`¿Estás seguro de que deseas eliminar la banda ${deletingBanda?.codigo_banda} de la empresa ${deletingBanda?.codigo_empresa}?`}
        confirmText="Eliminar Banda"
        cancelText="Cancelar"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};
