import { createClient } from '@insforge/sdk';
import type {
  TipoCosto,
  CentroCosto,
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
          codigo: empresa.codigo.trim(),
          razon_social: empresa.razon_social.trim(),
          nombre_corto: empresa.nombre_corto?.trim() || null,
          rif: empresa.rif?.trim() || null,
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

      if (payload.codigo) payload.codigo = payload.codigo.trim();
      if (payload.razon_social) payload.razon_social = payload.razon_social.trim();
      if (payload.rif) payload.rif = payload.rif.trim();

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
          codigo_banda: banda.codigo_banda.trim(),
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
      if (payload.codigo_banda) payload.codigo_banda = payload.codigo_banda.trim();
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
// 0.2 API: TIPOS DE COSTOS (MOD, MOI, Gastos)
// ====================================================================================
export const tipoCostosApi = {
  async getAll(): Promise<{ data: TipoCosto[]; error: any }> {
    try {
      const { data, error } = await insforge.database
        .from('tipo_costos')
        .select('*')
        .order('codigo_tc', { ascending: true });

      logDebug('tipoCostos.getAll', { data, error });
      return { data: (data as TipoCosto[]) || [], error };
    } catch (err: any) {
      console.error('Error fetching tipo_costos:', err);
      return { data: [], error: err };
    }
  },

  async getById(tipo_costo_id: number): Promise<{ data: TipoCosto | null; error: any }> {
    try {
      const { data, error } = await insforge.database
        .from('tipo_costos')
        .select('*')
        .eq('tipo_costo_id', tipo_costo_id)
        .single();

      return { data: (data as TipoCosto) || null, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async create(tipoCosto: Omit<TipoCosto, 'tipo_costo_id' | 'created_at' | 'updated_at'>): Promise<{ data: TipoCosto | null; error: any }> {
    try {
      const { data, error } = await insforge.database
        .from('tipo_costos')
        .insert([{
          codigo_tc: tipoCosto.codigo_tc.trim(),
          nombre: tipoCosto.nombre.trim(),
          descripcion: tipoCosto.descripcion?.trim() || null,
          activo: tipoCosto.activo !== undefined ? tipoCosto.activo : true,
        }])
        .select();

      logDebug('tipoCostos.create', { data, error });
      return { data: data?.[0] as TipoCosto || null, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async update(tipo_costo_id: number, tipoCosto: Partial<TipoCosto>): Promise<{ data: TipoCosto | null; error: any }> {
    try {
      const payload: any = { ...tipoCosto };
      delete payload.tipo_costo_id;
      delete payload.created_at;
      delete payload.updated_at;

      if (payload.codigo_tc) payload.codigo_tc = payload.codigo_tc.trim();
      if (payload.nombre) payload.nombre = payload.nombre.trim();
      if (payload.descripcion !== undefined) payload.descripcion = payload.descripcion ? payload.descripcion.trim() : null;

      const { data, error } = await insforge.database
        .from('tipo_costos')
        .update(payload)
        .eq('tipo_costo_id', tipo_costo_id)
        .select();

      logDebug('tipoCostos.update', { data, error });
      return { data: data?.[0] as TipoCosto || null, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async delete(tipo_costo_id: number): Promise<{ success: boolean; error: any }> {
    try {
      const { error } = await insforge.database
        .from('tipo_costos')
        .delete()
        .eq('tipo_costo_id', tipo_costo_id);

      logDebug('tipoCostos.delete', { error });
      return { success: !error, error };
    } catch (err: any) {
      return { success: false, error: err };
    }
  },
};

// ====================================================================================
// 0.3 API: CENTROS DE COSTOS
// ====================================================================================
export const centrosCostosApi = {
  async getAll(): Promise<{ data: CentroCosto[]; error: any }> {
    try {
      const { data, error } = await insforge.database
        .from('centros_costos')
        .select('*')
        .order('codigo_cc', { ascending: true });

      logDebug('centrosCostos.getAll', { data, error });
      return { data: (data as CentroCosto[]) || [], error };
    } catch (err: any) {
      console.error('Error fetching centros_costos:', err);
      return { data: [], error: err };
    }
  },

  async getById(centro_costo_id: number): Promise<{ data: CentroCosto | null; error: any }> {
    try {
      const { data, error } = await insforge.database
        .from('centros_costos')
        .select('*')
        .eq('centro_costo_id', centro_costo_id)
        .single();

      return { data: (data as CentroCosto) || null, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async create(centroCosto: Omit<CentroCosto, 'centro_costo_id' | 'created_at' | 'updated_at'>): Promise<{ data: CentroCosto | null; error: any }> {
    try {
      const { data, error } = await insforge.database
        .from('centros_costos')
        .insert([{
          codigo_cc: centroCosto.codigo_cc.trim(),
          descripcion: centroCosto.descripcion.trim(),
          activo: centroCosto.activo !== undefined ? centroCosto.activo : true,
        }])
        .select();

      logDebug('centrosCostos.create', { data, error });
      return { data: data?.[0] as CentroCosto || null, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async update(centro_costo_id: number, centroCosto: Partial<CentroCosto>): Promise<{ data: CentroCosto | null; error: any }> {
    try {
      const payload: any = { ...centroCosto };
      delete payload.centro_costo_id;
      delete payload.created_at;
      delete payload.updated_at;

      if (payload.codigo_cc) payload.codigo_cc = payload.codigo_cc.trim();
      if (payload.descripcion) payload.descripcion = payload.descripcion.trim();

      const { data, error } = await insforge.database
        .from('centros_costos')
        .update(payload)
        .eq('centro_costo_id', centro_costo_id)
        .select();

      logDebug('centrosCostos.update', { data, error });
      return { data: data?.[0] as CentroCosto || null, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async delete(centro_costo_id: number): Promise<{ success: boolean; error: any }> {
    try {
      const { error } = await insforge.database
        .from('centros_costos')
        .delete()
        .eq('centro_costo_id', centro_costo_id);

      logDebug('centrosCostos.delete', { error });
      return { success: !error, error };
    } catch (err: any) {
      return { success: false, error: err };
    }
  },
};

// Helper para formato consistente de código de Cargo (Cargo-XXXX)
export const formatCargoCodigo = (input: string | number | undefined | null): string => {
  if (!input) return '';
  const str = String(input).trim();
  const match = str.match(/^(?:cargo[-\s]?)?(\d+)$/i);
  if (match) {
    return `Cargo-${match[1].padStart(4, '0')}`;
  }
  if (/^cargo-/i.test(str)) {
    return `Cargo-${str.slice(6)}`;
  }
  return str;
};

// Helper para formato consistente de código de Dirección (Dir-XXXX)
export const formatDireccionCodigo = (input: string | number | undefined | null): string => {
  if (!input) return '';
  const str = String(input).trim();
  const match = str.match(/^(?:dir[-\s]?)?(\d+)$/i);
  if (match) {
    return `Dir-${match[1].padStart(4, '0')}`;
  }
  if (/^dir-/i.test(str)) {
    return `Dir-${str.slice(4)}`;
  }
  return str;
};

// Helper para formato consistente de código de Gerencia (Ger-XXXX)
export const formatGerenciaCodigo = (input: string | number | undefined | null): string => {
  if (!input) return '';
  const str = String(input).trim();
  const match = str.match(/^(?:ger[-\s]?)?(\d+)$/i);
  if (match) {
    return `Ger-${match[1].padStart(4, '0')}`;
  }
  if (/^ger-/i.test(str)) {
    return `Ger-${str.slice(4)}`;
  }
  return str;
};

// Helper para formato consistente de código de Departamento (Dep-XXXX)
export const formatDepartamentoCodigo = (input: string | number | undefined | null): string => {
  if (!input) return '';
  const str = String(input).trim();
  const match = str.match(/^(?:dep[-\s]?)?(\d+)$/i);
  if (match) {
    return `Dep-${match[1].padStart(4, '0')}`;
  }
  if (/^dep-/i.test(str)) {
    return `Dep-${str.slice(4)}`;
  }
  return str;
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

      const normalizedData = ((data as Cargo[]) || []).map((c) => ({
        ...c,
        codigo: formatCargoCodigo(c.codigo),
      }));

      // Sincronizar en segundo plano registros existentes con formato en mayúsculas
      if (data && data.length > 0) {
        data.forEach((c: any) => {
          const formatted = formatCargoCodigo(c.codigo);
          if (c.codigo && c.codigo !== formatted) {
            insforge.database
              .from('cargos')
              .update({ codigo: formatted })
              .eq('cargo_id', c.cargo_id)
              .then(() => {});
          }
        });
      }

      return { data: normalizedData, error };
    } catch (err: any) {
      console.error('Error fetching cargos:', err);
      return { data: [], error: err };
    }
  },

  async create(cargo: Omit<Cargo, 'cargo_id' | 'created_at' | 'updated_at'> & { cargo_id?: number }): Promise<{ data: Cargo | null; error: any }> {
    try {
      let finalCodigo = formatCargoCodigo(cargo.codigo);

      // Si no viene código o está vacío, determinar el consecutivo a partir del código más alto
      if (!finalCodigo) {
        const { data: allCargos } = await insforge.database
          .from('cargos')
          .select('codigo');

        let maxCodeNum = 0;
        if (allCargos && allCargos.length > 0) {
          for (const c of allCargos) {
            const match = c.codigo?.match(/\d+/);
            if (match) {
              const num = parseInt(match[0], 10);
              if (!isNaN(num) && num > maxCodeNum) {
                maxCodeNum = num;
              }
            }
          }
        }
        const nextNum = maxCodeNum + 1;
        finalCodigo = `Cargo-${String(nextNum).padStart(4, '0')}`;
      }

      const insertPayload: any = {
        codigo: finalCodigo,
        nombre: cargo.nombre.trim(),
        descripcion: cargo.descripcion?.trim() || null,
        estado: cargo.estado !== undefined ? cargo.estado : true,
      };

      if (cargo.cargo_id) {
        insertPayload.cargo_id = Number(cargo.cargo_id);
      } else {
        const match = finalCodigo.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (!isNaN(num) && num > 0) {
            insertPayload.cargo_id = num;
          }
        }
      }

      const { data, error } = await insforge.database
        .from('cargos')
        .insert([insertPayload])
        .select();

      logDebug('cargos.create', { data, error });
      const created = (data?.[0] as Cargo) || null;
      if (created) {
        created.codigo = formatCargoCodigo(created.codigo);
      }
      return { data: created, error };
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

      if (payload.codigo) payload.codigo = formatCargoCodigo(payload.codigo);
      if (payload.nombre) payload.nombre = payload.nombre.trim();

      const { data, error } = await insforge.database
        .from('cargos')
        .update(payload)
        .eq('cargo_id', cargo_id)
        .select();

      logDebug('cargos.update', { data, error });
      const updated = (data?.[0] as Cargo) || null;
      if (updated) {
        updated.codigo = formatCargoCodigo(updated.codigo);
      }
      return { data: updated, error };
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

      const normalizedData = ((data as Direccion[]) || []).map((d) => ({
        ...d,
        codigo: formatDireccionCodigo(d.codigo),
      }));

      // Sincronizar en segundo plano registros con formato inconsistente
      if (data && data.length > 0) {
        data.forEach((d: any) => {
          const formatted = formatDireccionCodigo(d.codigo);
          if (d.codigo && d.codigo !== formatted) {
            insforge.database
              .from('direcciones')
              .update({ codigo: formatted })
              .eq('direccion_id', d.direccion_id)
              .then(() => {});
          }
        });
      }

      return { data: normalizedData, error };
    } catch (err: any) {
      return { data: [], error: err };
    }
  },

  async create(direccion: Omit<Direccion, 'direccion_id' | 'created_at' | 'updated_at'> & { direccion_id?: number }): Promise<{ data: Direccion | null; error: any }> {
    try {
      const finalCodigo = formatDireccionCodigo(direccion.codigo) || direccion.codigo.trim();
      const insertPayload: any = {
        empresa_id: direccion.empresa_id ? Number(direccion.empresa_id) : 1,
        codigo: finalCodigo,
        nombre: direccion.nombre.trim(),
        descripcion: direccion.descripcion?.trim() || null,
        director_id: direccion.director_id || null,
        estado: direccion.estado !== undefined ? direccion.estado : true,
      };

      if (direccion.direccion_id) {
        insertPayload.direccion_id = Number(direccion.direccion_id);
      } else {
        const match = finalCodigo.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (!isNaN(num) && num > 0) {
            insertPayload.direccion_id = num;
          }
        }
      }

      const { data, error } = await insforge.database
        .from('direcciones')
        .insert([insertPayload])
        .select();

      logDebug('direcciones.create', { data, error });
      const created = (data?.[0] as Direccion) || null;
      if (created) {
        created.codigo = formatDireccionCodigo(created.codigo);
      }
      return { data: created, error };
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
      if (payload.codigo) payload.codigo = formatDireccionCodigo(payload.codigo) || payload.codigo.trim();
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
      const updated = (data?.[0] as Direccion) || null;
      if (updated) {
        updated.codigo = formatDireccionCodigo(updated.codigo);
      }
      return { data: updated, error };
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

      const normalizedData = ((data as Gerencia[]) || []).map((g) => ({
        ...g,
        codigo: formatGerenciaCodigo(g.codigo),
      }));

      // Sincronizar y auto-corregir registros con formato en mayúsculas (ej. GER-0024 -> Ger-0024)
      if (data && data.length > 0) {
        data.forEach((g: any) => {
          const formatted = formatGerenciaCodigo(g.codigo);
          if (g.codigo && g.codigo !== formatted) {
            insforge.database
              .from('gerencias')
              .update({ codigo: formatted })
              .eq('gerencia_id', g.gerencia_id)
              .then(() => {});
          }
        });
      }

      return { data: normalizedData, error };
    } catch (err: any) {
      return { data: [], error: err };
    }
  },

  async create(gerencia: Omit<Gerencia, 'gerencia_id' | 'created_at' | 'updated_at'> & { gerencia_id?: number }): Promise<{ data: Gerencia | null; error: any }> {
    try {
      const finalCodigo = formatGerenciaCodigo(gerencia.codigo) || gerencia.codigo.trim();
      const insertPayload: any = {
        codigo_direccion: gerencia.codigo_direccion ? gerencia.codigo_direccion.trim() : null,
        codigo: finalCodigo,
        nombre: gerencia.nombre.trim(),
        descripcion: gerencia.descripcion?.trim() || null,
        gerente_id: gerencia.gerente_id || null,
        estado: gerencia.estado !== undefined ? gerencia.estado : true,
      };

      if (gerencia.gerencia_id) {
        insertPayload.gerencia_id = Number(gerencia.gerencia_id);
      } else {
        const match = finalCodigo.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (!isNaN(num) && num > 0) {
            insertPayload.gerencia_id = num;
          }
        }
      }

      const { data, error } = await insforge.database
        .from('gerencias')
        .insert([insertPayload])
        .select();

      logDebug('gerencias.create', { data, error });
      const created = (data?.[0] as Gerencia) || null;
      if (created) {
        created.codigo = formatGerenciaCodigo(created.codigo);
      }
      return { data: created, error };
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

      if (payload.codigo) payload.codigo = formatGerenciaCodigo(payload.codigo) || payload.codigo.trim();
      if (payload.nombre) payload.nombre = payload.nombre.trim();
      if (payload.codigo_direccion !== undefined) {
        payload.codigo_direccion = payload.codigo_direccion ? payload.codigo_direccion.trim() : null;
      }
      if (payload.gerente_id !== undefined) {
        payload.gerente_id = payload.gerente_id ? Number(payload.gerente_id) : null;
      }

      const { data, error } = await insforge.database
        .from('gerencias')
        .update(payload)
        .eq('gerencia_id', gerencia_id)
        .select();

      logDebug('gerencias.update', { data, error });
      const updated = (data?.[0] as Gerencia) || null;
      if (updated) {
        updated.codigo = formatGerenciaCodigo(updated.codigo);
      }
      return { data: updated, error };
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

      const normalizedData = ((data as Departamento[]) || []).map((dep) => ({
        ...dep,
        codigo: formatDepartamentoCodigo(dep.codigo),
      }));

      // Sincronizar en segundo plano registros con formato inconsistente
      if (data && data.length > 0) {
        data.forEach((dep: any) => {
          const formatted = formatDepartamentoCodigo(dep.codigo);
          if (dep.codigo && dep.codigo !== formatted) {
            insforge.database
              .from('departamentos')
              .update({ codigo: formatted })
              .eq('departamento_id', dep.departamento_id)
              .then(() => {});
          }
        });
      }

      return { data: normalizedData, error };
    } catch (err: any) {
      return { data: [], error: err };
    }
  },

  async create(departamento: Omit<Departamento, 'departamento_id' | 'created_at' | 'updated_at'> & { departamento_id?: number }): Promise<{ data: Departamento | null; error: any }> {
    try {
      const finalCodigo = formatDepartamentoCodigo(departamento.codigo) || departamento.codigo.trim();
      const insertPayload: any = {
        codigo_gerencia: departamento.codigo_gerencia ? departamento.codigo_gerencia.trim() : null,
        codigo_cc: departamento.codigo_cc ? departamento.codigo_cc.trim() : null,
        codigo: finalCodigo,
        nombre: departamento.nombre.trim(),
        descripcion: departamento.descripcion?.trim() || null,
        jefe_departamento_id: departamento.jefe_departamento_id || null,
        estado: departamento.estado !== undefined ? departamento.estado : true,
      };

      if (departamento.departamento_id) {
        insertPayload.departamento_id = Number(departamento.departamento_id);
      } else {
        const match = finalCodigo.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (!isNaN(num) && num > 0) {
            insertPayload.departamento_id = num;
          }
        }
      }

      const { data, error } = await insforge.database
        .from('departamentos')
        .insert([insertPayload])
        .select();

      logDebug('departamentos.create', { data, error });
      const created = (data?.[0] as Departamento) || null;
      if (created) {
        created.codigo = formatDepartamentoCodigo(created.codigo);
      }
      return { data: created, error };
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
      delete payload.centro_costo;
      delete payload.centro_costo_descripcion;
      delete payload.jefe_departamento;
      delete payload.jefe_nombre;
      delete payload.total_empleados;

      if (payload.codigo) payload.codigo = formatDepartamentoCodigo(payload.codigo) || payload.codigo.trim();
      if (payload.nombre) payload.nombre = payload.nombre.trim();
      if (payload.codigo_gerencia !== undefined) {
        payload.codigo_gerencia = payload.codigo_gerencia ? payload.codigo_gerencia.trim() : null;
      }
      if (payload.codigo_cc !== undefined) {
        payload.codigo_cc = payload.codigo_cc ? payload.codigo_cc.trim() : null;
      }
      if (payload.jefe_departamento_id !== undefined) {
        payload.jefe_departamento_id = payload.jefe_departamento_id ? Number(payload.jefe_departamento_id) : null;
      }

      const { data, error } = await insforge.database
        .from('departamentos')
        .update(payload)
        .eq('departamento_id', departamento_id)
        .select();

      logDebug('departamentos.update', { data, error });
      const updated = (data?.[0] as Departamento) || null;
      if (updated) {
        updated.codigo = formatDepartamentoCodigo(updated.codigo);
      }
      return { data: updated, error };
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
        .order('nombres', { ascending: true });

      logDebug('empleados.getAll', { data, error });
      return { data: (data as Empleado[]) || [], error };
    } catch (err: any) {
      return { data: [], error: err };
    }
  },

  async create(empleado: Omit<Empleado, 'empleado_id' | 'created_at' | 'updated_at'> & { empleado_id?: number }): Promise<{ data: Empleado | null; error: any }> {
    try {
      const insertPayload: any = {
        codigo_empleado: empleado.codigo_empleado.trim(),
        documento_identidad: empleado.documento_identidad?.trim() || null,
        nombres: empleado.nombres.trim(),
        apellidos: empleado.apellidos.trim(),
        email: empleado.email.trim().toLowerCase(),
        email_corporativo: empleado.email_corporativo?.trim().toLowerCase() || null,
        telefono: empleado.telefono?.trim() || null,
        codigo_cargo: empleado.codigo_cargo.trim(),
        codigo_departamento: empleado.codigo_departamento.trim(),
        codigo_tc: empleado.codigo_tc ? empleado.codigo_tc.trim() : null,
        tabulador_id: empleado.tabulador_id ? Number(empleado.tabulador_id) : null,
        supervisor_directo_id: empleado.supervisor_directo_id ? Number(empleado.supervisor_directo_id) : null,
        evaluador_id: empleado.evaluador_id ? Number(empleado.evaluador_id) : null,
        fecha_ingreso: empleado.fecha_ingreso,
        estado_laboral: empleado.estado_laboral || 'ACTIVO',
      };

      if (empleado.empleado_id) {
        insertPayload.empleado_id = Number(empleado.empleado_id);
      } else {
        const match = empleado.codigo_empleado.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (!isNaN(num) && num > 0) {
            insertPayload.empleado_id = num;
          }
        }
      }

      const { data, error } = await insforge.database
        .from('empleados')
        .insert([insertPayload])
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
      delete payload.tipo_costo;
      delete payload.tipo_costo_descripcion;
      delete payload.tabulador;
      delete payload.supervisor_directo;
      delete payload.evaluador;
      delete payload.nombre_completo;

      if (payload.codigo_empleado) payload.codigo_empleado = payload.codigo_empleado.trim();
      if (payload.email) payload.email = payload.email.trim().toLowerCase();
      if (payload.email_corporativo !== undefined) {
        payload.email_corporativo = payload.email_corporativo ? payload.email_corporativo.trim().toLowerCase() : null;
      }
      if (payload.nombres) payload.nombres = payload.nombres.trim();
      if (payload.apellidos) payload.apellidos = payload.apellidos.trim();
      if (payload.codigo_cargo) payload.codigo_cargo = payload.codigo_cargo.trim();
      if (payload.codigo_departamento) payload.codigo_departamento = payload.codigo_departamento.trim();
      if (payload.codigo_tc !== undefined) {
        payload.codigo_tc = payload.codigo_tc ? payload.codigo_tc.trim() : null;
      }
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
