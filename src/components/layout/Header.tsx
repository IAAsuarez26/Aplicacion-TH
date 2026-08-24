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
      subtitle: 'Maestro de Cargos',
    },
    empleados: {
      title: 'Ficha Maestra de Empleados',
      subtitle: 'Registro integral del personal, supervisores directos y evaluadores asignados',
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
  };

  const currentInfo = titles[activeTab] || titles.dashboard;

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

        {/* Right: Actions & Links */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* User badge */}
          <div className="flex items-center gap-2 pl-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 p-0.5 shadow-sm">
              <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-xs font-bold text-slate-200">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            </div>
            <div className="hidden xl:block text-left">
              <p className="text-xs font-semibold text-slate-200 leading-none">
                {user?.name || user?.email.split('@')[0]}
              </p>
              <p className="text-[10px] text-brand-400 font-medium mt-0.5">
                {user?.role || 'Admin'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
