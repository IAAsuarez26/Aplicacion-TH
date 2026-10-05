import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  MoreVertical,
  Lock,
  Mail,
  Phone,
  Briefcase,
  CheckCircle2,
  XCircle,
  AlertCircle,
  KeyRound,
  Edit2,
  Eye,
  EyeOff,
  Sparkles,
  Info,
  Check,
  UserX,
  Trash2,
  Coins,
} from 'lucide-react';
import { usuariosApi, rolesApi } from '../../lib/insforge';
import type { Usuario, Rol, RolCodigo } from '../../lib/types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';

export const UsuariosModule: React.FC = () => {
  const { user: currentUser } = useAuth();
  const toast = useToast();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRolFilter, setSelectedRolFilter] = useState<string>('ALL');
  const [selectedEstadoFilter, setSelectedEstadoFilter] = useState<'ALL' | 'ACTIVOS' | 'INACTIVOS'>('ALL');

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditRoleModalOpen, setIsEditRoleModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [isRolesCatalogModalOpen, setIsRolesCatalogModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);

  // Formulario Crear Usuario
  const [createForm, setCreateForm] = useState({
    nombre: '',
    email: '',
    password: '',
    rol_codigo: 'ESPEC_RECLUTAMIENTO' as RolCodigo,
    telefono: '',
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Formulario Modificar Rol
  const [newRoleCodigo, setNewRoleCodigo] = useState<RolCodigo>('ESPEC_RECLUTAMIENTO');
  const [submittingEditRole, setSubmittingEditRole] = useState(false);

  // Formulario Restablecer Contraseña
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [submittingResetPassword, setSubmittingResetPassword] = useState(false);

  // Cargar datos
  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        usuariosApi.getAll(),
        rolesApi.getAll(),
      ]);

      if (usersRes.data) {
        setUsuarios(usersRes.data);
      }
      if (rolesRes.data) {
        setRoles(rolesRes.data);
      }
    } catch (err) {
      console.error('Error al cargar datos de usuarios y roles:', err);
      toast.error('No se pudo sincronizar la lista de usuarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Métricas
  const metrics = useMemo(() => {
    const total = usuarios.length;
    const activos = usuarios.filter((u) => u.activo).length;
    const inactivos = total - activos;
    const administradores = usuarios.filter(
      (u) => u.rol_codigo === 'ADMIN_PLATAFORMA' || u.rol_codigo === 'GERENTE_TH'
    ).length;

    return { total, activos, inactivos, administradores };
  }, [usuarios]);

  // Lista filtrada
  const filteredUsuarios = useMemo(() => {
    return usuarios.filter((u) => {
      const matchesSearch =
        u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.cargo && u.cargo.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchesRol = true;
      if (selectedRolFilter === 'ADMINS') {
        matchesRol = u.rol_codigo === 'ADMIN_PLATAFORMA' || u.rol_codigo === 'GERENTE_TH';
      } else if (selectedRolFilter !== 'ALL') {
        matchesRol = u.rol_codigo === selectedRolFilter;
      }

      const matchesEstado =
        selectedEstadoFilter === 'ALL' ||
        (selectedEstadoFilter === 'ACTIVOS' && u.activo) ||
        (selectedEstadoFilter === 'INACTIVOS' && !u.activo);

      return matchesSearch && matchesRol && matchesEstado;
    });
  }, [usuarios, searchTerm, selectedRolFilter, selectedEstadoFilter]);

  // Estados de interactividad de tarjetas
  const isTotalActive = selectedRolFilter === 'ALL' && selectedEstadoFilter === 'ALL' && !searchTerm;
  const isActivosActive = selectedEstadoFilter === 'ACTIVOS';
  const isAdminsActive = selectedRolFilter === 'ADMINS';
  const isSpecificRoleActive = selectedRolFilter !== 'ALL' && selectedRolFilter !== 'ADMINS';
  const hasActiveFilters = selectedRolFilter !== 'ALL' || selectedEstadoFilter !== 'ALL' || !!searchTerm;

  // Handle Crear Usuario
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.nombre.trim() || !createForm.email.trim() || !createForm.password.trim()) {
      toast.error('Por favor completa los campos obligatorios.');
      return;
    }

    if (createForm.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setSubmittingCreate(true);
    try {
      const selectedRoleObj = roles.find((r) => r.codigo === createForm.rol_codigo);
      const res = await usuariosApi.create({
        nombre: createForm.nombre.trim(),
        email: createForm.email.trim().toLowerCase(),
        password: createForm.password,
        rol_codigo: createForm.rol_codigo,
        telefono: createForm.telefono.trim() || undefined,
        cargo: selectedRoleObj?.nombre || undefined,
      });

      if (res.success) {
        toast.success(`¡Usuario ${createForm.nombre} incorporado exitosamente!`);
        setIsCreateModalOpen(false);
        setCreateForm({
          nombre: '',
          email: '',
          password: '',
          rol_codigo: 'ESPEC_RECLUTAMIENTO',
          telefono: '',
        });
        await loadData();
      } else {
        toast.error(res.error || 'No se pudo crear el usuario.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error inesperado al crear usuario.');
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Handle Modificar Rol
  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setSubmittingEditRole(true);
    try {
      const res = await usuariosApi.updateRole(selectedUser.auth_user_id, newRoleCodigo);
      if (res.success) {
        toast.success(`Rol de ${selectedUser.nombre} actualizado correctamente.`);
        setIsEditRoleModalOpen(false);
        setSelectedUser(null);
        await loadData();
      } else {
        toast.error(res.error || 'No se pudo actualizar el rol.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar el rol.');
    } finally {
      setSubmittingEditRole(false);
    }
  };

  // Handle Cambiar Estado (Activar / Suspender)
  const handleToggleStatus = async (userToToggle: Usuario) => {
    if (userToToggle.auth_user_id === currentUser?.id) {
      toast.error('No puedes suspender tu propia cuenta de usuario en sesión.');
      return;
    }

    const nuevoEstado = !userToToggle.activo;
    const accion = nuevoEstado ? 'activar' : 'suspender';

    if (!confirm(`¿Estás seguro de que deseas ${accion} el acceso de ${userToToggle.nombre}?`)) {
      return;
    }

    try {
      const res = await usuariosApi.updateStatus(userToToggle.auth_user_id, nuevoEstado);
      if (res.success) {
        toast.success(
          nuevoEstado
            ? `Acceso de ${userToToggle.nombre} reactivado.`
            : `Acceso de ${userToToggle.nombre} suspendido.`
        );
        await loadData();
      } else {
        toast.error(res.error || 'No se pudo actualizar el estado del usuario.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al cambiar estado.');
    }
  };

  // Handle Restablecer Contraseña
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setSubmittingResetPassword(true);
    try {
      const res = await usuariosApi.resetPassword(selectedUser.auth_user_id, newPassword);
      if (res.success) {
        toast.success(`Contraseña de ${selectedUser.nombre} restablecida con éxito.`);
        setIsResetPasswordModalOpen(false);
        setSelectedUser(null);
        setNewPassword('');
      } else {
        toast.error(res.error || 'No se pudo restablecer la contraseña.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al restablecer contraseña.');
    } finally {
      setSubmittingResetPassword(false);
    }
  };

  // Handle Eliminar Usuario
  const handleDeleteUser = async (userToDelete: Usuario) => {
    if (userToDelete.auth_user_id === currentUser?.id) {
      toast.error('No puedes eliminar tu propia cuenta de usuario en sesión.');
      return;
    }

    if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente al usuario ${userToDelete.nombre} (${userToDelete.email})? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const res = await usuariosApi.delete(userToDelete.auth_user_id);
      if (res.success) {
        toast.success(`Usuario ${userToDelete.nombre} eliminado exitosamente.`);
        await loadData();
      } else {
        toast.error(res.error || 'No se pudo eliminar el usuario.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar usuario.');
    }
  };

  // Helper para diseño de badge de rol
  const getRoleBadge = (rolCodigo: string, rolNombre?: string) => {
    switch (rolCodigo) {
      case 'ADMIN_PLATAFORMA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
            {rolNombre || 'Administrador de la plataforma'}
          </span>
        );
      case 'GERENTE_TH':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            {rolNombre || 'Gerente de TH'}
          </span>
        );
      case 'COORD_COMPENSACION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            {rolNombre || 'Coordinador de Compensación'}
          </span>
        );
      case 'COORD_RECLUTAMIENTO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            {rolNombre || 'Coordinador de Reclutamiento'}
          </span>
        );
      case 'ESPEC_COMPENSACION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-500/15 text-teal-300 border border-teal-500/30">
            <Coins className="w-3.5 h-3.5 text-teal-400" />
            {rolNombre || 'Especialista de compensación'}
          </span>
        );
      case 'ESPEC_RECLUTAMIENTO':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            {rolNombre || 'Especialista de reclutamiento'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Banner de Autorización */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/30 via-slate-900/40 to-blue-900/30 border border-purple-500/20 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Gestión Central de Usuarios, Roles y Seguridad
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                Privilegio de Dirección
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Facultad reservada exclusivamente para el Administrador de la plataforma y el Gerente de TH para incorporar colaboradores y definir niveles de autorización.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Incorporar Nuevo Usuario</span>
        </button>
      </div>

      {/* Tarjetas de Métricas Interactivas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Usuarios */}
        <button
          type="button"
          onClick={() => {
            setSelectedRolFilter('ALL');
            setSelectedEstadoFilter('ALL');
            setSearchTerm('');
          }}
          className={`p-4 rounded-2xl text-left backdrop-blur-md transition-all duration-200 group cursor-pointer focus:outline-none hover:-translate-y-0.5 hover:shadow-xl ${
            isTotalActive
              ? 'bg-slate-900/90 border-2 border-brand-500/80 ring-2 ring-brand-500/20 shadow-brand-500/10 shadow-lg'
              : 'bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80'
          }`}
          title="Clic para ver la lista completa de usuarios (restablecer filtros)"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider group-hover:text-slate-200 transition-colors">
              Total Usuarios
            </span>
            <div className={`p-2 rounded-xl transition-all ${
              isTotalActive ? 'bg-brand-500/30 text-brand-300' : 'bg-brand-500/10 text-brand-400 group-hover:scale-110'
            }`}>
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="text-2xl font-bold text-white">{metrics.total}</div>
            {hasActiveFilters ? (
              <span className="text-[10px] font-semibold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-500/20 animate-pulse">
                Restablecer
              </span>
            ) : (
              <span className="text-[10px] font-medium text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-full border border-slate-700/50">
                Todos
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Cuentas vinculadas a InsForge</p>
        </button>

        {/* 2. Usuarios Activos */}
        <button
          type="button"
          onClick={() => {
            setSelectedEstadoFilter(selectedEstadoFilter === 'ACTIVOS' ? 'ALL' : 'ACTIVOS');
          }}
          className={`p-4 rounded-2xl text-left backdrop-blur-md transition-all duration-200 group cursor-pointer focus:outline-none hover:-translate-y-0.5 hover:shadow-xl ${
            isActivosActive
              ? 'bg-emerald-950/40 border-2 border-emerald-500/80 ring-2 ring-emerald-500/30 shadow-emerald-500/10 shadow-lg'
              : 'bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/50 hover:bg-emerald-950/20'
          }`}
          title={isActivosActive ? 'Clic para quitar filtro de activos' : 'Clic para filtrar solo usuarios activos'}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Usuarios Activos
            </span>
            <div className={`p-2 rounded-xl transition-all ${
              isActivosActive ? 'bg-emerald-500/30 text-emerald-300' : 'bg-emerald-500/10 text-emerald-400 group-hover:scale-110'
            }`}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="text-2xl font-bold text-emerald-400">{metrics.activos}</div>
            {isActivosActive && (
              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/40">
                Filtrado
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Con acceso habilitado al portal</p>
        </button>

        {/* 3. Admin & Gerencia TH */}
        <button
          type="button"
          onClick={() => {
            setSelectedRolFilter(selectedRolFilter === 'ADMINS' ? 'ALL' : 'ADMINS');
          }}
          className={`p-4 rounded-2xl text-left backdrop-blur-md transition-all duration-200 group cursor-pointer focus:outline-none hover:-translate-y-0.5 hover:shadow-xl ${
            isAdminsActive
              ? 'bg-purple-950/40 border-2 border-purple-500/80 ring-2 ring-purple-500/30 shadow-purple-500/10 shadow-lg'
              : 'bg-slate-900/60 border border-slate-800/80 hover:border-purple-500/50 hover:bg-purple-950/20'
          }`}
          title={isAdminsActive ? 'Clic para quitar filtro de administradores' : 'Clic para filtrar Administradores y Gerente TH'}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
              Admin & Gerencia TH
            </span>
            <div className={`p-2 rounded-xl transition-all ${
              isAdminsActive ? 'bg-purple-500/30 text-purple-300' : 'bg-purple-500/10 text-purple-400 group-hover:scale-110'
            }`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="text-2xl font-bold text-purple-300">{metrics.administradores}</div>
            {isAdminsActive && (
              <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/40">
                Filtrado
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Facultados para gestionar accesos</p>
        </button>

        {/* 4. Roles Disponibles */}
        <button
          type="button"
          onClick={() => setIsRolesCatalogModalOpen(true)}
          className={`p-4 rounded-2xl text-left backdrop-blur-md transition-all duration-200 group cursor-pointer focus:outline-none hover:-translate-y-0.5 hover:shadow-xl ${
            isSpecificRoleActive
              ? 'bg-blue-950/40 border-2 border-blue-500/80 ring-2 ring-blue-500/30 shadow-blue-500/10 shadow-lg'
              : 'bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/50 hover:bg-blue-950/20'
          }`}
          title="Clic para explorar el catálogo de perfiles y facultades"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-blue-300 uppercase tracking-wider">
              Roles Disponibles
            </span>
            <div className={`p-2 rounded-xl transition-all ${
              isSpecificRoleActive ? 'bg-blue-500/30 text-blue-300' : 'bg-blue-500/10 text-blue-400 group-hover:scale-110'
            }`}>
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="text-2xl font-bold text-blue-400">
              {roles.length > 0 ? `${roles.length} Perfiles` : '6 Perfiles'}
            </div>
            {isSpecificRoleActive ? (
              <span className="text-[10px] font-bold text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-500/40 truncate max-w-[120px]">
                {roles.find((r) => r.codigo === selectedRolFilter)?.nombre || 'Filtrado'}
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-blue-300/80 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
                Ver catálogo
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Estructura de permisos segmentada</p>
        </button>
      </div>

      {/* Toolbar y Filtros */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Barra de búsqueda */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, correo o cargo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Filtros por Rol y Estado */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedRolFilter}
              onChange={(e) => setSelectedRolFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-500"
            >
              <option value="ALL">Todos los Roles</option>
              <option value="ADMINS">🛡️ Solo Admin & Gerencia TH</option>
              {roles.map((r) => (
                <option key={r.codigo} value={r.codigo}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </div>

          <select
            value={selectedEstadoFilter}
            onChange={(e) => setSelectedEstadoFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-500"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="ACTIVOS">Solo Activos</option>
            <option value="INACTIVOS">Solo Inactivos</option>
          </select>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            title="Recargar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Barra de Filtros Activos */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 px-1 text-xs">
          <span className="text-slate-400 font-medium text-[11px]">Filtros aplicados:</span>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-colors text-[11px]"
            >
              <span>Búsqueda: "{searchTerm}"</span>
              <XCircle className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
            </button>
          )}
          {selectedRolFilter === 'ADMINS' && (
            <button
              onClick={() => setSelectedRolFilter('ALL')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-950/60 text-purple-300 border border-purple-500/40 hover:bg-purple-900/60 transition-colors text-[11px]"
            >
              <span>Admin & Gerencia TH</span>
              <XCircle className="w-3.5 h-3.5 text-purple-400 hover:text-white" />
            </button>
          )}
          {isSpecificRoleActive && (
            <button
              onClick={() => setSelectedRolFilter('ALL')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-950/60 text-blue-300 border border-blue-500/40 hover:bg-blue-900/60 transition-colors text-[11px]"
            >
              <span>Rol: {roles.find((r) => r.codigo === selectedRolFilter)?.nombre || selectedRolFilter}</span>
              <XCircle className="w-3.5 h-3.5 text-blue-400 hover:text-white" />
            </button>
          )}
          {selectedEstadoFilter !== 'ALL' && (
            <button
              onClick={() => setSelectedEstadoFilter('ALL')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900/60 transition-colors text-[11px]"
            >
              <span>Estado: {selectedEstadoFilter === 'ACTIVOS' ? 'Activos' : 'Inactivos'}</span>
              <XCircle className="w-3.5 h-3.5 text-emerald-400 hover:text-white" />
            </button>
          )}
          <button
            onClick={() => {
              setSelectedRolFilter('ALL');
              setSelectedEstadoFilter('ALL');
              setSearchTerm('');
            }}
            className="text-[11px] text-brand-400 hover:text-brand-300 underline underline-offset-2 ml-1"
          >
            Limpiar todos
          </button>
        </div>
      )}

      {/* Tabla de Usuarios */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Colaborador / Usuario</th>
                <th className="px-5 py-3.5">Correo Institucional</th>
                <th className="px-5 py-3.5">Rol de Plataforma</th>
                <th className="px-5 py-3.5">Facultades de Gestión</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading && usuarios.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-brand-400" />
                      <span>Cargando usuarios y perfiles...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsuarios.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-600" />
                      <p className="font-semibold text-slate-300">No se encontraron usuarios</p>
                      <p className="text-[11px] text-slate-400">
                        {searchTerm || selectedRolFilter !== 'ALL'
                          ? 'Prueba modificando los criterios de búsqueda o filtros.'
                          : 'Aún no hay usuarios adicionales registrados.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsuarios.map((u) => {
                  const isCurrent = u.auth_user_id === currentUser?.id;
                  const isManager = u.rol_codigo === 'ADMIN_PLATAFORMA' || u.rol_codigo === 'GERENTE_TH';

                  return (
                    <tr
                      key={u.usuario_id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Usuario / Nombre & Cargo */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 p-0.5 text-xs font-bold text-white flex items-center justify-center shrink-0 shadow-sm">
                            <span className="bg-slate-900 w-full h-full rounded-[10px] flex items-center justify-center uppercase">
                              {u.nombre.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold text-white flex items-center gap-2">
                              <span>{u.nombre}</span>
                              {isCurrent && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                                  Tú
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <Briefcase className="w-3 h-3 text-slate-500" />
                              <span>{u.cargo || u.rol_nombre || 'Usuario del Sistema'}</span>
                              {u.telefono && (
                                <>
                                  <span className="text-slate-600">•</span>
                                  <Phone className="w-3 h-3 text-slate-500" />
                                  <span>{u.telefono}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-5 py-3.5 font-mono text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-500" />
                          <span>{u.email}</span>
                        </div>
                      </td>

                      {/* Rol */}
                      <td className="px-5 py-3.5">
                        {getRoleBadge(u.rol_codigo, u.rol_nombre)}
                      </td>

                      {/* Facultades */}
                      <td className="px-5 py-3.5">
                        {isManager ? (
                          <div className="inline-flex items-center gap-1.5 text-[11px] text-purple-300 font-medium bg-purple-950/40 px-2 py-1 rounded-md border border-purple-500/30">
                            <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                            <span>Crear usuarios y modificar roles</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                            <span>Operación y consulta de su área</span>
                          </div>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="px-5 py-3.5">
                        {u.activo ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            Suspendido
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Modificar Rol */}
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setNewRoleCodigo((u.rol_codigo as RolCodigo) || 'ESPEC_RECLUTAMIENTO');
                              setIsEditRoleModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-brand-300 border border-slate-800 transition-colors"
                            title="Modificar Rol"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Restablecer Contraseña */}
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setNewPassword('');
                              setIsResetPasswordModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-800 transition-colors"
                            title="Restablecer Contraseña"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Activar / Suspender */}
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={isCurrent}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isCurrent
                                ? 'bg-slate-950/40 text-slate-600 border-slate-800/40 cursor-not-allowed'
                                : u.activo
                                ? 'bg-slate-950 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border-slate-800 hover:border-rose-500/30'
                                : 'bg-slate-950 hover:bg-emerald-950/40 text-slate-400 hover:text-emerald-400 border-slate-800 hover:border-emerald-500/30'
                            }`}
                            title={
                              isCurrent
                                ? 'No puedes suspender tu propia cuenta'
                                : u.activo
                                ? 'Suspender Acceso'
                                : 'Reactivar Acceso'
                            }
                          >
                            {u.activo ? <UserX className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>

                          {/* Eliminar Usuario */}
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={isCurrent}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isCurrent
                                ? 'bg-slate-950/40 text-slate-600 border-slate-800/40 cursor-not-allowed'
                                : 'bg-slate-950 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border-slate-800 hover:border-rose-500/40'
                            }`}
                            title={
                              isCurrent
                                ? 'No puedes eliminar tu propia cuenta'
                                : 'Eliminar Usuario Permanentemente'
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: INCORPORAR NUEVO USUARIO */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Incorporar Nuevo Usuario</h3>
                  <p className="text-xs text-slate-400">
                    Crea una cuenta institucional y asigna el rol inicial del colaborador.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Nombre */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nombre Completo <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Carlos Mendoza"
                    value={createForm.nombre}
                    onChange={(e) => setCreateForm({ ...createForm, nombre: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                </div>

                {/* Correo */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Correo Institucional <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="usuario@empresa.com"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Contraseña inicial */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Contraseña Inicial <span className="text-rose-400">*</span> (Mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <input
                    type={showCreatePassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="w-full pl-3.5 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Perfil de Seguridad (Rol) & Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Perfil de Seguridad <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={createForm.rol_codigo}
                    onChange={(e) => setCreateForm({ ...createForm, rol_codigo: e.target.value as RolCodigo })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                  >
                    {roles.map((r) => (
                      <option key={r.codigo} value={r.codigo}>
                        {r.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Teléfono (Opcional)
                  </label>
                  <input
                    type="tel"
                    placeholder="+58 412 0000000"
                    value={createForm.telefono}
                    onChange={(e) => setCreateForm({ ...createForm, telefono: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Ficha explicativa del perfil de seguridad seleccionado */}
              {(() => {
                const selectedRole = roles.find((r) => r.codigo === createForm.rol_codigo);
                if (!selectedRole) return null;
                const canManage = selectedRole.codigo === 'ADMIN_PLATAFORMA' || selectedRole.codigo === 'GERENTE_TH';

                return (
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-200 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-brand-400" />
                        Privilegios de Acceso: {selectedRole.nombre}
                      </span>
                      {canManage ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          Usuarios & Tabulador
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                          Acceso Operativo TH
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {selectedRole.descripcion}
                    </p>
                  </div>
                );
              })()}

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5 text-[11px] text-slate-400">
                <Info className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                <span>
                  El usuario quedará activado automáticamente y podrá iniciar sesión en la plataforma con el correo y contraseña especificados.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-glow disabled:opacity-50 flex items-center gap-2"
                >
                  {submittingCreate ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="w-3.5 h-3.5" />
                  )}
                  <span>Crear Usuario</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ASIGNAR / MODIFICAR ROL */}
      {/* ========================================================================= */}
      {isEditRoleModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Modificar Rol de Usuario</h3>
                  <p className="text-xs text-slate-400">{selectedUser.nombre}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditRoleModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateRole} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Perfil de Seguridad <span className="text-purple-400">*</span>
                </label>
                <select
                  value={newRoleCodigo}
                  onChange={(e) => setNewRoleCodigo(e.target.value as RolCodigo)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  {roles.map((r) => (
                    <option key={r.codigo} value={r.codigo}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ficha explicativa del perfil de seguridad */}
              {(() => {
                const selectedRole = roles.find((r) => r.codigo === newRoleCodigo);
                if (!selectedRole) return null;
                const canManage = selectedRole.codigo === 'ADMIN_PLATAFORMA' || selectedRole.codigo === 'GERENTE_TH';

                return (
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-white flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-purple-400" />
                        Privilegios: {selectedRole.nombre}
                      </span>
                      {canManage ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          Usuarios & Tabulador
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                          Acceso Operativo TH
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {selectedRole.descripcion}
                    </p>
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditRoleModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingEditRole}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-glow-purple disabled:opacity-50 flex items-center gap-2"
                >
                  {submittingEditRole ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                  <span>Guardar Nuevo Rol</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: RESTABLECER CONTRASEÑA */}
      {/* ========================================================================= */}
      {isResetPasswordModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Restablecer Contraseña</h3>
                  <p className="text-xs text-slate-400">{selectedUser.nombre} ({selectedUser.email})</p>
                </div>
              </div>
              <button
                onClick={() => setIsResetPasswordModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nueva Contraseña Temporal (Mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  La contraseña será actualizada inmediatamente en la base de datos de autenticación. Comunica la nueva clave al colaborador de forma segura.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingResetPassword || newPassword.length < 6}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-glow disabled:opacity-50 flex items-center gap-2"
                >
                  {submittingResetPassword ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <KeyRound className="w-3.5 h-3.5" />
                  )}
                  <span>Actualizar Contraseña</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* MODAL 4: CATÁLOGO DE PERFILES Y FACULTADES DE SEGURIDAD */}
      {/* ========================================================================= */}
      {isRolesCatalogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Catálogo de Perfiles y Facultades</h3>
                  <p className="text-xs text-slate-400">
                    Estructura de roles y niveles de acceso a la plataforma de Talento Humano
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRolesCatalogModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Banner explicativo de segregación */}
            <div className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-500/30 flex items-start gap-3 text-xs text-purple-200">
              <ShieldAlert className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-purple-100">
                  Segregación de Funciones y Control de Accesos
                </p>
                <p className="text-[11px] text-purple-300/80 leading-relaxed">
                  Solo los roles con <span className="font-bold text-purple-200">Privilegio de Dirección</span> (Administrador de Plataforma y Gerente de TH) pueden crear usuarios, reasignar roles y visualizar o modificar el Tabulador Salarial institucional. Los demás perfiles cuentan con acceso operativo específico a sus áreas.
                </p>
              </div>
            </div>

            {/* Lista de Perfiles */}
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {roles.map((r) => {
                const canManage = r.codigo === 'ADMIN_PLATAFORMA' || r.codigo === 'GERENTE_TH';
                const userCount = usuarios.filter((u) => u.rol_codigo === r.codigo).length;
                const isCurrentFilter = selectedRolFilter === r.codigo;

                return (
                  <div
                    key={r.codigo}
                    className={`p-4 rounded-2xl border transition-all ${
                      isCurrentFilter
                        ? 'bg-blue-950/40 border-blue-500 ring-1 ring-blue-500/50 shadow-md'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white">{r.nombre}</span>
                        {canManage ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                            Usuarios & Tabulador
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                            Acceso Operativo TH
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                          {userCount} {userCount === 1 ? 'usuario' : 'usuarios'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRolFilter(isCurrentFilter ? 'ALL' : r.codigo);
                            setIsRolesCatalogModalOpen(false);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                            isCurrentFilter
                              ? 'bg-blue-600 text-white shadow-glow'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                          }`}
                        >
                          {isCurrentFilter ? '✓ Filtro Activo' : 'Filtrar Usuarios'}
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {r.descripcion}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRolFilter('ALL');
                    setSelectedEstadoFilter('ALL');
                    setSearchTerm('');
                    setIsRolesCatalogModalOpen(false);
                  }}
                  className="text-xs text-brand-400 hover:text-brand-300 underline"
                >
                  Restablecer todos los filtros
                </button>
              ) : <div />}
              <button
                type="button"
                onClick={() => setIsRolesCatalogModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsuariosModule;
