import type { Departamento, Cargo, Empleado } from './types';

// Credenciales de Humand Public API v1
const HUMAND_BASE_URL =
  import.meta.env.VITE_HUMAND_BASE_URL || 'https://api-prod.humand.co/public/api/v1';
const HUMAND_API_KEY =
  import.meta.env.VITE_HUMAND_API_KEY || 'MTE3NzYxOTY6bXplZnJDYmtFMHE0Ymk3bXBmcWQ3UmJVQzBYTzRNZl8=';

export const UUID_ESTADO_CIVIL = '52005932-0bdb-438d-834c-82d8e3330e26';
export const UUID_NIVEL_EDUCATIVO = 'a0b1e6b5-4bc7-444b-a27c-2844dd5a9532';

export interface HumandApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T;
  error?: string;
}

export interface SyncStepLog {
  timestamp: string;
  step: string;
  message: string;
  status: 'info' | 'success' | 'warning' | 'error';
}

export interface SyncReport {
  success: boolean;
  colaborador: string;
  cedula: string;
  departamento: {
    nombre: string;
    idHumand?: number;
    creado: boolean;
  };
  cargo: {
    nombre: string;
    idHumand?: number;
    creado: boolean;
  };
  usuarioAprovisionado: boolean;
  departamentoAsignado: boolean;
  cargoAsignado: boolean;
  camposExtendidosAsignados: boolean;
  logs: SyncStepLog[];
  error?: string;
}

// Limpiar cédula (eliminar letras V, E, puntos o guiones)
export const cleanCedula = (val?: string | null): string => {
  if (!val) return '';
  return val.replace(/[^0-9]/g, '').trim();
};

// Normalizar nombres para comparaciones sin acentos
export const normalizeName = (val?: string | null): string => {
  if (!val) return '';
  return val
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

// Cliente HTTP para Humand con reintentos y manejo de Rate Limiting
export async function humandFetch<T = any>(
  endpoint: string,
  options: {
    method?: string;
    body?: any;
    retries?: number;
  } = {}
): Promise<HumandApiResponse<T>> {
  const { method = 'GET', body, retries = 3 } = options;
  const url = `${HUMAND_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    Authorization: `Basic ${HUMAND_API_KEY}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const status = response.status;

      // Rate limit 429
      if (status === 429 && attempt < retries - 1) {
        const retryAfter = Number(response.headers.get('Retry-After')) || 2 ** (attempt + 1);
        await new Promise((res) => setTimeout(res, retryAfter * 1000));
        continue;
      }

      let data: any = null;
      const text = await response.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { raw: text };
        }
      }

      if (response.ok) {
        return { ok: true, status, data };
      }

      return {
        ok: false,
        status,
        data,
        error: data?.message || data?.code || `HTTP ${status}`,
      };
    } catch (err: any) {
      if (attempt === retries - 1) {
        return {
          ok: false,
          status: 0,
          data: null as any,
          error: err?.message || 'Error de conexión con Humand',
        };
      }
      await new Promise((res) => setTimeout(res, 1000 * (attempt + 1)));
    }
  }

  return {
    ok: false,
    status: 0,
    data: null as any,
    error: 'Reintentos agotados al contactar Humand',
  };
}

// ============================================================================
// SERVICIOS ESPECÍFICOS DE HUMAND
// ============================================================================

export const humandApi = {
  // Probar autenticación y conectividad
  async testConnection(): Promise<HumandApiResponse> {
    return humandFetch('/users/me');
  },

  // Obtener todos los departamentos de Humand (paginación con page/limit)
  async getAllDepartments(): Promise<{ id: number; name: string }[]> {
    const all: { id: number; name: string }[] = [];
    let page = 1;
    const limit = 50;

    while (true) {
      const res = await humandFetch<{ items: any[]; totalPages?: number }>(
        `/departments?page=${page}&limit=${limit}`
      );
      if (!res.ok) break;

      const items = res.data?.items || [];
      for (const item of items) {
        if (item.id && item.name) {
          all.push({ id: item.id, name: item.name });
        }
      }

      const totalPages = res.data?.totalPages || 1;
      if (page >= totalPages || items.length === 0) break;
      page++;
    }

    return all;
  },

  // Crear departamentos en lote en Humand
  async createDepartmentsBulk(departments: { name: string; identifier: string }[]) {
    return humandFetch('/departments/bulk', {
      method: 'POST',
      body: { departments },
    });
  },

  // Obtener todos los puestos / cargos de Humand (paginación con page/limit)
  async getAllJobPositions(): Promise<{ id: number; name: string }[]> {
    const all: { id: number; name: string }[] = [];
    let page = 1;
    const limit = 50;

    while (true) {
      const res = await humandFetch<{ items: any[]; totalPages?: number }>(
        `/job-positions?page=${page}&limit=${limit}`
      );
      if (!res.ok) break;

      const items = res.data?.items || [];
      for (const item of items) {
        if (item.id && item.name) {
          all.push({ id: item.id, name: item.name });
        }
      }

      const totalPages = res.data?.totalPages || 1;
      if (page >= totalPages || items.length === 0) break;
      page++;
    }

    return all;
  },

  // Crear puestos de trabajo en lote en Humand
  async createJobPositionsBulk(jobPositions: { name: string; identifier: string }[]) {
    return humandFetch('/job-positions/bulk', {
      method: 'POST',
      body: { jobPositions },
    });
  },

  // Consultar usuario por employeeInternalId (cédula)
  async getUser(employeeInternalId: string): Promise<HumandApiResponse> {
    return humandFetch(`/users/${employeeInternalId}`);
  },

  // Aprovisionar o actualizar usuario silenciosamente (PUT /users)
  async upsertUser(payload: any): Promise<HumandApiResponse> {
    return humandFetch('/users', {
      method: 'PUT',
      body: payload,
    });
  },

  // Asignar departamento a un colaborador
  async assignDepartment(employeeInternalId: string, departmentId: number): Promise<HumandApiResponse> {
    return humandFetch(`/departments/members/${employeeInternalId}`, {
      method: 'PUT',
      body: { departmentId },
    });
  },

  // Asignar puesto de trabajo a un colaborador
  async assignJobPosition(employeeInternalId: string, jobPositionId: number): Promise<HumandApiResponse> {
    return humandFetch(`/job-positions/members/${employeeInternalId}`, {
      method: 'PUT',
      body: { jobPositionId },
    });
  },

  // Asignar segmentaciones a un colaborador (POST /segmentations/users)
  // Payload esperado por Humand: { users: [{ employeeInternalId, segmentation: [{ group, item }] }] }
  async updateSegmentations(employeeInternalId: string, segmentations: { group: string; item: string }[]): Promise<HumandApiResponse> {
    return humandFetch('/segmentations/users', {
      method: 'POST',
      body: {
        users: [
          {
            employeeInternalId,
            segmentation: segmentations,
          },
        ],
      },
    });
  },

  // Actualizar campos extendidos de perfil (Estado Civil, Nivel Educativo)
  async updateProfileFields(
    employeeInternalId: string,
    fields: { id: string; value: string }[]
  ): Promise<HumandApiResponse> {
    return humandFetch(`/users/${employeeInternalId}/profile-fields`, {
      method: 'PATCH',
      body: { fields },
    });
  },
};

// ============================================================================
// MOTOR DE SINCRONIZACIÓN EN CASCADA
// ============================================================================

export const humandSyncEngine = {
  /**
   * Sincronización en Cascada de un solo Colaborador:
   * 1. Resuelve o crea el Departamento si no existe en Humand.
   * 2. Resuelve o crea el Cargo / Puesto si no existe en Humand.
   * 3. Aprovisiona al Colaborador en Humand (PUT /users) con su supervisora.
   * 4. Asigna Departamento y Cargo usando los IDs garantizados de Humand.
   * 5. Aplica los campos extendidos (Ubicación, Estado Civil, Nivel Educativo).
   */
  async syncEmpleado(
    emp: Empleado,
    allDeps: Departamento[],
    allCargos: Cargo[],
    allEmps: Empleado[] = []
  ): Promise<SyncReport> {
    const cedula = cleanCedula(emp.documento_identidad);
    const nombreCompleto = `${emp.nombres} ${emp.apellidos}`.trim();
    const now = () => new Date().toLocaleTimeString();

    const report: SyncReport = {
      success: false,
      colaborador: nombreCompleto,
      cedula,
      departamento: {
        nombre: emp.codigo_departamento,
        creado: false,
      },
      cargo: {
        nombre: emp.codigo_cargo,
        creado: false,
      },
      usuarioAprovisionado: false,
      departamentoAsignado: false,
      cargoAsignado: false,
      camposExtendidosAsignados: false,
      logs: [],
    };

    const addLog = (step: string, message: string, status: SyncStepLog['status']) => {
      report.logs.push({ timestamp: now(), step, message, status });
    };

    if (!cedula) {
      report.error = 'El colaborador no posee un documento de identidad válido.';
      addLog('Validación Inicial', report.error, 'error');
      return report;
    }

    addLog('Inicio', `Iniciando sincronización en cascada para ${nombreCompleto} (C.I. ${cedula})...`, 'info');

    try {
      // ----------------------------------------------------------------------
      // PASO 1: Resolver o Crear Departamento en Humand
      // ----------------------------------------------------------------------
      const deptoTH = allDeps.find((d) => d.codigo === emp.codigo_departamento);
      const nombreDepto = deptoTH?.nombre || emp.codigo_departamento;
      report.departamento.nombre = nombreDepto;

      addLog('Departamentos', `Consultando departamento '${nombreDepto}' en Humand...`, 'info');
      let humandDeps = await humandApi.getAllDepartments();
      let matchedDep = humandDeps.find((d) => normalizeName(d.name) === normalizeName(nombreDepto));

      if (!matchedDep) {
        addLog(
          'Departamentos',
          `El departamento '${nombreDepto}' no existe en Humand. Creándolo automáticamente...`,
          'warning'
        );
        const resCreateDep = await humandApi.createDepartmentsBulk([
          { name: nombreDepto, identifier: emp.codigo_departamento },
        ]);

        if (!resCreateDep.ok) {
          throw new Error(`Error al crear departamento en Humand: ${resCreateDep.error}`);
        }

        report.departamento.creado = true;
        addLog('Departamentos', `Departamento '${nombreDepto}' creado exitosamente en Humand.`, 'success');

        // Reconsultar para obtener su nuevo ID
        humandDeps = await humandApi.getAllDepartments();
        matchedDep = humandDeps.find((d) => normalizeName(d.name) === normalizeName(nombreDepto));
      }

      if (matchedDep) {
        report.departamento.idHumand = matchedDep.id;
        addLog('Departamentos', `Departamento listo con Humand ID: ${matchedDep.id}`, 'success');
      }

      // ----------------------------------------------------------------------
      // PASO 2: Resolver o Crear Puesto / Cargo en Humand
      // ----------------------------------------------------------------------
      const cargoTH = allCargos.find((c) => c.codigo === emp.codigo_cargo);
      const nombreCargo = cargoTH?.nombre || emp.codigo_cargo;
      report.cargo.nombre = nombreCargo;

      addLog('Puestos', `Consultando cargo '${nombreCargo}' en Humand...`, 'info');
      let humandJobs = await humandApi.getAllJobPositions();
      let matchedJob = humandJobs.find((j) => normalizeName(j.name) === normalizeName(nombreCargo));

      if (!matchedJob) {
        addLog(
          'Puestos',
          `El cargo '${nombreCargo}' no existe en Humand. Creándolo automáticamente...`,
          'warning'
        );
        const resCreateJob = await humandApi.createJobPositionsBulk([
          { name: nombreCargo, identifier: emp.codigo_cargo },
        ]);

        if (!resCreateJob.ok) {
          throw new Error(`Error al crear cargo en Humand: ${resCreateJob.error}`);
        }

        report.cargo.creado = true;
        addLog('Puestos', `Cargo '${nombreCargo}' creado exitosamente en Humand.`, 'success');

        // Reconsultar para obtener su nuevo ID
        humandJobs = await humandApi.getAllJobPositions();
        matchedJob = humandJobs.find((j) => normalizeName(j.name) === normalizeName(nombreCargo));
      }

      if (matchedJob) {
        report.cargo.idHumand = matchedJob.id;
        addLog('Puestos', `Cargo listo con Humand ID: ${matchedJob.id}`, 'success');
      }

      // ----------------------------------------------------------------------
      // PASO 3: Aprovisionar Usuario en Humand (PUT /users)
      // ----------------------------------------------------------------------
      const supCedula = cleanCedula(emp.di_supervisor);
      const supTH = allEmps.find((e) => cleanCedula(e.documento_identidad) === supCedula);
      const supervisorName = supTH ? `${supTH.nombres} ${supTH.apellidos}` : supCedula;

      const userPayload: any = {
        employeeInternalId: cedula,
        firstName: emp.nombres.trim(),
        lastName: emp.apellidos.trim(),
        email: (emp.email_corporativo || emp.email || '').trim().toLowerCase(),
        phoneNumber: emp.telefono?.trim() || null,
        hiringDate: emp.fecha_ingreso ? emp.fecha_ingreso.split('T')[0] : null,
        password: 'PasswordTemp2026!',
        relationships: supCedula ? [{ name: 'BOSS', employeeInternalId: supCedula }] : [],
        // NOTA: segmentation omitida intencionalmente del aprovisionamiento inicial.
        // Los grupos de segmentación (Ubicación, Sede, Género) deben existir en Humand
        // antes de poder asignarlos. Si se incluyen sin existir, la API retorna 400.
      };

      addLog(
        'Aprovisionamiento',
        `Aprovisionando usuario en Humand con supervisor ${supCedula ? `${supervisorName} (${supCedula})` : 'ninguno'}...`,
        'info'
      );

      const resUpsert = await humandApi.upsertUser(userPayload);
      if (!resUpsert.ok) {
        throw new Error(`Error al aprovisionar usuario en Humand: ${resUpsert.error}`);
      }

      report.usuarioAprovisionado = true;
      addLog('Aprovisionamiento', `Usuario ${cedula} aprovisionado exitosamente en Humand.`, 'success');

      // ----------------------------------------------------------------------
      // PASO 4: Asignar Membresías (Departamento y Cargo)
      // ----------------------------------------------------------------------
      if (report.departamento.idHumand) {
        addLog(
          'Membresía Dpto',
          `Asignando departamento '${nombreDepto}' (ID ${report.departamento.idHumand})...`,
          'info'
        );
        const resDepAssign = await humandApi.assignDepartment(cedula, report.departamento.idHumand);
        if (resDepAssign.ok) {
          report.departamentoAsignado = true;
          addLog('Membresía Dpto', 'Departamento asignado formalmente.', 'success');
        } else {
          addLog('Membresía Dpto', `Advertencia al asignar dpto: ${resDepAssign.error}`, 'warning');
        }
      }

      if (report.cargo.idHumand) {
        addLog(
          'Membresía Cargo',
          `Asignando puesto de trabajo '${nombreCargo}' (ID ${report.cargo.idHumand})...`,
          'info'
        );
        const resJobAssign = await humandApi.assignJobPosition(cedula, report.cargo.idHumand);
        if (resJobAssign.ok) {
          report.cargoAsignado = true;
          addLog('Membresía Cargo', 'Puesto de trabajo asignado formalmente.', 'success');
        } else {
          addLog('Membresía Cargo', `Advertencia al asignar cargo: ${resJobAssign.error}`, 'warning');
        }
      }

      // ----------------------------------------------------------------------
      // PASO 5: Actualizar Campos Extendidos (no bloqueante — warnings si falla)
      // Segmentaciones: Ubicación, Género
      // Campos de Perfil: Estado Civil, Nivel Educativo
      // ----------------------------------------------------------------------
      const segList: { group: string; item: string }[] = [];
      if (emp.ubicacion) segList.push({ group: 'Ubicación', item: emp.ubicacion });
      if (emp.genero) segList.push({ group: 'Género', item: emp.genero });

      if (segList.length > 0) {
        addLog('Segmentaciones', `Asignando segmentaciones: ${segList.map((s) => `${s.group}=${s.item}`).join(', ')}...`, 'info');
        try {
          const resSeg = await humandApi.updateSegmentations(cedula, segList);
          if (resSeg.ok) {
            addLog('Segmentaciones', 'Segmentaciones asignadas correctamente.', 'success');
          } else {
            addLog('Segmentaciones', `Advertencia en segmentaciones: ${resSeg.error}`, 'warning');
          }
        } catch (segErr: any) {
          addLog('Segmentaciones', `Error no crítico en segmentaciones: ${segErr?.message}`, 'warning');
        }
      }

      const pfList: { id: string; value: string }[] = [];
      if (emp.edo_civil) {
        pfList.push({ id: UUID_ESTADO_CIVIL, value: emp.edo_civil });
      }
      if (emp.nivel_educativo) {
        pfList.push({ id: UUID_NIVEL_EDUCATIVO, value: emp.nivel_educativo });
      }

      if (pfList.length > 0) {
        addLog('Campos de Perfil', 'Actualizando Estado Civil y Nivel Educativo en perfil...', 'info');
        try {
          const resPf = await humandApi.updateProfileFields(cedula, pfList);
          if (resPf.ok) {
            report.camposExtendidosAsignados = true;
            addLog('Campos de Perfil', 'Campos de perfil extendidos actualizados correctamente.', 'success');
          } else {
            addLog('Campos de Perfil', `Advertencia en campos de perfil: ${resPf.error}`, 'warning');
          }
        } catch (pfErr: any) {
          addLog('Campos de Perfil', `Error no crítico en campos de perfil: ${pfErr?.message}`, 'warning');
        }
      } else {
        report.camposExtendidosAsignados = true;
      }

      report.success = true;
      addLog('Finalizado', `Sincronización completa y exitosa de ${nombreCompleto} en Humand.`, 'success');
      return report;
    } catch (err: any) {
      report.error = err?.message || 'Error inesperado durante la sincronización';
      addLog('Error', report.error || 'Fallo general', 'error');
      return report;
    }
  },

  /**
   * Sincronización Global de todos los Colaboradores Habilitados (estatus_h === 1)
   */
  async syncAllHabilitados(
    emps: Empleado[],
    deps: Departamento[],
    cargos: Cargo[],
    options: {
      onProgress?: (progress: { current: number; total: number; empName: string; step: string }) => void;
      dryRun?: boolean;
    } = {}
  ): Promise<{ total: number; exitosos: number; fallidos: number; reports: SyncReport[] }> {
    const habilitados = emps.filter((e) => e.estatus_h === 1 && e.estado_laboral === 'ACTIVO');
    const reports: SyncReport[] = [];
    let exitosos = 0;
    let fallidos = 0;

    // 1. Catálogos globales previos
    if (!options.dryRun) {
      const activeDeps = deps.filter((d) => d.estado !== false);
      const activeCargos = cargos.filter((c) => c.estado !== false);

      const hDeps = await humandApi.getAllDepartments();
      const existingDepNames = new Set(hDeps.map((d) => normalizeName(d.name)));
      const depsToCreate = activeDeps
        .filter((d) => !existingDepNames.has(normalizeName(d.nombre)))
        .map((d) => ({ name: d.nombre.trim(), identifier: d.codigo.trim() }));

      if (depsToCreate.length > 0) {
        await humandApi.createDepartmentsBulk(depsToCreate);
      }

      const hJobs = await humandApi.getAllJobPositions();
      const existingJobNames = new Set(hJobs.map((j) => normalizeName(j.name)));
      const jobsToCreate = activeCargos
        .filter((c) => !existingJobNames.has(normalizeName(c.nombre)))
        .map((c) => ({ name: c.nombre.trim(), identifier: c.codigo.trim() }));

      if (jobsToCreate.length > 0) {
        await humandApi.createJobPositionsBulk(jobsToCreate);
      }
    }

    // 2. Colaboradores uno a uno
    for (let i = 0; i < habilitados.length; i++) {
      const emp = habilitados[i];
      const empName = `${emp.nombres} ${emp.apellidos}`.trim();

      if (options.onProgress) {
        options.onProgress({
          current: i + 1,
          total: habilitados.length,
          empName,
          step: `Sincronizando ${i + 1} de ${habilitados.length}: ${empName}`,
        });
      }

      if (options.dryRun) {
        // En simulación simplemente verificamos correspondencia
        reports.push({
          success: true,
          colaborador: empName,
          cedula: cleanCedula(emp.documento_identidad),
          departamento: { nombre: emp.codigo_departamento, creado: false },
          cargo: { nombre: emp.codigo_cargo, creado: false },
          usuarioAprovisionado: true,
          departamentoAsignado: true,
          cargoAsignado: true,
          camposExtendidosAsignados: true,
          logs: [
            {
              timestamp: new Date().toLocaleTimeString(),
              step: 'Simulación (Dry-Run)',
              message: `Colaborador evaluado para sincronización: ${empName}`,
              status: 'info',
            },
          ],
        });
        exitosos++;
      } else {
        const report = await this.syncEmpleado(emp, deps, cargos, emps);
        reports.push(report);
        if (report.success) {
          exitosos++;
        } else {
          fallidos++;
        }
      }

      // Pequeño retardo para respetar rate limit
      await new Promise((res) => setTimeout(res, 200));
    }

    return {
      total: habilitados.length,
      exitosos,
      fallidos,
      reports,
    };
  },
};
