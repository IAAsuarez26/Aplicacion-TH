import React, { useState, useEffect } from 'react';
import {
  Building,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  FileText,
  UserCheck,
  CheckCircle2,
  XCircle,
  Building2,
  Globe,
  Calendar,
} from 'lucide-react';
import { empresasApi, direccionesApi, tabuladorApi } from '../../lib/insforge';
import type { Empresa, Direccion, TabuladorEmpresa } from '../../lib/types';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EstadoBooleanBadge } from '../common/Badge';
import { useToast } from '../common/Toast';

export const EmpresasModule: React.FC = () => {
  const toast = useToast();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [tabuladores, setTabuladores] = useState<TabuladorEmpresa[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState<'general' | 'ubicacion' | 'legal'>('general');

  // Form State
  const [codigo, setCodigo] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [nombreCorto, setNombreCorto] = useState('');
  const [rif, setRif] = useState('');
  const [direccion, setDireccion] = useState('');
  const [estadoRegion, setEstadoRegion] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [zonaPostal, setZonaPostal] = useState('');
  const [fechaRegistro, setFechaRegistro] = useState('');
  const [fechaFundacion, setFechaFundacion] = useState('');
  const [repLegalCi, setRepLegalCi] = useState('');
  const [repLegalNombre, setRepLegalNombre] = useState('');
  const [repLegalNacionalidad, setRepLegalNacionalidad] = useState('');
  const [repLegalCargo, setRepLegalCargo] = useState('');
  const [activo, setActivo] = useState(true);

  // Delete Dialog State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingEmpresa, setDeletingEmpresa] = useState<Empresa | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: empData, error: empErr }, { data: dirData }, { data: tabData }] =
        await Promise.all([
          empresasApi.getAll(),
          direccionesApi.getAll(),
          tabuladorApi.getAll(),
        ]);

      if (empErr) toast.error('No se pudieron cargar las empresas');
      setEmpresas(empData || []);
      setDirecciones(dirData || []);
      setTabuladores(tabData || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedEmpresa(null);
    setActiveFormTab('general');
    
    const nextNum = (empresas.length + 2).toString().padStart(4, '0');
    setCodigo(nextNum);
    setRazonSocial('');
    setNombreCorto('');
    setRif('');
    setDireccion('');
    setEstadoRegion('');
    setLocalidad('');
    setMunicipio('');
    setCiudad('');
    setZonaPostal('');
    setFechaRegistro(new Date().toISOString().slice(0, 10));
    setFechaFundacion('');
    setRepLegalCi('');
    setRepLegalNombre('');
    setRepLegalNacionalidad('Venezolana');
    setRepLegalCargo('Representante Legal');
    setActivo(true);
    setIsModalOpen(true);
  };

  const openEditModal = (emp: Empresa) => {
    setModalMode('edit');
    setSelectedEmpresa(emp);
    setActiveFormTab('general');
    setCodigo(emp.codigo);
    setRazonSocial(emp.razon_social);
    setNombreCorto(emp.nombre_corto || '');
    setRif(emp.rif || '');
    setDireccion(emp.direccion || '');
    setEstadoRegion(emp.estado_region || '');
    setLocalidad(emp.localidad || '');
    setMunicipio(emp.municipio || '');
    setCiudad(emp.ciudad || '');
    setZonaPostal(emp.zona_postal || '');
    setFechaRegistro(emp.fecha_registro ? emp.fecha_registro.slice(0, 10) : '');
    setFechaFundacion(emp.fecha_fundacion ? emp.fecha_fundacion.slice(0, 10) : '');
    setRepLegalCi(emp.rep_legal_ci || '');
    setRepLegalNombre(emp.rep_legal_nombre || '');
    setRepLegalNacionalidad(emp.rep_legal_nacionalidad || '');
    setRepLegalCargo(emp.rep_legal_cargo || '');
    setActivo(emp.activo);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim() || !razonSocial.trim()) {
      toast.error('El código y la razón social son campos obligatorios');
      return;
    }

    setSaving(true);
    try {
      if (modalMode === 'create') {
        const { data, error } = await empresasApi.create({
          codigo: codigo.trim(),
          razon_social: razonSocial.trim(),
          nombre_corto: nombreCorto.trim() || null,
          rif: rif.trim() || null,
          direccion: direccion.trim() || null,
          estado_region: estadoRegion.trim() || null,
          localidad: localidad.trim() || null,
          municipio: municipio.trim() || null,
          ciudad: ciudad.trim() || null,
          zona_postal: zonaPostal.trim() || null,
          fecha_registro: fechaRegistro || null,
          fecha_fundacion: fechaFundacion || null,
          rep_legal_ci: repLegalCi.trim() || null,
          rep_legal_nombre: repLegalNombre.trim() || null,
          rep_legal_nacionalidad: repLegalNacionalidad.trim() || null,
          rep_legal_cargo: repLegalCargo.trim() || null,
          activo,
        });

        if (error) {
          toast.error(error.message || 'Error al registrar la empresa');
        } else {
          toast.success('Empresa registrada exitosamente');
          setIsModalOpen(false);
          loadData();
        }
      } else if (selectedEmpresa) {
        const { data, error } = await empresasApi.update(selectedEmpresa.empresa_id, {
          codigo: codigo.trim(),
          razon_social: razonSocial.trim(),
          nombre_corto: nombreCorto.trim() || null,
          rif: rif.trim() || null,
          direccion: direccion.trim() || null,
          estado_region: estadoRegion.trim() || null,
          localidad: localidad.trim() || null,
          municipio: municipio.trim() || null,
          ciudad: ciudad.trim() || null,
          zona_postal: zonaPostal.trim() || null,
          fecha_registro: fechaRegistro || null,
          fecha_fundacion: fechaFundacion || null,
          rep_legal_ci: repLegalCi.trim() || null,
          rep_legal_nombre: repLegalNombre.trim() || null,
          rep_legal_nacionalidad: repLegalNacionalidad.trim() || null,
          rep_legal_cargo: repLegalCargo.trim() || null,
          activo,
        });

        if (error) {
          toast.error(error.message || 'Error al actualizar la empresa');
        } else {
          toast.success('Empresa actualizada correctamente');
          setIsModalOpen(false);
          loadData();
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (emp: Empresa) => {
    setDeletingEmpresa(emp);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingEmpresa) return;
    setDeleting(true);
    try {
      const { success, error } = await empresasApi.delete(deletingEmpresa.empresa_id);
      if (success) {
        toast.success(`Empresa ${deletingEmpresa.razon_social} eliminada`);
        setIsDeleteDialogOpen(false);
        setDeletingEmpresa(null);
        loadData();
      } else {
        toast.error(
          error?.message?.includes('foreign key') || error?.message?.includes('violates')
            ? 'No se puede eliminar la empresa porque tiene direcciones o bandas salariales asignadas.'
            : error?.message || 'Error al eliminar la empresa'
        );
      }
    } finally {
      setDeleting(false);
    }
  };

  const totalActivas = empresas.filter(e => e.activo).length;

  const columns: Column<Empresa>[] = [
    {
      key: 'codigo',
      header: 'Código',
      sortable: true,
      render: (row) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-brand-500/10 text-brand-400 border border-brand-500/20">
          {row.codigo}
        </span>
      ),
      className: 'w-24',
    },
    {
      key: 'razon_social',
      header: 'Empresa / Razón Social',
      sortable: true,
      render: (row) => (
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
            <Building className="w-4 h-4 text-brand-400" />
          </div>
          <div>
            <div className="font-semibold text-white text-sm">{row.razon_social}</div>
            <div className="text-xs text-slate-400 font-medium flex items-center gap-2 mt-0.5">
              {row.nombre_corto && <span>{row.nombre_corto}</span>}
              {row.rif && (
                <span className="font-mono text-[11px] bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-300">
                  RIF: {row.rif}
                </span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'ciudad',
      header: 'Ubicación',
      sortable: true,
      render: (row) => (
        <div className="text-xs text-slate-300">
          <div className="flex items-center gap-1.5 text-slate-200 font-medium">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{row.ciudad || row.estado_region || 'No especificada'}</span>
          </div>
          {row.direccion && (
            <div className="text-slate-400 truncate max-w-[200px] mt-0.5" title={row.direccion}>
              {row.direccion}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'rep_legal_nombre',
      header: 'Representante Legal',
      sortable: true,
      render: (row) => (
        <div className="text-xs">
          {row.rep_legal_nombre ? (
            <div>
              <div className="font-medium text-slate-200 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                <span>{row.rep_legal_nombre}</span>
              </div>
              <div className="text-slate-400 mt-0.5">
                {row.rep_legal_cargo || 'Representante Legal'} {row.rep_legal_ci && `(${row.rep_legal_ci})`}
              </div>
            </div>
          ) : (
            <span className="text-slate-500 italic">Sin asignar</span>
          )}
        </div>
      ),
    },
    {
      key: 'estructura',
      header: 'Estructura',
      render: (row) => {
        const numDirs = direcciones.filter(d => d.empresa_id === row.empresa_id).length;
        const numBandas = tabuladores.filter(t => t.empresa_id === row.empresa_id).length;
        return (
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700" title="Direcciones vinculadas">
              {numDirs} Dirs
            </span>
            <span className="px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/40" title="Bandas salariales">
              {numBandas} Bandas
            </span>
          </div>
        );
      },
    },
    {
      key: 'activo',
      header: 'Estado',
      sortable: true,
      render: (row) => <EstadoBooleanBadge activo={row.activo} />,
      className: 'w-28 text-center',
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => openEditModal(row)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Editar Empresa"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => openDeleteDialog(row)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Eliminar Empresa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
      className: 'w-24 text-right',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Building className="w-6 h-6 text-brand-400" />
            Catálogo de Empresas y Filiales
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Gestión de las entidades legales, filiales y compañías matrices del grupo organizacional.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-glow hover:shadow-glow-lg transition-all duration-200 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Empresa</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{empresas.length}</div>
            <div className="text-xs text-slate-400 font-medium">Total Empresas Registradas</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{totalActivas}</div>
            <div className="text-xs text-slate-400 font-medium">Empresas Operativas (Activas)</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{direcciones.length}</div>
            <div className="text-xs text-slate-400 font-medium">Direcciones Distribuidas</div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <DataTable
        data={empresas}
        columns={columns}
        loading={loading}
        searchKeys={['codigo', 'razon_social', 'nombre_corto', 'rif', 'ciudad', 'rep_legal_nombre']}
        searchPlaceholder="Buscar por código, razón social, RIF, ciudad..."
        emptyMessage="No se encontraron empresas registradas"
      />

      {/* Modal: Crear / Editar Empresa */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Registrar Nueva Empresa' : `Editar Empresa: ${selectedEmpresa?.codigo}`}
        subtitle="Completa la información corporativa, fiscal y de ubicación de la entidad."
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-6">
          {/* Sub-tabs inside modal */}
          <div className="flex border-b border-slate-800 gap-2">
            <button
              type="button"
              onClick={() => setActiveFormTab('general')}
              className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
                activeFormTab === 'general'
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              1. Identificación
            </button>
            <button
              type="button"
              onClick={() => setActiveFormTab('ubicacion')}
              className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
                activeFormTab === 'ubicacion'
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              2. Ubicación Fiscal
            </button>
            <button
              type="button"
              onClick={() => setActiveFormTab('legal')}
              className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
                activeFormTab === 'legal'
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              3. Representación Legal & Fechas
            </button>
          </div>

          {/* TAB 1: GENERAL */}
          {activeFormTab === 'general' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Código de Empresa <span className="text-brand-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    placeholder="0002"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-brand-500 transition-colors"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">Ej. 0002, 0003, 0004</span>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Razón Social <span className="text-brand-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={razonSocial}
                    onChange={(e) => setRazonSocial(e.target.value)}
                    placeholder="EMPRESA MATRIZ C.A."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nombre Comercial / Corto
                  </label>
                  <input
                    type="text"
                    value={nombreCorto}
                    onChange={(e) => setNombreCorto(e.target.value)}
                    placeholder="Planta Principal"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Número de RIF / ID Fiscal
                  </label>
                  <input
                    type="text"
                    value={rif}
                    onChange={(e) => setRif(e.target.value)}
                    placeholder="J-12345678-9"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
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
                  {activo ? 'Empresa Activa en Operaciones' : 'Empresa Inactiva'}
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: UBICACION */}
          {activeFormTab === 'ubicacion' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Dirección Fiscal Completa
                </label>
                <textarea
                  rows={2}
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Av. Principal, Edificio Corporativo, Piso 5..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Ciudad</label>
                  <input
                    type="text"
                    value={ciudad}
                    onChange={(e) => setCiudad(e.target.value)}
                    placeholder="Caracas"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Estado / Región</label>
                  <input
                    type="text"
                    value={estadoRegion}
                    onChange={(e) => setEstadoRegion(e.target.value)}
                    placeholder="Miranda / Dtto. Capital"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Zona Postal</label>
                  <input
                    type="text"
                    value={zonaPostal}
                    onChange={(e) => setZonaPostal(e.target.value)}
                    placeholder="1070"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Municipio</label>
                  <input
                    type="text"
                    value={municipio}
                    onChange={(e) => setMunicipio(e.target.value)}
                    placeholder="Sucre / Chacao"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Localidad / Sector</label>
                  <input
                    type="text"
                    value={localidad}
                    onChange={(e) => setLocalidad(e.target.value)}
                    placeholder="Los Ruices"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LEGAL & FECHAS */}
          {activeFormTab === 'legal' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Fecha de Registro Mercantil
                  </label>
                  <input
                    type="date"
                    value={fechaRegistro}
                    onChange={(e) => setFechaRegistro(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Fecha de Fundación / Inicio
                  </label>
                  <input
                    type="date"
                    value={fechaFundacion}
                    onChange={(e) => setFechaFundacion(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-brand-400" />
                  Datos del Representante Legal
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Nombre Completo</label>
                    <input
                      type="text"
                      value={repLegalNombre}
                      onChange={(e) => setRepLegalNombre(e.target.value)}
                      placeholder="Juan Alberto Pérez"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Cédula / Documento</label>
                    <input
                      type="text"
                      value={repLegalCi}
                      onChange={(e) => setRepLegalCi(e.target.value)}
                      placeholder="V-12345678"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Nacionalidad</label>
                    <input
                      type="text"
                      value={repLegalNacionalidad}
                      onChange={(e) => setRepLegalNacionalidad(e.target.value)}
                      placeholder="Venezolana"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Cargo que Ostenta</label>
                    <input
                      type="text"
                      value={repLegalCargo}
                      onChange={(e) => setRepLegalCargo(e.target.value)}
                      placeholder="Director General / Apoderado"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
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
              {saving ? 'Guardando...' : modalMode === 'create' ? 'Registrar Empresa' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Empresa"
        message={`¿Estás seguro de que deseas eliminar la empresa "${deletingEmpresa?.razon_social}" (${deletingEmpresa?.codigo})? Esta acción no se puede deshacer y fallará si existen direcciones adscritas a ella.`}
        confirmText="Eliminar Empresa"
        cancelText="Cancelar"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};
