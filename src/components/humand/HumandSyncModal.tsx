import React, { useState } from 'react';
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
  Layers
} from 'lucide-react';
import type { Empleado, Departamento, Cargo } from '../../lib/types';
import { departamentosApi, cargosApi, empleadosApi } from '../../lib/insforge';
import {
  humandSyncEngine,
  SyncReport,
  SyncStepLog,
  cleanCedula
} from '../../lib/humandSyncService';
import { useToast } from '../common/Toast';

interface HumandSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  empleado?: Empleado | null; // Si se provee, sincroniza solo a este empleado
  allEmpleados: Empleado[];
  departamentos: Departamento[];
  cargos: Cargo[];
  onSyncComplete?: () => void;
}

export const HumandSyncModal: React.FC<HumandSyncModalProps> = ({
  isOpen,
  onClose,
  empleado,
  allEmpleados,
  departamentos,
  cargos,
  onSyncComplete,
}) => {
  const toast = useToast();
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

  if (!isOpen) return null;

  const isSingle = Boolean(empleado);

  const handleStartSync = async (dryRun = false) => {
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
      if (isSingle && empleado) {
        addLocalLog('Inicio', `Iniciando sincronización en cascada para ${empleado.nombres} ${empleado.apellidos}...`, 'info');

        const rep = await humandSyncEngine.syncEmpleado(
          empleado,
          departamentos,
          cargos,
          allEmpleados
        );

        setReport(rep);
        setLiveLogs(rep.logs);

        if (rep.success) {
          // Persistir actualización en la base de datos de TH
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

          toast.success(`¡${empleado.nombres} sincronizado exitosamente con Humand!`);
          if (onSyncComplete) onSyncComplete();
        } else {
          toast.error(rep.error || 'Ocurrió un error al sincronizar con Humand');
        }
      } else {
        // Sincronización en Lote
        addLocalLog('Lote', `Iniciando proceso de sincronización global (${dryRun ? 'Simulación Dry-Run' : 'Ejecución Real'})...`, 'info');

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
          toast.success(`Sincronización masiva completada: ${result.exitosos} colaboradores procesados exitosamente.`);
        } else {
          toast.info(`Sincronización finalizada: ${result.exitosos} exitosos, ${result.fallidos} con observaciones.`);
        }

        if (onSyncComplete) onSyncComplete();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-glow">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Sincronización Directa con Humand
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  En Cascada
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {isSingle
                  ? `Aprovisionamiento individual para ${empleado?.nombres} ${empleado?.apellidos}`
                  : 'Sincronización integral de catálogos y nómina habilitada'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isRunning}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
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
                    Cédula: {empleado.documento_identidad || 'Sin cédula'} | Código: {empleado.codigo_empleado}
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                  {empleado.email_corporativo || empleado.email || 'Sin correo'}
                </span>
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
                  <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Ingreso:</strong> {empleado.fecha_ingreso || 'No registrada'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <UserCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>
                    <strong>Supervisor:</strong> {empleado.di_supervisor || 'Ninguno'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Explicación de la Cascada Automática */}
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
            <div>
              <strong className="block text-blue-200">Resolución de Dependencias Automática</strong>
              Si el cargo o departamento asociado aún no existen en Humand, el motor los creará primero de forma automática en el catálogo de Humand antes de registrar y vincular al colaborador.
            </div>
          </div>

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

          {/* Fases del Reporte de Resultado */}
          {report && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Resultado de la Sincronización</span>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <CheckCircle2
                    className={`w-4 h-4 ${
                      report.departamento.idHumand ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  />
                  <div>
                    <span className="block font-medium text-slate-200">Departamento Humand</span>
                    <span className="text-[11px] text-slate-400">
                      {report.departamento.creado ? 'Creado nuevo en Humand' : 'Existente verificado'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <CheckCircle2
                    className={`w-4 h-4 ${
                      report.cargo.idHumand ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  />
                  <div>
                    <span className="block font-medium text-slate-200">Puesto de Trabajo</span>
                    <span className="text-[11px] text-slate-400">
                      {report.cargo.creado ? 'Creado nuevo en Humand' : 'Existente verificado'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <CheckCircle2
                    className={`w-4 h-4 ${
                      report.usuarioAprovisionado ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  />
                  <div>
                    <span className="block font-medium text-slate-200">Usuario Aprovisionado</span>
                    <span className="text-[11px] text-slate-400">Cuenta creada vía PUT /users</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <CheckCircle2
                    className={`w-4 h-4 ${
                      report.camposExtendidosAsignados ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  />
                  <div>
                    <span className="block font-medium text-slate-200">Campos Extendidos</span>
                    <span className="text-[11px] text-slate-400">Ubicación, Edo Civil y Nivel</span>
                  </div>
                </div>
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
                disabled={isRunning}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition shadow-sm disabled:opacity-50"
              >
                Simulación (Dry-Run)
              </button>
            )}

            <button
              type="button"
              onClick={() => handleStartSync(false)}
              disabled={isRunning}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-glow transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              {isRunning
                ? 'Sincronizando...'
                : isSingle
                ? 'Sincronizar a Humand Ahora'
                : 'Iniciar Sincronización Real'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default HumandSyncModal;
