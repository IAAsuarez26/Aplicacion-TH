import React, { useState, useEffect } from 'react';
import {
  Share2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  Building2,
  Briefcase,
  UserCheck,
  Clock,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Info,
  Server,
  Layers,
  SlidersHorizontal,
  CheckSquare,
  Square,
  Calendar,
  Phone,
  Mail,
  Award,
  MapPin,
  Heart
} from 'lucide-react';
import type { Empleado, Departamento, Cargo } from '../../lib/types';
import { departamentosApi, cargosApi, empleadosApi } from '../../lib/insforge';
import {
  humandApi,
  humandSyncEngine,
  SyncReport,
  SyncStepLog,
  cleanCedula,
  SelectiveSyncField,
  SELECTIVE_FIELDS
} from '../../lib/humandSyncService';
import { useToast } from '../common/Toast';

export interface HumandSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  empleado?: Empleado | null; // Si se provee, sincroniza solo a este empleado
  allEmpleados: Empleado[];
  departamentos: Departamento[];
  cargos: Cargo[];
  initialMode?: 'selective' | 'cascade';
  onSyncComplete?: (info?: { title?: string; desc?: string; badge?: string; color?: string }) => void;
}

export const HumandSyncModal: React.FC<HumandSyncModalProps> = ({
  isOpen,
  onClose,
  empleado,
  allEmpleados,
  departamentos,
  cargos,
  initialMode = 'selective',
  onSyncComplete,
}) => {
  const toast = useToast();
  const [syncMode, setSyncMode] = useState<'selective' | 'cascade'>(initialMode);
  const [selectedFields, setSelectedFields] = useState<SelectiveSyncField[]>(['birthdate']);
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<SyncReport | null>(null);
  const [batchStats, setBatchStats] = useState<{
    current: number;
    total: number;
    empName: string;
    step: string;
    exitosos: number;
    fallidos: number;
  } | null>(null);
  const [liveLogs, setLiveLogs] = useState<SyncStepLog[]>([]);
  const [humandStatus, setHumandStatus] = useState<'checking' | 'exists' | 'new' | null>(null);

  useEffect(() => {
    if (isOpen && empleado) {
      const ci = cleanCedula(empleado.documento_identidad);
      if (ci) {
        setHumandStatus('checking');
        humandApi
          .checkUserExists(ci)
          .then((exists) => setHumandStatus(exists ? 'exists' : 'new'))
          .catch(() => setHumandStatus(null));
      } else {
        setHumandStatus(null);
      }
    } else {
      setHumandStatus(null);
    }
  }, [isOpen, empleado]);

  if (!isOpen) return null;

  const isSingle = Boolean(empleado);

  const toggleField = (fieldId: SelectiveSyncField) => {
    setSelectedFields((prev) =>
      prev.includes(fieldId) ? prev.filter((f) => f !== fieldId) : [...prev, fieldId]
    );
  };

  const handleSelectPreset = (preset: 'birthdate' | 'personal' | 'laboral' | 'all' | 'none') => {
    if (preset === 'birthdate') setSelectedFields(['birthdate']);
    else if (preset === 'personal') setSelectedFields(['birthdate', 'phoneNumber']);
    else if (preset === 'laboral') setSelectedFields(['hiringDate', 'email', 'supervisor']);
    else if (preset === 'all') setSelectedFields(SELECTIVE_FIELDS.map((f) => f.id));
    else if (preset === 'none') setSelectedFields([]);
  };

  const handleStartSync = async (dryRun = false) => {
    if (syncMode === 'selective' && selectedFields.length === 0) {
      toast.info('Por favor selecciona al menos un campo para sincronizar.', 'Selección Requerida');
      return;
    }

    setIsRunning(true);
    setLiveLogs([]);
    setReport(null);
    setBatchStats(null);

    const addLocalLog = (step: string, message: string, status: SyncStepLog['status']) => {
      setLiveLogs((prev) => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString(), step, message, status },
      ]);
    };

    try {
      if (syncMode === 'selective') {
        // ====================================================================
        // MODO 1: SINCRONIZACIÓN SELECTIVA POR CAMPOS (DELTA PATCH)
        // ====================================================================
        const fieldLabels = SELECTIVE_FIELDS.filter((f) => selectedFields.includes(f.id)).map(
          (f) => f.label
        );

        if (isSingle && empleado) {
          addLocalLog(
            'Inicio',
            `Iniciando sincronización selectiva para ${empleado.nombres} ${empleado.apellidos} — Campos: [${fieldLabels.join(', ')}]...`,
            'info'
          );

          if (dryRun) {
            const simulatedReport: SyncReport = {
              success: true,
              colaborador: `${empleado.nombres} ${empleado.apellidos}`.trim(),
              cedula: cleanCedula(empleado.documento_identidad),
              departamento: { nombre: empleado.codigo_departamento, creado: false },
              cargo: { nombre: empleado.codigo_cargo, creado: false },
              usuarioAprovisionado: true,
              departamentoAsignado: false,
              cargoAsignado: false,
              camposExtendidosAsignados: true,
              logs: [
                {
                  timestamp: new Date().toLocaleTimeString(),
                  step: 'Simulación (Dry-Run)',
                  message: `Simulado con éxito: Se enviarían [${fieldLabels.join(', ')}] vía PATCH a Humand.`,
                  status: 'info',
                },
              ],
            };
            setReport(simulatedReport);
            setLiveLogs(simulatedReport.logs);
            toast.info('Simulación individual completada sin emitir cambios a Humand.');
          } else {
            const rep = await humandSyncEngine.syncEmpleadoSelective(
              empleado,
              selectedFields,
              allEmpleados
            );
            setReport(rep);
            setLiveLogs(rep.logs);

            if (rep.success) {
              toast.success(`¡Campos de ${empleado.nombres} actualizados exitosamente en Humand!`);
              if (onSyncComplete) {
                onSyncComplete({
                  title: `Sincronización Selectiva: ${empleado.nombres} ${empleado.apellidos}`,
                  desc: `Actualizados vía PATCH en Humand los campos: ${fieldLabels.join(', ')}.`,
                  badge: `${selectedFields.length} Campos OK`,
                  color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
                });
              }
            } else {
              toast.error(rep.error || 'Error en sincronización selectiva de Humand');
            }
          }
        } else {
          // Sincronización Selectiva en Lote
          addLocalLog(
            'Lote Selectivo',
            `Iniciando sincronización selectiva global (${dryRun ? 'Simulación Dry-Run' : 'Ejecución Real'}) sobre [${fieldLabels.join(', ')}]...`,
            'info'
          );

          const result = await humandSyncEngine.syncSelectiveAll(allEmpleados, selectedFields, {
            dryRun,
            onProgress: (p) => {
              setBatchStats((prev) => ({
                current: p.current,
                total: p.total,
                empName: p.empName,
                step: p.step,
                exitosos: prev ? prev.exitosos : 0,
                fallidos: prev ? prev.fallidos : 0,
              }));
              addLocalLog('Avance', `${p.step}`, 'info');
            },
          });

          setBatchStats({
            current: result.total,
            total: result.total,
            empName: 'Todos los colaboradores procesados',
            step: 'Completado',
            exitosos: result.exitosos,
            fallidos: result.fallidos,
          });

          if (result.fallidos === 0) {
            toast.success(
              dryRun
                ? `Simulación finalizada: ${result.exitosos} colaboradores validados correctamente.`
                : `Sincronización selectiva exitosa: ${result.exitosos} colaboradores actualizados en Humand.`
            );
          } else {
            toast.info(
              `Proceso finalizado: ${result.exitosos} exitosos, ${result.fallidos} con observaciones.`
            );
          }

          if (onSyncComplete) {
            onSyncComplete({
              title: dryRun ? 'Simulación Selectiva Global' : 'Sincronización Selectiva Masiva',
              desc: dryRun
                ? `Simulación ejecutada sobre ${result.total} colaboradores con los campos: ${fieldLabels.join(', ')}.`
                : `Actualizados formalmente en Humand ${result.exitosos} colaboradores con los campos: ${fieldLabels.join(', ')}.`,
              badge: dryRun ? 'Simulación' : `${result.exitosos} Exitosos`,
              color:
                result.fallidos === 0
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                  : 'text-amber-400 bg-amber-500/10 border-amber-500/30',
            });
          }
        }
      } else {
        // ====================================================================
        // MODO 2: SINCRONIZACIÓN COMPLETA EN CASCADA (PUT /users + MEMBRESÍAS)
        // ====================================================================
        if (isSingle && empleado) {
          addLocalLog(
            'Inicio',
            `Iniciando sincronización completa en cascada para ${empleado.nombres} ${empleado.apellidos}...`,
            'info'
          );

          const rep = await humandSyncEngine.syncEmpleado(
            empleado,
            departamentos,
            cargos,
            allEmpleados
          );

          setReport(rep);
          setLiveLogs(rep.logs);

          if (rep.success) {
            if (empleado.empleado_id) {
              try {
                await empleadosApi.update(empleado.empleado_id, { estatus_h: 1 });
              } catch (e) {
                console.warn('No se pudo actualizar estatus_h de empleado en TH:', e);
              }
            }
            if (rep.departamento.creado) {
              const d = departamentos.find((dep) => dep.codigo === empleado.codigo_departamento);
              if (d?.departamento_id) {
                try {
                  await departamentosApi.update(d.departamento_id, { estatus_h: 1 });
                } catch (e) {
                  console.warn('No se pudo actualizar estatus_h de departamento en TH:', e);
                }
              }
            }
            if (rep.cargo.creado) {
              const c = cargos.find((crg) => crg.codigo === empleado.codigo_cargo);
              if (c?.cargo_id) {
                try {
                  await cargosApi.update(c.cargo_id, { estatus_h: 1 });
                } catch (e) {
                  console.warn('No se pudo actualizar estatus_h de cargo en TH:', e);
                }
              }
            }

            const methodTag = rep.metodoUsuario || 'OK';
            toast.success(`¡${empleado.nombres} sincronizado en Humand (${methodTag})!`);
            if (onSyncComplete) {
              onSyncComplete({
                title: `Sincronización Smart: ${empleado.nombres} ${empleado.apellidos}`,
                desc: `Colaborador sincronizado en Humand vía ${methodTag} (Departamento: ${empleado.codigo_departamento || '-'}, Cargo: ${empleado.codigo_cargo || '-'}).`,
                badge: `${methodTag} OK`,
                color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
              });
            }
          } else {
            toast.error(rep.error || 'Ocurrió un error al sincronizar con Humand');
          }
        } else {
          // Lote Completo en Cascada
          addLocalLog(
            'Lote Cascada',
            `Iniciando sincronización en cascada global (${dryRun ? 'Simulación Dry-Run' : 'Ejecución Real'})...`,
            'info'
          );

          const result = await humandSyncEngine.syncAllHabilitados(
            allEmpleados,
            departamentos,
            cargos,
            {
              dryRun,
              onProgress: (p) => {
                setBatchStats((prev) => ({
                  current: p.current,
                  total: p.total,
                  empName: p.empName,
                  step: p.step,
                  exitosos: prev ? prev.exitosos : 0,
                  fallidos: prev ? prev.fallidos : 0,
                }));
                addLocalLog('Avance', `${p.step}`, 'info');
              },
            }
          );

          setBatchStats({
            current: result.total,
            total: result.total,
            empName: 'Todos los colaboradores procesados',
            step: 'Completado',
            exitosos: result.exitosos,
            fallidos: result.fallidos,
          });

          if (result.fallidos === 0) {
            toast.success(
              `Sincronización masiva completada: ${result.exitosos} colaboradores procesados.`
            );
          } else {
            toast.info(
              `Sincronización finalizada: ${result.exitosos} exitosos, ${result.fallidos} observaciones.`
            );
          }

          if (onSyncComplete) {
            onSyncComplete({
              title: dryRun ? 'Simulación Global (Dry-Run)' : 'Sincronización Masiva en Lote',
              desc: dryRun
                ? `Simulación ejecutada sobre ${result.total} colaboradores. ${result.exitosos} listos.`
                : `Proceso masivo completado. ${result.exitosos} colaboradores sincronizados formalmente en Humand.`,
              badge: dryRun ? 'Simulación' : `${result.exitosos} Exitosos`,
              color:
                result.fallidos === 0
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                  : 'text-amber-400 bg-amber-500/10 border-amber-500/30',
            });
          }
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error en la sincronización con Humand');
      addLocalLog('Error', err?.message || 'Fallo general inesperado', 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const getCargoName = (code?: string) => {
    if (!code) return 'Sin cargo';
    return cargos.find((c) => c.codigo === code)?.nombre || code;
  };

  const getDepartamentoName = (code?: string) => {
    if (!code) return 'Sin departamento';
    return departamentos.find((d) => d.codigo === code)?.nombre || code;
  };

  const getFieldIcon = (fieldId: SelectiveSyncField) => {
    switch (fieldId) {
      case 'birthdate':
        return <Calendar className="w-4 h-4 text-pink-400" />;
      case 'phoneNumber':
        return <Phone className="w-4 h-4 text-emerald-400" />;
      case 'hiringDate':
        return <Clock className="w-4 h-4 text-indigo-400" />;
      case 'email':
        return <Mail className="w-4 h-4 text-blue-400" />;
      case 'supervisor':
        return <UserCheck className="w-4 h-4 text-amber-400" />;
      case 'estadoCivil':
        return <Heart className="w-4 h-4 text-rose-400" />;
      case 'nivelEducativo':
        return <Award className="w-4 h-4 text-purple-400" />;
      case 'segmentaciones':
        return <MapPin className="w-4 h-4 text-cyan-400" />;
      default:
        return <Layers className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/90 shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-glow">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Sincronización con Humand
                  <span
                    className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${
                      syncMode === 'selective'
                        ? 'bg-brand-500/15 text-brand-300 border-brand-500/30'
                        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {syncMode === 'selective' ? 'Selectiva (Delta PATCH)' : 'Cascada Estructural (PUT)'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  {isSingle
                    ? `Actualización para ${empleado?.nombres} ${empleado?.apellidos} (C.I. ${cleanCedula(empleado?.documento_identidad)})`
                    : 'Actualización para los 187 colaboradores activos habilitados'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isRunning}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-40"
              title="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Selector de Modo de Sincronización */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setSyncMode('selective')}
              disabled={isRunning}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-semibold transition ${
                syncMode === 'selective'
                  ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Sincronización Selectiva (PATCH)
            </button>
            <button
              type="button"
              onClick={() => setSyncMode('cascade')}
              disabled={isRunning}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-semibold transition ${
                syncMode === 'cascade'
                  ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Sincronización Estructural Smart (POST / PATCH)
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* Ficha resumen si es colaborador individual */}
          {isSingle && empleado && (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                <div>
                  <div className="text-sm font-bold text-slate-100">
                    {empleado.nombres} {empleado.apellidos}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    Cédula: {empleado.documento_identidad || 'Sin cédula'} | Código:{' '}
                    {empleado.codigo_empleado}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {humandStatus === 'checking' && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 animate-pulse flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Verificando en Humand...
                    </span>
                  )}
                  {humandStatus === 'exists' && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1" title="El usuario ya existe en Humand. Se usará PATCH para proteger todos sus datos preexistentes.">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Registrado en Humand (PATCH Seguro)
                    </span>
                  )}
                  {humandStatus === 'new' && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1" title="El usuario no existe aún en Humand. Se creará limpiamente mediante POST.">
                      <Sparkles className="w-3 h-3 text-blue-400" /> Nuevo en Humand (Alta vía POST)
                    </span>
                  )}
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {empleado.email_corporativo || empleado.email || 'Sin correo'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="truncate">
                    <strong>Dpto:</strong> {getDepartamentoName(empleado.codigo_departamento)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Briefcase className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="truncate">
                    <strong>Cargo:</strong> {getCargoName(empleado.codigo_cargo)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Calendar className="w-4 h-4 text-pink-400 shrink-0" />
                  <span>
                    <strong>Nacimiento:</strong> {empleado.fecha_nacimiento?.split('T')[0] || 'No registrada'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Ingreso:</strong> {empleado.fecha_ingreso?.split('T')[0] || 'No registrada'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* MODO SELECTIVO: PANEL DE SELECCIÓN DE CAMPOS */}
          {syncMode === 'selective' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-brand-400" />
                    Selecciona los campos a actualizar en Humand:
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                    {selectedFields.length} de {SELECTIVE_FIELDS.length} seleccionados
                  </span>
                </div>

                {/* Presets Rápidos */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleSelectPreset('birthdate')}
                    disabled={isRunning}
                    className="px-2 py-1 rounded text-[11px] font-semibold bg-pink-500/10 text-pink-300 hover:bg-pink-500/20 border border-pink-500/30 transition"
                  >
                    Solo Nacimiento
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPreset('personal')}
                    disabled={isRunning}
                    className="px-2 py-1 rounded text-[11px] font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition"
                  >
                    Personales
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPreset('laboral')}
                    disabled={isRunning}
                    className="px-2 py-1 rounded text-[11px] font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition"
                  >
                    Laborales
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPreset('all')}
                    disabled={isRunning}
                    className="px-2 py-1 rounded text-[11px] font-semibold bg-brand-500/10 text-brand-300 hover:bg-brand-500/20 border border-brand-500/30 transition"
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPreset('none')}
                    disabled={isRunning}
                    className="px-2 py-1 rounded text-[11px] font-semibold bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700 transition"
                  >
                    Limpiar
                  </button>
                </div>
              </div>

              {/* Grid de Campos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SELECTIVE_FIELDS.map((field) => {
                  const isChecked = selectedFields.includes(field.id);
                  return (
                    <div
                      key={field.id}
                      onClick={() => !isRunning && toggleField(field.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                        isChecked
                          ? 'bg-gradient-to-r from-brand-950/50 to-indigo-950/40 border-brand-500/50 shadow-sm'
                          : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 text-slate-400'
                      } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="mt-0.5">
                        {isChecked ? (
                          <div className="w-4 h-4 rounded bg-brand-500 flex items-center justify-center text-white">
                            <CheckSquare className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <Square className="w-4 h-4 text-slate-600" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {getFieldIcon(field.id)}
                          <span
                            className={`text-xs font-semibold ${
                              isChecked ? 'text-white' : 'text-slate-300'
                            }`}
                          >
                            {field.label}
                          </span>
                          {field.badge && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">
                              {field.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                          {field.description}
                        </p>
                        <div className="mt-1 text-[10px] font-mono text-slate-500">
                          {field.humandEndpoint}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Nota de Inocuidad y Seguridad */}
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                <div>
                  <strong className="block text-emerald-200">Garantía de Inocuidad (Delta PATCH)</strong>
                  Solo se enviarán los atributos seleccionados. Humand <strong>no alterará</strong>{' '}
                  departamentos, puestos, contraseñas ni el estatus de activación de las cuentas.
                </div>
              </div>
            </div>
          )}

          {/* MODO CASCADA: EXPLICACIÓN SMART SYNC */}
          {syncMode === 'cascade' && (
            <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
              <div>
                <strong className="block text-indigo-200">Sincronización Estructural Smart (Alineada con Humand)</strong>
                El motor asegura departamentos y cargos en Humand y realiza una comprobación previa: si el colaborador ya existe en Humand, aplica automáticamente <strong>PATCH</strong> para proteger sus datos y no sobreescribir información; si es un nuevo ingreso, aplica <strong>POST</strong> para darlo de alta formalmente.
              </div>
            </div>
          )}

          {/* Indicador de progreso de Lote si aplica */}
          {batchStats && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">{batchStats.step}</span>
                <span className="text-slate-400 font-mono">
                  {batchStats.current} / {batchStats.total}
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-brand-500 to-indigo-500 h-2 transition-all duration-300"
                  style={{
                    width: `${Math.round((batchStats.current / (batchStats.total || 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Reporte de Resultado Individual */}
          {report && isSingle && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Resultado de la Operación</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    report.success
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {report.success ? '100% Sincronizado' : 'Con Inconsistencias'}
                </span>
              </h4>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  {syncMode === 'selective'
                    ? `Campos aplicados exitosamente vía PATCH para ${report.colaborador}.`
                    : `Usuario ${report.colaborador} aprovisionado y vinculado formalmente.`}
                </span>
              </div>
            </div>
          )}

          {/* Bitácora de Pasos en Vivo */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5" />
              Bitácora de Eventos de la API
            </h4>
            <div className="rounded-xl bg-slate-950 border border-slate-800/80 p-3 max-h-48 overflow-y-auto font-mono text-[11px] space-y-1.5">
              {liveLogs.length === 0 ? (
                <div className="text-slate-500 italic py-3 text-center">
                  Presiona el botón de abajo para iniciar la sincronización.
                </div>
              ) : (
                liveLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                    <span
                      className={`font-semibold shrink-0 ${
                        log.status === 'success'
                          ? 'text-emerald-400'
                          : log.status === 'warning'
                          ? 'text-amber-400'
                          : log.status === 'error'
                          ? 'text-rose-400'
                          : 'text-blue-400'
                      }`}
                    >
                      [{log.step}]
                    </span>
                    <span className="text-slate-300 break-words">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-900/90 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isRunning}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50"
          >
            Cerrar
          </button>

          <div className="flex items-center gap-2">
            {!isSingle && (
              <button
                type="button"
                onClick={() => handleStartSync(true)}
                disabled={isRunning || (syncMode === 'selective' && selectedFields.length === 0)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition shadow-sm disabled:opacity-50"
              >
                Simulación (Dry-Run)
              </button>
            )}

            <button
              type="button"
              onClick={() => handleStartSync(false)}
              disabled={isRunning || (syncMode === 'selective' && selectedFields.length === 0)}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-glow transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              {isRunning
                ? 'Sincronizando...'
                : syncMode === 'selective'
                ? isSingle
                  ? `Sincronizar ${selectedFields.length} Campo(s)`
                  : `Sincronizar ${selectedFields.length} Campo(s) a Humand`
                : isSingle
                ? 'Sincronizar en Cascada'
                : 'Iniciar Sincronización en Cascada'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default HumandSyncModal;
