import React, { createContext, useContext, useEffect, useState } from 'react';
import { insforge, usuariosApi } from '../lib/insforge';
import type { UserProfile, RolCodigo } from '../lib/types';

export const DEMO_PROFILES: Record<RolCodigo, UserProfile> = {
  ADMIN_PLATAFORMA: {
    id: 'usr_demo_admin_plataforma',
    email: 'admin.plataforma@empresa.com',
    name: 'Ing. Carlos Mendoza',
    role: 'Administrador de la plataforma',
    rol_codigo: 'ADMIN_PLATAFORMA',
    permite_gestion_usuarios: true,
    cargo: 'Administrador Principal de Sistemas',
    emailVerified: true,
  },
  GERENTE_TH: {
    id: 'usr_demo_gerente_th',
    email: 'gerente.th@empresa.com',
    name: 'Dra. Elena Ramos',
    role: 'Gerente de TH',
    rol_codigo: 'GERENTE_TH',
    permite_gestion_usuarios: true,
    cargo: 'Gerente Corporativo de Talento Humano',
    emailVerified: true,
  },
  COORD_COMPENSACION: {
    id: 'usr_demo_coord_comp',
    email: 'coord.compensacion@empresa.com',
    name: 'Lic. Roberto Gómez',
    role: 'Coordinador de Compensación',
    rol_codigo: 'COORD_COMPENSACION',
    permite_gestion_usuarios: false,
    cargo: 'Coordinador de Compensación y Beneficios',
    emailVerified: true,
  },
  COORD_RECLUTAMIENTO: {
    id: 'usr_demo_coord_rec',
    email: 'coord.reclutamiento@empresa.com',
    name: 'Lic. Mariana Silva',
    role: 'Coordinador de Reclutamiento',
    rol_codigo: 'COORD_RECLUTAMIENTO',
    permite_gestion_usuarios: false,
    cargo: 'Coordinador de Selección y Adquisición de Talento',
    emailVerified: true,
  },
  ESPEC_RECLUTAMIENTO: {
    id: 'usr_demo_espec_rec',
    email: 'espec.reclutamiento@empresa.com',
    name: 'Lic. Alejandro Castillo',
    role: 'Especialista de reclutamiento',
    rol_codigo: 'ESPEC_RECLUTAMIENTO',
    permite_gestion_usuarios: false,
    cargo: 'Especialista de Atracción de Talento',
    emailVerified: true,
  },
};

/**
 * Función de autorización para validar acceso a módulos/pestañas
 */
export const checkTabPermission = (tab: string, rolCodigo?: string | null): boolean => {
  if (!rolCodigo) return false;

  // 1. Administrador de la plataforma y Gerente de TH tienen acceso a TODO (incluyendo usuarios)
  if (rolCodigo === 'ADMIN_PLATAFORMA' || rolCodigo === 'GERENTE_TH') {
    return true;
  }

  // 2. Tab de usuarios restringido EXCLUSIVAMENTE para Admin y Gerente TH
  if (tab === 'usuarios') {
    return false;
  }

  // 3. Pestañas universales para personal autorizado de TH
  if (['dashboard', 'cargos', 'denominaciones_cargos', 'empleados', 'organigrama'].includes(tab)) {
    return true;
  }

  // 4. Coordinador de Compensación: Finanzas, tabuladores, costos y estructura
  if (rolCodigo === 'COORD_COMPENSACION') {
    return [
      'empresas',
      'tabulador',
      'tipo_costos',
      'centros_costos',
      'direcciones',
      'gerencias',
      'departamentos',
      'responsables',
    ].includes(tab);
  }

  // 5. Coordinador de Reclutamiento: Reclutamiento, perfiles PC, estructura organizativa y traslados
  if (rolCodigo === 'COORD_RECLUTAMIENTO') {
    return [
      'perfiles_competencias',
      'historial',
      'direcciones',
      'gerencias',
      'departamentos',
      'responsables',
    ].includes(tab);
  }

  // 6. Especialista de reclutamiento: Ficha y perfiles de competencias
  if (rolCodigo === 'ESPEC_RECLUTAMIENTO') {
    return ['perfiles_competencias'].includes(tab);
  }

  return false;
};

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  canManageUsers: boolean;
  canAccessTab: (tab: string) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ data?: any; error?: any; requireVerification?: boolean }>;
  verifyEmailOtp: (email: string, otp: string) => Promise<{ data?: any; error?: any }>;
  resendVerificationCode: (email: string) => Promise<{ success?: boolean; error?: any }>;
  sendPasswordReset: (email: string) => Promise<{ success?: boolean; error?: any }>;
  resetPasswordWithToken: (token: string, newPassword: string) => Promise<{ success?: boolean; error?: any }>;
  signInWithProvider: (provider: 'google' | 'github') => Promise<void>;
  signOut: () => Promise<void>;
  loginAsDemoAdmin: (roleKey?: RolCodigo) => void;
  switchDemoRole: (roleKey: RolCodigo) => void;
  updateProfileName: (name: string) => Promise<{ success: boolean; error?: any }>;
  refreshUserRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper para consultar perfil extendido y rol en public.usuarios
  const enrichUserProfile = async (authUser: any): Promise<UserProfile> => {
    try {
      const { data: dbUser } = await usuariosApi.getByAuthId(authUser.id);
      if (dbUser) {
        return {
          id: authUser.id,
          email: authUser.email,
          name: dbUser.nombre || authUser.name || authUser.profile?.name || authUser.email.split('@')[0],
          avatar_url: authUser.avatar_url || authUser.profile?.avatar_url,
          role: dbUser.rol_nombre || 'Administrador de la plataforma',
          rol_codigo: dbUser.rol_codigo,
          permite_gestion_usuarios: dbUser.permite_gestion_usuarios ?? (dbUser.rol_codigo === 'ADMIN_PLATAFORMA' || dbUser.rol_codigo === 'GERENTE_TH'),
          cargo: dbUser.cargo || undefined,
          telefono: dbUser.telefono || undefined,
          emailVerified: authUser.emailVerified ?? true,
        };
      }
    } catch (err) {
      console.warn('Could not load user profile from DB, falling back to auth metadata:', err);
    }

    // Fallback: Si no está en public.usuarios todavía
    const isMasterAdmin =
      authUser.email?.toLowerCase().includes('asuarez') ||
      authUser.is_project_admin;
    const defaultRolCodigo: RolCodigo = isMasterAdmin
      ? 'ADMIN_PLATAFORMA'
      : ((authUser.profile?.rol_codigo as RolCodigo) || 'ESPEC_RECLUTAMIENTO');
    const defaultRolNombre = isMasterAdmin
      ? 'Administrador de la plataforma'
      : (authUser.profile?.role || 'Especialista de reclutamiento');

    return {
      id: authUser.id,
      email: authUser.email,
      name: authUser.name || authUser.profile?.name || authUser.email.split('@')[0],
      avatar_url: authUser.avatar_url || authUser.profile?.avatar_url,
      role: defaultRolNombre,
      rol_codigo: defaultRolCodigo,
      permite_gestion_usuarios: defaultRolCodigo === 'ADMIN_PLATAFORMA' || defaultRolCodigo === 'GERENTE_TH',
      cargo: authUser.profile?.cargo || undefined,
      emailVerified: authUser.emailVerified ?? true,
    };
  };

  // Inicializar y chequear sesión activa al cargar
  useEffect(() => {
    let cancelled = false;

    async function hydrateAuth() {
      try {
        const { data, error } = await insforge.auth.getCurrentUser();
        if (cancelled) return;

        if (data?.user && !error) {
          const profile = await enrichUserProfile(data.user);
          if (!cancelled) {
            setUser(profile);
          }
        } else {
          // Chequear si hay demo user guardado en localStorage
          const savedDemo = localStorage.getItem('th_demo_user');
          if (savedDemo) {
            setUser(JSON.parse(savedDemo));
          } else {
            setUser(null);
          }
        }
      } catch (err) {
        console.warn('Could not rehydrate auth session:', err);
        const savedDemo = localStorage.getItem('th_demo_user');
        if (savedDemo) {
          setUser(JSON.parse(savedDemo));
        } else {
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    hydrateAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  // Refrescar el rol del usuario en caliente
  const refreshUserRole = async () => {
    if (!user) return;
    if (user.id.startsWith('usr_demo')) return;

    try {
      const { data } = await insforge.auth.getCurrentUser();
      if (data?.user) {
        const refreshed = await enrichUserProfile(data.user);
        setUser(refreshed);
      }
    } catch (err) {
      console.warn('Error refreshing user role:', err);
    }
  };

  // 1. Iniciar sesión con email y contraseña
  const signIn = async (email: string, password: string) => {
    try {
      localStorage.removeItem('th_demo_user');
      const { data, error } = await insforge.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { error };
      }

      if (data?.user) {
        const profile = await enrichUserProfile(data.user);
        setUser(profile);
      }

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  // 2. Registro de nuevo usuario
  const signUp = async (email: string, password: string, name?: string) => {
    try {
      localStorage.removeItem('th_demo_user');
      const { data, error } = await insforge.auth.signUp({
        email: email.trim(),
        password,
        name: name?.trim(),
      });

      if (error) {
        return { error };
      }

      if (data?.requireEmailVerification) {
        return { data, requireVerification: true };
      }

      if (data?.accessToken && data?.user) {
        const profile = await enrichUserProfile(data.user);
        setUser(profile);
      }

      return { data, requireVerification: false };
    } catch (err: any) {
      return { error: err };
    }
  };

  // 3. Verificación de correo con OTP de 6 dígitos
  const verifyEmailOtp = async (email: string, otp: string) => {
    try {
      const { data, error } = await insforge.auth.verifyEmail({
        email: email.trim(),
        otp: otp.trim(),
      });

      if (error) {
        return { error };
      }

      if (data?.user) {
        const profile = await enrichUserProfile(data.user);
        setUser(profile);
      }

      return { data, error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  // 4. Reenviar correo de verificación
  const resendVerificationCode = async (email: string) => {
    try {
      const { data, error } = await insforge.auth.resendVerificationEmail({
        email: email.trim(),
      });
      return { success: !error, error };
    } catch (err: any) {
      return { success: false, error: err };
    }
  };

  // 5. Enviar correo de restablecimiento de contraseña
  const sendPasswordReset = async (email: string) => {
    try {
      const { data, error } = await insforge.auth.sendResetPasswordEmail({
        email: email.trim(),
      });
      return { success: !error, error };
    } catch (err: any) {
      return { success: false, error: err };
    }
  };

  // 6. Restablecer contraseña con código / token
  const resetPasswordWithToken = async (otpOrToken: string, newPassword: string) => {
    try {
      const { data, error } = await insforge.auth.resetPassword({
        otp: otpOrToken.trim(),
        newPassword,
      });
      return { success: !error, error };
    } catch (err: any) {
      return { success: false, error: err };
    }
  };

  // 7. Iniciar sesión con Proveedor OAuth (Google / GitHub)
  const signInWithProvider = async (provider: 'google' | 'github') => {
    try {
      await insforge.auth.signInWithOAuth(provider, {
        redirectTo: window.location.origin,
      });
    } catch (err) {
      console.error(`OAuth login error (${provider}):`, err);
    }
  };

  // 8. Cerrar sesión
  const signOut = async () => {
    try {
      localStorage.removeItem('th_demo_user');
      await insforge.auth.signOut();
    } catch (err) {
      console.warn('SignOut error:', err);
    } finally {
      setUser(null);
    }
  };

  // 9. Acceso directo como Demo (con roles configurables para pruebas)
  const loginAsDemoAdmin = (roleKey: RolCodigo = 'ADMIN_PLATAFORMA') => {
    const selectedDemo = DEMO_PROFILES[roleKey] || DEMO_PROFILES.ADMIN_PLATAFORMA;
    localStorage.setItem('th_demo_user', JSON.stringify(selectedDemo));
    setUser(selectedDemo);
  };

  // 10. Cambiar rol en caliente cuando se está en modo Demo
  const switchDemoRole = (roleKey: RolCodigo) => {
    if (!DEMO_PROFILES[roleKey]) return;
    const selectedDemo = DEMO_PROFILES[roleKey];
    localStorage.setItem('th_demo_user', JSON.stringify(selectedDemo));
    setUser(selectedDemo);
  };

  // 11. Actualizar nombre de perfil
  const updateProfileName = async (name: string) => {
    try {
      if (user?.id.startsWith('usr_demo')) {
        const updated = { ...user, name };
        setUser(updated);
        localStorage.setItem('th_demo_user', JSON.stringify(updated));
        return { success: true };
      }

      const { data, error } = await insforge.auth.setProfile({ name });
      if (error) return { success: false, error };

      if (user) {
        setUser({ ...user, name });
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err };
    }
  };

  // Determinación de privilegios
  const canManageUsers = Boolean(
    user?.permite_gestion_usuarios ||
    user?.rol_codigo === 'ADMIN_PLATAFORMA' ||
    user?.rol_codigo === 'GERENTE_TH'
  );

  const canAccessTab = (tab: string): boolean => {
    return checkTabPermission(tab, user?.rol_codigo);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        canManageUsers,
        canAccessTab,
        signIn,
        signUp,
        verifyEmailOtp,
        resendVerificationCode,
        sendPasswordReset,
        resetPasswordWithToken,
        signInWithProvider,
        signOut,
        loginAsDemoAdmin,
        switchDemoRole,
        updateProfileName,
        refreshUserRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

