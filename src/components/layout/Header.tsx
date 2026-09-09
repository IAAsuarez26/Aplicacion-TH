import React from 'react';
import { Menu, Bell, Search, User, Sparkles, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NavigationTab } from './Sidebar';

interface HeaderProps {
  activeTab: NavigationTab;
  sidebarCollapsed?: boolean;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, sidebarCollapsed, onToggleSidebar }) => {
  const { user } = useAuth();

  const titles: Record<NavigationTab, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Panel Ejecutivo de Talento Humano',
      subtitle: 'Métricas, resumen de estructura organizacional y estado del personal',
    },
    empresas: {
      title: 'Catálogo de Empresas y Filiales',
      subtitle: 'Entidades jurídicas, datos fiscales y directiva corporativa del grupo',
    },
    tabulador: {
      title: 'Tabulador Salarial y Bandas (80% - 120%)',
      subtitle: 'Estructuras de compensación, percentiles y evaluación de equidad interna',
    },
    tipo_costos: {
      title: 'Tipos de Costos (MOD, MOI, Gastos)',
      subtitle: 'Catálogo de clasificación contable para mano de obra y costos de personal',
    },
    centros_costos: {
      title: 'Centros de Costos (01 al 15)',
      subtitle: 'Unidades de imputación de costos asociadas a los departamentos de la empresa',
    },
    direcciones: {
      title: 'Direcciones (Nivel 1)',
      subtitle: 'Catálogo de direcciones estratégicas y asignación de Directores Generales',
    },
    gerencias: {
      title: 'Gerencias de Área (Nivel 2)',
      subtitle: 'Estructura táctica subordinada a direcciones y asignación de gerentes',
    },
    departamentos: {
      title: 'Departamentos Operativos (Nivel 3)',
      subtitle: 'Unidades departamentales donde se adscribe el personal de la empresa',
    },
    cargos: {
      title: 'Catálogo de Cargos',
      subtitle: 'Maestro de Cargos y vinculación con Denominaciones (DC)',
    },
    denominaciones_cargos: {
      title: 'Denominaciones de Cargos (Catálogo DC)',
      subtitle: 'Clasificación homologada para estandarización y agrupación corporativa de puestos',
    },
    empleados: {
      title: 'Ficha Maestra de Empleados',
      subtitle: 'Registro integral del personal, supervisores directos, perfiles (PC) y evaluadores asignados',
    },
    perfiles_competencias: {
      title: 'Perfiles de Competencias (Catálogo PC)',
      subtitle: 'Segmentación de capacidades y competencias funcionales (Administrativo, Líder, Operativo)',
    },
    historial: {
      title: 'Historial de Traslados y Ascensos',
      subtitle: 'Trazabilidad de movimientos internos, cambios de departamento y promociones',
    },
    organigrama: {
      title: 'Organigrama y Líneas de Mando',
      subtitle: 'Visualización jerárquica interactiva y árbol de subordinados directos/indirectos',
    },
    responsables: {
      title: 'Inventario de Responsables por Área',
      subtitle: 'Vista unificada de líderes asignados a Direcciones, Gerencias y Departamentos',
    },
    usuarios: {
      title: 'Gestión de Usuarios, Roles y Seguridad',
      subtitle: 'Administración de accesos institucionales, asignación de perfiles y niveles de autorización',
    },
  };

  const currentInfo = titles[activeTab] || titles.dashboard;

  const isDemoUser = user?.id.startsWith('usr_demo');

  const getRoleColor = (rolCodigo?: string) => {
    switch (rolCodigo) {
      case 'ADMIN_PLATAFORMA':
        return 'text-purple-300 bg-purple-500/10 border-purple-500/30';
      case 'GERENTE_TH':
        return 'text-blue-300 bg-blue-500/10 border-blue-500/30';
      case 'COORD_COMPENSACION':
        return 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30';
      case 'COORD_RECLUTAMIENTO':
        return 'text-amber-300 bg-amber-500/10 border-amber-500/30';
      case 'ESPEC_RECLUTAMIENTO':
      default:
        return 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 md:px-8 py-4">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Menu / Collapse Trigger & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-center shadow-sm"
            aria-label={sidebarCollapsed ? "Mostrar barra lateral" : "Ocultar barra lateral"}
            title={sidebarCollapsed ? "Mostrar barra lateral" : "Ocultar barra lateral"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-5 h-5 text-brand-400" />
            ) : (
              <PanelLeftClose className="w-5 h-5 text-slate-300" />
            )}
          </button>

          <div>
            <h2 className="text-lg md:text-xl font-bold text-slate-100 tracking-tight">
              {currentInfo.title}
            </h2>
            <p className="hidden sm:block text-xs text-slate-400 font-normal">
              {currentInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Actions, Demo Switcher & User Badge */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* User badge */}
          <div className="flex items-center gap-2.5 pl-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 p-0.5 shadow-sm">
              <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-xs font-bold text-slate-200">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-200 leading-none">
                {user?.name || user?.email?.split('@')[0]}
              </p>
              <div className="mt-1">
                <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getRoleColor(user?.rol_codigo)}`}>
                  {user?.role || 'Administrador'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
