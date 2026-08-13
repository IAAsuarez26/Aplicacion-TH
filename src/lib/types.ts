// Tipos e Interfaces del Sistema de Gestión de Talento Humano (TH)

export type EstadoLaboral = 'ACTIVO' | 'INACTIVO' | 'VACACIONES' | 'LICENCIA';

export interface Cargo {
  cargo_id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  estado: boolean;
  created_at: string;
  updated_at: string;
  // Conteo auxiliar
  total_empleados?: number;
}

export interface Direccion {
  direccion_id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  director_id: number | null;
  estado: boolean;
  created_at: string;
  updated_at: string;
  // Relaciones
  director?: Empleado | null;
  director_nombre?: string | null;
  total_gerencias?: number;
  total_empleados?: number;
}

export interface Gerencia {
  gerencia_id: number;
  direccion_id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  gerente_id: number | null;
  estado: boolean;
  created_at: string;
  updated_at: string;
  // Relaciones
  direccion?: Direccion;
  direccion_nombre?: string;
  gerente?: Empleado | null;
  gerente_nombre?: string | null;
  total_departamentos?: number;
  total_empleados?: number;
}

export interface Departamento {
  departamento_id: number;
  gerencia_id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  jefe_departamento_id: number | null;
  estado: boolean;
  created_at: string;
  updated_at: string;
  // Relaciones
  gerencia?: Gerencia;
  gerencia_nombre?: string;
  direccion_nombre?: string;
  jefe_departamento?: Empleado | null;
  jefe_nombre?: string | null;
  total_empleados?: number;
}

export interface Empleado {
  empleado_id: number;
  codigo_empleado: string;
  documento_identidad: string | null;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string | null;
  cargo_id: number;
  departamento_id: number;
  supervisor_directo_id: number | null;
  evaluador_id: number | null;
  fecha_ingreso: string;
  estado_laboral: EstadoLaboral;
  created_at: string;
  updated_at: string;
  // Relaciones pobladas
  cargo?: Cargo;
  departamento?: Departamento;
  supervisor_directo?: Empleado | null;
  evaluador?: Empleado | null;
  // Helper computado
  nombre_completo?: string;
}

export interface HistorialCargoDepartamento {
  historial_id: number;
  empleado_id: number;
  cargo_id: number;
  departamento_id: number;
  fecha_inicio: string;
  fecha_fin: string | null;
  motivo_cambio: string | null;
  created_at: string;
  // Relaciones pobladas
  empleado?: Empleado;
  empleado_nombre?: string;
  cargo?: Cargo;
  cargo_nombre?: string;
  departamento?: Departamento;
  departamento_nombre?: string;
}

export interface OrganigramaRow {
  empleado_id: number;
  codigo_empleado: string;
  documento_identidad: string | null;
  nombre_completo_empleado: string;
  email_empleado: string;
  telefono_empleado: string | null;
  estado_laboral: EstadoLaboral | string;
  fecha_ingreso: string;
  cargo_id: number;
  cargo_nombre: string;
  departamento_id: number;
  departamento_codigo: string;
  departamento_nombre: string;
  jefe_departamento_id: number | null;
  jefe_departamento_nombre: string | null;
  gerencia_id: number;
  gerencia_codigo: string;
  gerencia_nombre: string;
  gerente_id: number | null;
  gerente_area_nombre: string | null;
  direccion_id: number;
  direccion_codigo: string;
  direccion_nombre: string;
  director_id: number | null;
  director_ejecutivo_nombre: string | null;
  supervisor_directo_id: number | null;
  supervisor_directo_nombre: string | null;
  supervisor_directo_email: string | null;
  evaluador_id: number | null;
  evaluador_especifico_nombre: string | null;
  evaluador_especifico_email: string | null;
  evaluador_efectivo_nombre: string | null;
  evaluador_efectivo_email: string | null;
  tipo_evaluador: 'EVALUADOR_ESPECIAL' | 'SUPERVISOR_DIRECTO';
}

export interface ResumenResponsable {
  tipo_unidad: 'DIRECCIÓN' | 'GERENCIA' | 'DEPARTAMENTO';
  unidad_id: number;
  unidad_codigo: string;
  unidad_nombre: string;
  responsable_id: number | null;
  responsable_nombre: string | null;
  responsable_email: string | null;
  responsable_cargo: string | null;
  total_empleados_activos: number;
}

export interface SubordinadoRow {
  nivel_jerarquico: number;
  empleado_id: number;
  codigo_empleado: string;
  nombre_completo: string;
  cargo: string;
  departamento: string;
  gerencia: string;
  direccion: string;
  supervisor_inmediato: string | null;
  evaluador_efectivo: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role?: string;
  emailVerified?: boolean;
}

export interface DashboardMetrics {
  totalEmpleados: number;
  empleadosActivos: number;
  empleadosVacaciones: number;
  totalDirecciones: number;
  totalGerencias: number;
  totalDepartamentos: number;
  totalCargos: number;
  responsablesSinAsignar: number;
}
