import React from 'react';
import { Menu, Bell, Search, User, Sparkles, Database, Github, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NavigationTab } from './Sidebar';

interface HeaderProps {
  activeTab: NavigationTab;
  onOpenSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onOpenSidebar }) => {
  const { user } = useAuth();

  const titles: Record<NavigationTab, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Panel Ejecutivo de Talento Humano',
      subtitle: 'Métricas, resumen de estructura organizacional y estado del personal',
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
      title: 'Catálogo de Cargos y Puestos',
      subtitle: 'Definición de títulos, descriptores de puesto y perfiles laborales',
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
        {/* Left: Mobile Menu Trigger & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSidebar}
            className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
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
          {/* GitHub Repo link */}
          <a
            href="https://github.com/IAAsuarez26/Aplicacion-TH"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          {/* InsForge Dashboard link */}
          <a
            href="https://insforge.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/50 border border-indigo-500/30 text-xs font-medium text-indigo-300 hover:bg-indigo-900/50 hover:text-indigo-200 transition-colors"
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>InsForge BaaS</span>
          </a>

          {/* User badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
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
