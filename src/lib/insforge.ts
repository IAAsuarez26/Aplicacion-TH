import { createClient } from '@insforge/sdk';
import type {
  Empresa,
  TabuladorEmpresa,
  Cargo,
  Direccion,
  Gerencia,
  Departamento,
  Empleado,
  HistorialCargoDepartamento,
  OrganigramaRow,
  ResumenResponsable,
  SubordinadoRow,
  DashboardMetrics,
  PosicionSalarialEval,
} from './types';

// Credenciales desde variables de entorno
const baseUrl = import.meta.env.VITE_INSFORGE_URL || 'https://jj96rzs4.us-east.insforge.app';
const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY || 'anon_5a5f85153758df2568fcdfd16b5c70e958ba93aea7782df47d39f15f61aa5323';

export const insforge = createClient({
  baseUrl,
  anonKey,
});

// Helper de logs estructurados
const logDebug = (action: string, res: any) => {
  if (import.meta.env.DEV) {
    if (res?.error) {
      console.warn(`[InsForge API] ${action} Error:`, res.error);
    } else {
      console.log(`[InsForge API] ${action} Success:`, res?.data);
    }
  }
};

// ====================================================================================
// 0. API: EMPRESAS (Nivel Matriz / Compañías)
// ====================================================================================
export const empresasApi = {
  async getAll(): Promise<{ data: Empresa[]; error: any }> {
    try {
      const { data, error } = await insforge.database
        .from('empresas')
        .select('*')
        .order('codigo', { ascending: true });

      logDebug('empresas.getAll', { data, error });
      return { data: (data as Empresa[]) || [], error };
    } catch (err: any) {
      console.error('Error fetching empresas:', err);
      return { data: [], error: err };
    }
  },

  async create(empresa: Omit<Empresa, 'empresa_id' | 'created_at' | 'updated_at'>): Promise<{ data: Empresa | null; error: any }> {
    try {
      const { data, error } = await insforge.database
        .from('empresas')
        .insert([{
          codigo: empresa.codigo.trim().toUpperCase(),
          razon_social: empresa.razon_social.trim(),
          nombre_corto: empresa.nombre_corto?.trim() || null,
          rif: empresa.rif?.trim().toUpperCase() || null,
          direccion: empresa.direccion?.trim() || null,
          estado_region: empresa.estado_region?.trim() || null,
          localidad: empresa.localidad?.trim() || null,
          municipio: empresa.municipio?.trim() || null,
          ciudad: empresa.ciudad?.trim() || null,
          zona_postal: empresa.zona_postal?.trim() || null,
          fecha_registro: empresa.fecha_registro || null,
          fecha_fundacion: empresa.fecha_fundacion || null,
          rep_legal_ci: empresa.rep_legal_ci?.trim() || null,
          rep_legal_nombre: empresa.rep_legal_nombre?.trim() || null,
          rep_legal_nacionalidad: empresa.rep_legal_nacionalidad?.trim() || null,
          rep_legal_cargo: empresa.rep_legal_cargo?.trim() || null,
          activo: empresa.activo !== undefined ? empresa.activo : true,
        }])
        .select();

      logDebug('empresas.create', { data, error });
      return { data: data?.[0] as Empresa || null, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async update(empresa_id: number, empresa: Partial<Empresa>): Promise<{ data: Empresa | null; error: any }> {
    try {
      const payload: any = { ...empresa };
      delete payload.empresa_id;
      delete payload.created_at;
      delete payload.updated_at;

      if (payload.codigo) payload.codigo = payload.codigo.trim().toUpperCase();
      if (payload.razon_social) payload.razon_social = payload.razon_social.trim();
      if (payload.rif) payload.rif = payload.rif.trim().toUpperCase();

      const { data, error } = await insforge.database
        .from('empresas')
        .update(payload)
        .eq('empresa_id', empresa_id)
        .select();

      logDebug('empresas.update', { data, error });
      return { data: data?.[0] as Empresa || null, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async delete(empresa_id: number): Promise<{ success: boolean; error: any }> {
    try {
      const { error } = await insforge.database
        .from('empresas')
        .delete()
        .eq('empresa_id', empresa_id);

      logDebug('empresas.delete', { error });
      return { success: !error, error };
    } catch (err: any) {
      return { success: false, error: err };
    }
  },
};

// ====================================================================================
// 0.1 API: TABULADOR DE EMPRESAS (Bandas Salariales)
// ====================================================================================
export const tabuladorApi = {
  async getAll(empresa_id?: number): Promise<{ data: TabuladorEmpresa[]; error: any }> {
    try {
      let query = insforge.database
        .from('tabulador_empresas')
        .select('*')
        .order('codigo_empresa', { ascending: true })
        .order('codigo_banda', { ascending: true });

      if (empresa_id) {
        query = query.eq('empresa_id', empresa_id);
      }

      const { data, error } = await query;
      logDebug('tabulador.getAll', { data, error });
      return { data: (data as TabuladorEmpresa[]) || [], error };
    } catch (err: any) {
      console.error('Error fetching tabulador:', err);
      return { data: [], error: err };
    }
  },

  async getResumen(empresa_id?: number): Promise<{ data: TabuladorEmpresa[]; error: any }> {
    try {
      let query = insforge.database
        .from('vw_tabulador_empresas_resumen')
        .select('*')
        .order('codigo_empresa', { ascending: true })
        .order('codigo_banda', { ascending: true });

      if (empresa_id) {
        query = query.eq('empresa_id', empresa_id);
      }

      const { data, error } = await query;
      logDebug('tabulador.getResumen', { data, error });
      return { data: (data as TabuladorEmpresa[]) || [], error };
    } catch (err: any) {
      return { data: [], error: err };
    }
  },

  async create(banda: Omit<TabuladorEmpresa, 'tabulador_id' | 'created_at' | 'updated_at'>): Promise<{ data: TabuladorEmpresa | null; error: any }> {
    try {
      const { data, error } = await insforge.database
        .from('tabulador_empresas')
        .insert([{
          empresa_id: Number(banda.empresa_id),
          codigo_empresa: banda.codigo_empresa.trim(),
          codigo_banda: banda.codigo_banda.trim().toUpperCase(),
          cargos_referencia: banda.cargos_referencia.trim(),
          salario_minimo_80: Number(banda.salario_minimo_80),
          salario_medio_bajo_90: Number(banda.salario_medio_bajo_90),
          salario_mediana_100: Number(banda.salario_mediana_100),
          salario_medio_alto_110: Number(banda.salario_medio_alto_110),
          salario_maximo_120: Number(banda.salario_maximo_120),
          progresion: Number(banda.progresion || 0),
          activo: banda.activo !== undefined ? banda.activo : true,
        }])
        .select();

      logDebug('tabulador.create', { data, error });
      return { data: data?.[0] as TabuladorEmpresa || null, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async update(tabulador_id: number, banda: Partial<TabuladorEmpresa>): Promise<{ data: TabuladorEmpresa | null; error: any }> {
    try {
      const payload: any = { ...banda };
      delete payload.tabulador_id;
      delete payload.created_at;
      delete payload.updated_at;
      delete payload.empresa;
      delete payload.nombre_empresa;
      delete payload.razon_social;
      delete payload.amplitud_salarial;
      delete payload.porcentaje_amplitud;
      delete payload.porcentaje_progresion;

      if (payload.empresa_id) payload.empresa_id = Number(payload.empresa_id);
      if (payload.codigo_banda) payload.codigo_banda = payload.codigo_banda.trim().toUpperCase();
      if (payload.salario_minimo_80) payload.salario_minimo_80 = Number(payload.salario_minimo_80);
      if (payload.salario_medio_bajo_90) payload.salario_medio_bajo_90 = Number(payload.salario_medio_bajo_90);
      if (payload.salario_mediana_100) payload.salario_mediana_100 = Number(payload.salario_mediana_100);
      if (payload.salario_medio_alto_110) payload.salario_medio_alto_110 = Number(payload.salario_medio_alto_110);
      if (payload.salario_maximo_120) payload.salario_maximo_120 = Number(payload.salario_maximo_120);
      if (payload.progresion !== undefined) payload.progresion = Number(payload.progresion);

      const { data, error } = await insforge.database
        .from('tabulador_empresas')
        .update(payload)
        .eq('tabulador_id', tabulador_id)
        .select();

      logDebug('tabulador.update', { data, error });
      return { data: data?.[0] as TabuladorEmpresa || null, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async delete(tabulador_id: number): Promise<{ success: boolean; error: any }> {
    try {
      const { error } = await insforge.database
        .from('tabulador_empresas')
        .delete()
        .eq('tabulador_id', tabulador_id);

      logDebug('tabulador.delete', { error });
      return { success: !error, error };
    } catch (err: any) {
      return { success: false, error: err };
    }
  },

  async evaluarPosicion(codigo_empresa: string, codigo_banda: string, salario_actual: number): Promise<{ data: PosicionSalarialEval | null; error: any }> {
    try {
      const { data, error } = await insforge.database
        .rpc('fn_evaluar_posicion_salarial', {
          p_codigo_empresa: codigo_empresa,
          p_codigo_banda: codigo_banda,
          p_salario_actual: salario_actual,
        });

      return { data: data?.[0] as PosicionSalarialEval || null, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },
};

// ====================================================================================
// 1. API: CARGOS
// ====================================================================================
export const cargosApi = {
  async getAll(): Promise<{ data: Cargo[]; error: any }> {
    try {
      const { data, error } = await insforge.database
        .from('cargos')
        .select('*')
        .order('cargo_id', { ascending: true });

      logDebug('cargos.getAll', { data, error });
      return { data: (data as Cargo[]) || [], error };
    } catch (err: any) {
      console.error('Error fetching cargos:', err);
      return { data: [], error: err };
    }
  },

  async create(cargo: Omit<Cargo, 'cargo_id' | 'created_at' | 'updated_at'>): Promise<{ data: Cargo | null; error: any }> {
    try {
      const { data, error } = await insforge.database
        .from('cargos')
        .insert([{
          codigo: cargo.codigo.trim().toUpperCase(),
          nombre: cargo.nombre.trim(),
          descripcion: cargo.descripcion?.trim() || null,
          estado: cargo.estado !== undefined ? cargo.estado : true,
        }])
        .select();

      logDebug('cargos.create', { data, error });
      return { data: data?.[0] as Cargo || null, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async update(cargo_id: number, cargo: Partial<Cargo>): Promise<{ data: Cargo | null; error: any }> {
    try {
      const payload: any = { ...cargo };
      delete payload.cargo_id;
      delete payload.created_at;
      delete payload.updated_at;
      delete payload.total_empleados;

      if (payload.codigo) payload.codigo = payload.codigo.trim().toUpperCase();
      if (payload.nombre) payload.nombre = payload.nombre.trim();

      const { data, error } = await insforge.database
        .from('cargos')
        .update(payload)
        .eq('cargo_id', cargo_id)
        .select();

      logDebug('cargos.update', { data, error });
      return { data: data?.[0] as Cargo || null, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async delete(cargo_id: number): Promise<{ success: boolean; error: any }> {
    try {
      const { error } = await insforge.database
        .from('cargos')
        .delete()
        .eq('cargo_id', cargo_id);

      logDebug('cargos.delete', { error });
      return { success: !error, error };
    } catch (err: any) {
      return { success: false, error: err };
    }
  },
};

// ====================================================================================
// 2. API: DIRECCIONES (Nivel 1)
// ====================================================================================
export const direccionesApi = {
  async getAll(): Promise<{ data: Direccion[]; error: any }> {
    try {
      const { data, error } = await insforge.database
        .from('direcciones')
        .select('*')
        .order('direccion_id', { ascending: true });

      logDebug('direcciones.getAll', { data, error });
      return { data: (data as Direccion[]) || [], error };
    } catch (err: any) {
      return { data: [], error: err };
    }
  },

  async create(direccion: Omit<Direccion, 'direccion_id' | 'created_at' | 'updated_at'>): Promise<{ data: Direccion | null; error: any }> {
    try {
      const { data, error } = await insforge.database
        .from('direcciones')
        .insert([{
          empresa_id: direccion.empresa_id ? Number(direccion.empresa_id) : 1,
          codigo: direccion.codigo.trim().toUpperCase(),
          nombre: direccion.nombre.trim(),
          descripcion: direccion.descripcion?.trim() || null,
          director_id: direccion.director_id || null,
          estado: direccion.estado !== undefined ? direccion.estado : true,
        }])
        .select();

      logDebug('direcciones.create', { data, error });
      return { data: data?.[0] as Direccion || null, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async update(direccion_id: number, direccion: Partial<Direccion>): Promise<{ data: Direccion | null; error: any }> {
    try {
      const payload: any = { ...direccion };
      delete payload.direccion_id;
      delete payload.created_at;
      delete payload.updated_at;
      delete payload.empresa;
      delete payload.empresa_nombre;
      delete payload.director;
      delete payload.director_nombre;
      delete payload.total_gerencias;
      delete payload.total_empleados;

      if (payload.empresa_id) payload.empresa_id = Number(payload.empresa_id);
      if (payload.codigo) payload.codigo = payload.codigo.trim().toUpperCase();
      if (payload.nombre) payload.nombre = payload.nombre.trim();
      if (payload.director_id !== undefined) {
        payload.director_id = payload.director_id ? Number(payload.director_id) : null;
      }

      const { data, error } = await insforge.database
        .from('direcciones')
        .update(payload)
        .eq('direccion_id', direccion_id)
        .select();

      logDebug('direcciones.update', { data, error });
      return { data: data?.[0] as Direccion || null, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async delete(direccion_id: number): Promise<{ success: boolean; error: any }> {
    try {
      const { error } = await insforge.database
        .from('direcciones')
        .delete()
        .eq('direccion_id', direccion_id);

      logDebug('direcciones.delete', { error });
      return { success: !error, error };
    } catch (err: any) {
      return { success: false, error: err };
    }
  },
};

// ====================================================================================
// 3. API: GERENCIAS (Nivel 2)
// ====================================================================================
export const gerenciasApi = {
  async getAll(): Promise<{ data: Gerencia[]; error: any }> {
    try {
      const { data, error } = await insforge.database
        .from('gerencias')
        .select('*')
        .order('gerencia_id', { ascending: true });

      logDebug('gerencias.getAll', { data, error });
      return { data: (data as Gerencia[]) || [], error };
    } catch (err: any) {
      return { data: [], error: err };
    }
  },

  async create(gerencia: Omit<Gerencia, 'gerencia_id' | 'created_at' | 'updated_at'>): Promise<{ data: Gerencia | null; error: any }> {
    try {
      const { data, error } = await insforge.database
        .from('gerencias')
        .insert([{
          direccion_id: Number(gerencia.direccion_id),
          codigo: gerencia.codigo.trim().toUpperCase(),
          nombre: gerencia.nombre.trim(),
          descripcion: gerencia.descripcion?.trim() || null,
          gerente_id: gerencia.gerente_id || null,
          estado: gerencia.estado !== undefined ? gerencia.estado : true,
        }])
        .select();

      logDebug('gerencias.create', { data, error });
      return { data: data?.[0] as Gerencia || null, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async update(gerencia_id: number, gerencia: Partial<Gerencia>): Promise<{ data: Gerencia | null; error: any }> {
    try {
      const payload: any = { ...gerencia };
      delete payload.gerencia_id;
      delete payload.created_at;
      delete payload.updated_at;
      delete payload.direccion;
      delete payload.direccion_nombre;
      delete payload.gerente;
      delete payload.gerente_nombre;
      delete payload.total_departamentos;
      delete payload.total_empleados;

      if (payload.codigo) payload.codigo = payload.codigo.trim().toUpperCase();
      if (payload.nombre) payload.nombre = payload.nombre.trim();
      if (payload.direccion_id) payload.direccion_id = Number(payload.direccion_id);
      if (payload.gerente_id !== undefined) {
        payload.gerente_id = payload.gerente_id ? Number(payload.gerente_id) : null;
      }

      const { data, error } = await insforge.database
        .from('gerencias')
        .update(payload)
        .eq('gerencia_id', gerencia_id)
        .select();

      logDebug('gerencias.update', { data, error });
      return { data: data?.[0] as Gerencia || null, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async delete(gerencia_id: number): Promise<{ success: boolean; error: any }> {
    try {
      const { error } = await insforge.database
        .from('gerencias')
        .delete()
        .eq('gerencia_id', gerencia_id);

      logDebug('gerencias.delete', { error });
      return { success: !error, error };
    } catch (err: any) {
      return { success: false, error: err };
    }
  },
};

// ====================================================================================
// 4. API: DEPARTAMENTOS (Nivel 3)
// ====================================================================================
export const departamentosApi = {
  async getAll(): Promise<{ data: Departamento[]; error: any }> {
    try {
      const { data, error } = await insforge.database
        .from('departamentos')
        .select('*')
        .order('departamento_id', { ascending: true });

      logDebug('departamentos.getAll', { data, error });
      return { data: (data as Departamento[]) || [], error };
    } catch (err: any) {
      return { data: [], error: err };
    }
  },

  async create(departamento: Omit<Departamento, 'departamento_id' | 'created_at' | 'updated_at'>): Promise<{ data: Departamento | null; error: any }> {
    try {
      const { data, error } = await insforge.database
        .from('departamentos')
        .insert([{
          gerencia_id: Number(departamento.gerencia_id),
          codigo: departamento.codigo.trim().toUpperCase(),
          nombre: departamento.nombre.trim(),
          descripcion: departamento.descripcion?.trim() || null,
          jefe_departamento_id: departamento.jefe_departamento_id || null,
          estado: departamento.estado !== undefined ? departamento.estado : true,
        }])
        .select();

      logDebug('departamentos.create', { data, error });
      return { data: data?.[0] as Departamento || null, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async update(departamento_id: number, departamento: Partial<Departamento>): Promise<{ data: Departamento | null; error: any }> {
    try {
      const payload: any = { ...departamento };
      delete payload.departamento_id;
      delete payload.created_at;
      delete payload.updated_at;
      delete payload.gerencia;
      delete payload.gerencia_nombre;
      delete payload.direccion_nombre;
      delete payload.jefe_departamento;
      delete payload.jefe_nombre;
      delete payload.total_empleados;

      if (payload.codigo) payload.codigo = payload.codigo.trim().toUpperCase();
      if (payload.nombre) payload.nombre = payload.nombre.trim();
      if (payload.gerencia_id) payload.gerencia_id = Number(payload.gerencia_id);
      if (payload.jefe_departamento_id !== undefined) {
        payload.jefe_departamento_id = payload.jefe_departamento_id ? Number(payload.jefe_departamento_id) : null;
      }

      const { data, error } = await insforge.database
        .from('departamentos')
        .update(payload)
        .eq('departamento_id', departamento_id)
        .select();

      logDebug('departamentos.update', { data, error });
      return { data: data?.[0] as Departamento || null, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async delete(departamento_id: number): Promise<{ success: boolean; error: any }> {
    try {
      const { error } = await insforge.database
        .from('departamentos')
        .delete()
        .eq('departamento_id', departamento_id);

      logDebug('departamentos.delete', { error });
      return { success: !error, error };
    } catch (err: any) {
      return { success: false, error: err };
    }
  },
};

// ====================================================================================
// 5. API: EMPLEADOS (Ficha Maestra de Personal)
// ====================================================================================
export const empleadosApi = {
  async getAll(): Promise<{ data: Empleado[]; error: any }> {
    try {
      const { data, error } = await insforge.database
        .from('empleados')
        .select('*')
        .order('empleado_id', { ascending: true });

      logDebug('empleados.getAll', { data, error });
      return { data: (data as Empleado[]) || [], error };
    } catch (err: any) {
      return { data: [], error: err };
    }
  },

  async create(empleado: Omit<Empleado, 'empleado_id' | 'created_at' | 'updated_at'>): Promise<{ data: Empleado | null; error: any }> {
    try {
      const { data, error } = await insforge.database
        .from('empleados')
        .insert([{
          codigo_empleado: empleado.codigo_empleado.trim().toUpperCase(),
          documento_identidad: empleado.documento_identidad?.trim() || null,
          nombres: empleado.nombres.trim(),
          apellidos: empleado.apellidos.trim(),
          email: empleado.email.trim().toLowerCase(),
          telefono: empleado.telefono?.trim() || null,
          cargo_id: Number(empleado.cargo_id),
          departamento_id: Number(empleado.departamento_id),
          tabulador_id: empleado.tabulador_id ? Number(empleado.tabulador_id) : null,
          supervisor_directo_id: empleado.supervisor_directo_id ? Number(empleado.supervisor_directo_id) : null,
          evaluador_id: empleado.evaluador_id ? Number(empleado.evaluador_id) : null,
          fecha_ingreso: empleado.fecha_ingreso,
          estado_laboral: empleado.estado_laboral || 'ACTIVO',
        }])
        .select();

      logDebug('empleados.create', { data, error });
      return { data: data?.[0] as Empleado || null, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async update(empleado_id: number, empleado: Partial<Empleado>): Promise<{ data: Empleado | null; error: any }> {
    try {
      const payload: any = { ...empleado };
      delete payload.empleado_id;
      delete payload.created_at;
      delete payload.updated_at;
      delete payload.cargo;
      delete payload.departamento;
      delete payload.tabulador;
      delete payload.supervisor_directo;
      delete payload.evaluador;
      delete payload.nombre_completo;

      if (payload.codigo_empleado) payload.codigo_empleado = payload.codigo_empleado.trim().toUpperCase();
      if (payload.email) payload.email = payload.email.trim().toLowerCase();
      if (payload.nombres) payload.nombres = payload.nombres.trim();
      if (payload.apellidos) payload.apellidos = payload.apellidos.trim();
      if (payload.cargo_id) payload.cargo_id = Number(payload.cargo_id);
      if (payload.departamento_id) payload.departamento_id = Number(payload.departamento_id);
      if (payload.tabulador_id !== undefined) {
        payload.tabulador_id = payload.tabulador_id ? Number(payload.tabulador_id) : null;
      }
      if (payload.supervisor_directo_id !== undefined) {
        payload.supervisor_directo_id = payload.supervisor_directo_id ? Number(payload.supervisor_directo_id) : null;
      }
      if (payload.evaluador_id !== undefined) {
        payload.evaluador_id = payload.evaluador_id ? Number(payload.evaluador_id) : null;
      }

      const { data, error } = await insforge.database
        .from('empleados')
        .update(payload)
        .eq('empleado_id', empleado_id)
        .select();

      logDebug('empleados.update', { data, error });
      return { data: data?.[0] as Empleado || null, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async delete(empleado_id: number): Promise<{ success: boolean; error: any }> {
    try {
      const { error } = await insforge.database
        .from('empleados')
        .delete()
        .eq('empleado_id', empleado_id);

      logDebug('empleados.delete', { error });
      return { success: !error, error };
    } catch (err: any) {
      return { success: false, error: err };
    }
  },
};

// ====================================================================================
// 6. API: HISTORIAL DE TRASLADOS Y ASCENSOS
// ====================================================================================
export const historialApi = {
  async getAll(): Promise<{ data: HistorialCargoDepartamento[]; error: any }> {
    try {
      const { data, error } = await insforge.database
        .from('historial_cargos_departamentos')
        .select('*')
        .order('fecha_inicio', { ascending: false });

      logDebug('historial.getAll', { data, error });
      return { data: (data as HistorialCargoDepartamento[]) || [], error };
    } catch (err: any) {
      return { data: [], error: err };
    }
  },

  async create(item: Omit<HistorialCargoDepartamento, 'historial_id' | 'created_at'>): Promise<{ data: HistorialCargoDepartamento | null; error: any }> {
    try {
      const { data, error } = await insforge.database
        .from('historial_cargos_departamentos')
        .insert([{
          empleado_id: Number(item.empleado_id),
          cargo_id: Number(item.cargo_id),
          departamento_id: Number(item.departamento_id),
          fecha_inicio: item.fecha_inicio,
          fecha_fin: item.fecha_fin || null,
          motivo_cambio: item.motivo_cambio?.trim() || null,
        }])
        .select();

      logDebug('historial.create', { data, error });
      return { data: data?.[0] as HistorialCargoDepartamento || null, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async update(historial_id: number, item: Partial<HistorialCargoDepartamento>): Promise<{ data: HistorialCargoDepartamento | null; error: any }> {
    try {
      const payload: any = { ...item };
      delete payload.historial_id;
      delete payload.created_at;
      delete payload.empleado;
      delete payload.cargo;
      delete payload.departamento;

      const { data, error } = await insforge.database
        .from('historial_cargos_departamentos')
        .update(payload)
        .eq('historial_id', historial_id)
        .select();

      logDebug('historial.update', { data, error });
      return { data: data?.[0] as HistorialCargoDepartamento || null, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async delete(historial_id: number): Promise<{ success: boolean; error: any }> {
    try {
      const { error } = await insforge.database
        .from('historial_cargos_departamentos')
        .delete()
        .eq('historial_id', historial_id);

      logDebug('historial.delete', { error });
      return { success: !error, error };
    } catch (err: any) {
      return { success: false, error: err };
    }
  },
};

// ====================================================================================
// 7. API: VISTAS Y FUNCIONES (Organigrama, Resumen, Subordinados)
// ====================================================================================
export const organigramaApi = {
  async getOrganigramaCompleto(): Promise<{ data: OrganigramaRow[]; error: any }> {
    try {
      const { data, error } = await insforge.database
        .from('vw_organigrama_completo')
        .select('*');

      logDebug('organigrama.getOrganigramaCompleto', { data, error });
      return { data: (data as OrganigramaRow[]) || [], error };
    } catch (err: any) {
      return { data: [], error: err };
    }
  },

  async getResumenResponsables(): Promise<{ data: ResumenResponsable[]; error: any }> {
    try {
      const { data, error } = await insforge.database
        .from('vw_resumen_responsables_area')
        .select('*');

      logDebug('organigrama.getResumenResponsables', { data, error });
      return { data: (data as ResumenResponsable[]) || [], error };
    } catch (err: any) {
      return { data: [], error: err };
    }
  },

  async getSubordinados(supervisor_id: number): Promise<{ data: SubordinadoRow[]; error: any }> {
    try {
      const { data, error } = await insforge.database
        .rpc('sp_obtener_subordinados', { p_supervisor_id: supervisor_id });

      logDebug('organigrama.getSubordinados', { data, error });
      return { data: (data as SubordinadoRow[]) || [], error };
    } catch (err: any) {
      return { data: [], error: err };
    }
  },
};

// ====================================================================================
// 8. API: DASHBOARD METRICS
// ====================================================================================
export const dashboardApi = {
  async getMetrics(): Promise<DashboardMetrics> {
    try {
      const [
        { data: empresas },
        { data: tabuladores },
        { data: empleados },
        { data: direcciones },
        { data: gerencias },
        { data: departamentos },
        { data: cargos },
      ] = await Promise.all([
        empresasApi.getAll(),
        tabuladorApi.getAll(),
        empleadosApi.getAll(),
        direccionesApi.getAll(),
        gerenciasApi.getAll(),
        departamentosApi.getAll(),
        cargosApi.getAll(),
      ]);

      const totalEmpresas = empresas?.length || 0;
      const totalBandasTabulador = tabuladores?.length || 0;
      const totalEmpleados = empleados?.length || 0;
      const empleadosActivos = empleados?.filter(e => e.estado_laboral === 'ACTIVO').length || 0;
      const empleadosVacaciones = empleados?.filter(e => e.estado_laboral === 'VACACIONES').length || 0;
      const totalDirecciones = direcciones?.length || 0;
      const totalGerencias = gerencias?.length || 0;
      const totalDepartamentos = departamentos?.length || 0;
      const totalCargos = cargos?.length || 0;

      const unassignedDirs = direcciones?.filter(d => !d.director_id).length || 0;
      const unassignedGers = gerencias?.filter(g => !g.gerente_id).length || 0;
      const unassignedDeps = departamentos?.filter(dep => !dep.jefe_departamento_id).length || 0;

      return {
        totalEmpresas,
        totalBandasTabulador,
        totalEmpleados,
        empleadosActivos,
        empleadosVacaciones,
        totalDirecciones,
        totalGerencias,
        totalDepartamentos,
        totalCargos,
        responsablesSinAsignar: unassignedDirs + unassignedGers + unassignedDeps,
      };
    } catch (err) {
      console.error('Error computing dashboard metrics:', err);
      return {
        totalEmpresas: 0,
        totalBandasTabulador: 0,
        totalEmpleados: 0,
        empleadosActivos: 0,
        empleadosVacaciones: 0,
        totalDirecciones: 0,
        totalGerencias: 0,
        totalDepartamentos: 0,
        totalCargos: 0,
        responsablesSinAsignar: 0,
      };
    }
  },
};
