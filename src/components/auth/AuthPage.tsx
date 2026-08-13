import React, { useState } from 'react';
import {
  Sparkles,
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Github,
  Building2,
  Users,
  Network,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';

export const AuthPage: React.FC = () => {
  const {
    signIn,
    signUp,
    verifyEmailOtp,
    resendVerificationCode,
    sendPasswordReset,
    resetPasswordWithToken,
    signInWithProvider,
    loginAsDemoAdmin,
  } = useAuth();

  const toast = useToast();

  const [mode, setMode] = useState<'login' | 'register' | 'verify' | 'forgot' | 'reset'>('login');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.statusCode === 403 || error.message?.includes('not verified')) {
          setErrorMessage('Tu correo no ha sido verificado. Ingresa el código de 6 dígitos.');
          setMode('verify');
        } else {
          setErrorMessage(error.message || 'Credenciales inválidas. Verifica tu correo y contraseña.');
        }
      } else {
        toast.success('¡Bienvenido al Sistema de Gestión de Talento Humano!');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Ocurrió un error al intentar iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 6) {
      setErrorMessage('La contraseña debe contener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const { requireVerification, error } = await signUp(email, password, name);
      if (error) {
        setErrorMessage(error.message || 'No se pudo crear la cuenta.');
      } else if (requireVerification) {
        toast.info('Se ha enviado un código de 6 dígitos a tu correo electrónico.');
        setMode('verify');
      } else {
        toast.success('¡Cuenta creada y sesión iniciada con éxito!');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error en el proceso de registro.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP Verification
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setErrorMessage('El código de verificación debe contener 6 dígitos.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await verifyEmailOtp(email, otpCode);
      if (error) {
        setErrorMessage(error.message || 'Código inválido o expirado. Solicita uno nuevo.');
      } else {
        toast.success('¡Correo verificado con éxito! Bienvenido al portal.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al validar el código.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Resend Code
  const handleResendCode = async () => {
    setLoading(true);
    try {
      const { success, error } = await resendVerificationCode(email);
      if (success) {
        toast.success('Nuevo código enviado a tu correo.');
      } else {
        toast.error(error?.message || 'No se pudo reenviar el código.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const { success, error } = await sendPasswordReset(email);
      if (success) {
        toast.info('Si el correo existe, recibirás un código para restablecer tu contraseña.');
        setMode('reset');
      } else {
        setErrorMessage(error?.message || 'Error al solicitar restablecimiento.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Reset Password with Token
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 6) {
      setErrorMessage('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const { success, error } = await resetPasswordWithToken(otpCode, newPassword);
      if (success) {
        toast.success('Contraseña actualizada correctamente. Inicia sesión con tu nueva clave.');
        setMode('login');
      } else {
        setErrorMessage(error?.message || 'Código de recuperación inválido o expirado.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full mx-auto relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-brand-600 to-indigo-500 p-0.5 shadow-glow mb-4">
            <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-brand-400" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Portal Talento Humano
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Sistema Integral de Estructura Organizacional & Personal
          </p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800/80">
          {/* Tabs */}
          {(mode === 'login' || mode === 'register') && (
            <div className="flex rounded-xl bg-slate-900/90 p-1 border border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'login'
                    ? 'bg-brand-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'register'
                    ? 'bg-brand-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Registrarse
              </button>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* FORM 1: LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@empresa.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMessage(null);
                    }}
                    className="text-[11px] text-brand-400 hover:text-brand-300 font-medium"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-glow transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Ingresar al Sistema</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* FORM 2: REGISTER */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nombre Completo
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Juan Pérez"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@empresa.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Contraseña (mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-glow transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Crear Cuenta</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* FORM 3: OTP VERIFY */}
          {mode === 'verify' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center mb-4">
                <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-100">Verifica tu Correo</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Hemos enviado un código de 6 dígitos a <strong className="text-slate-200">{email}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 text-center">
                  Código de Verificación (OTP)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full py-3 text-center tracking-[0.4em] font-mono text-xl font-bold bg-slate-900 border border-slate-700 rounded-xl text-brand-300 focus:outline-none focus:border-brand-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-glow transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Confirmar y Continuar'
                )}
              </button>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  className="text-brand-400 hover:text-brand-300"
                >
                  Reenviar código
                </button>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="hover:text-slate-200"
                >
                  Volver al inicio
                </button>
              </div>
            </form>
          )}

          {/* FORM 4: FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="text-center mb-4">
                <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-100">Recuperar Contraseña</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Ingresa tu correo para enviarte las instrucciones de restablecimiento.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@empresa.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-glow transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Enviar Código de Recuperación'
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancelar y volver al inicio
                </button>
              </div>
            </form>
          )}

          {/* FORM 5: RESET WITH TOKEN */}
          {mode === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-base font-bold text-slate-100">Nueva Contraseña</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Ingresa el código recibido en tu correo y tu nueva contraseña.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Código de Restablecimiento (6 dígitos)
                </label>
                <input
                  type="text"
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  className="w-full py-2.5 px-4 text-center font-mono font-bold bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-glow transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Guardar Nueva Contraseña'
                )}
              </button>
            </form>
          )}

          {/* Social OAuth Providers & Demo Login */}
          {(mode === 'login' || mode === 'register') && (
            <div className="mt-6 pt-6 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="h-px bg-slate-800 flex-1" />
                <span className="px-3">O continúa con</span>
                <span className="h-px bg-slate-800 flex-1" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => signInWithProvider('google')}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.2-1.9.4-2.8L1.9 6.3C.7 8.7 0 11.3 0 14s.7 5.3 1.9 7.7l3.7-2.9z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.4C3.7 20.1 7.5 23 12 23z"
                    />
                  </svg>
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => signInWithProvider('github')}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition-colors"
                >
                  <Github className="w-4 h-4 text-slate-300" />
                  <span>GitHub</span>
                </button>
              </div>

              {/* Instant Demo Admin Button */}
              <button
                type="button"
                onClick={loginAsDemoAdmin}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-glow-emerald"
              >
                <Sparkles className="w-4 h-4" />
                <span>Acceso Rápido como Administrador TH (Demostración)</span>
              </button>
            </div>
          )}
        </div>

        {/* Feature summary pills */}
        <div className="mt-8 grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/60">
            <Building2 className="w-5 h-5 text-brand-400 mx-auto mb-1.5" />
            <p className="text-[11px] font-medium text-slate-300">3 Niveles</p>
            <p className="text-[10px] text-slate-400">Jerarquía</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/60">
            <Users className="w-5 h-5 text-indigo-400 mx-auto mb-1.5" />
            <p className="text-[11px] font-medium text-slate-300">Ficha Maestra</p>
            <p className="text-[10px] text-slate-400">Colaboradores</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/60">
            <Network className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
            <p className="text-[11px] font-medium text-slate-300">Organigrama</p>
            <p className="text-[10px] text-slate-400">En Tiempo Real</p>
          </div>
        </div>
      </div>
    </div>
  );
};
