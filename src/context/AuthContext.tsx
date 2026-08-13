import React, { createContext, useContext, useEffect, useState } from 'react';
import { insforge } from '../lib/insforge';
import type { UserProfile } from '../lib/types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ data?: any; error?: any; requireVerification?: boolean }>;
  verifyEmailOtp: (email: string, otp: string) => Promise<{ data?: any; error?: any }>;
  resendVerificationCode: (email: string) => Promise<{ success?: boolean; error?: any }>;
  sendPasswordReset: (email: string) => Promise<{ success?: boolean; error?: any }>;
  resetPasswordWithToken: (token: string, newPassword: string) => Promise<{ success?: boolean; error?: any }>;
  signInWithProvider: (provider: 'google' | 'github') => Promise<void>;
  signOut: () => Promise<void>;
  loginAsDemoAdmin: () => void;
  updateProfileName: (name: string) => Promise<{ success: boolean; error?: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Inicializar y chequear sesión activa al cargar
  useEffect(() => {
    let cancelled = false;

    async function hydrateAuth() {
      try {
        const { data, error } = await insforge.auth.getCurrentUser();
        if (cancelled) return;

        if (data?.user && !error) {
          const authUser = data.user as any;
          setUser({
            id: authUser.id,
            email: authUser.email,
            name: authUser.name || authUser.profile?.name || authUser.email.split('@')[0],
            avatar_url: authUser.avatar_url || authUser.profile?.avatar_url,
            role: 'Administrador TH',
            emailVerified: authUser.emailVerified ?? true,
          });
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
        const authUser = data.user as any;
        const profile: UserProfile = {
          id: authUser.id,
          email: authUser.email,
          name: authUser.name || authUser.profile?.name || authUser.email.split('@')[0],
          avatar_url: authUser.avatar_url || authUser.profile?.avatar_url,
          role: 'Administrador TH',
          emailVerified: true,
        };
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
        const authUser = data.user as any;
        const profile: UserProfile = {
          id: authUser.id,
          email: authUser.email,
          name: name?.trim() || authUser.email.split('@')[0],
          role: 'Administrador TH',
          emailVerified: true,
        };
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
        const authUser = data.user as any;
        const profile: UserProfile = {
          id: authUser.id,
          email: authUser.email,
          name: authUser.name || authUser.email.split('@')[0],
          role: 'Administrador TH',
          emailVerified: true,
        };
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

  // 9. Acceso directo como Demo Admin (para pruebas y presentaciones)
  const loginAsDemoAdmin = () => {
    const demoUser: UserProfile = {
      id: 'usr_demo_admin_th',
      email: 'admin.th@empresa.com',
      name: 'Ing. Carlos Mendoza (Admin)',
      role: 'Director de Talento Humano',
      emailVerified: true,
    };
    localStorage.setItem('th_demo_user', JSON.stringify(demoUser));
    setUser(demoUser);
  };

  // 10. Actualizar nombre de perfil
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

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        verifyEmailOtp,
        resendVerificationCode,
        sendPasswordReset,
        resetPasswordWithToken,
        signInWithProvider,
        signOut,
        loginAsDemoAdmin,
        updateProfileName,
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
