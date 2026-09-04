import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { NavigationTab } from './components/layout/Sidebar';
import { AuthPage } from './components/auth/AuthPage';
import { DashboardView } from './components/dashboard/DashboardView';
import { EmpresasModule } from './components/empresas/EmpresasModule';
import { TabuladorModule } from './components/tabulador/TabuladorModule';
import { TipoCostosModule } from './components/costos/TipoCostosModule';
import { CentrosCostosModule } from './components/costos/CentrosCostosModule';
import { DireccionesModule } from './components/direcciones/DireccionesModule';
import { GerenciasModule } from './components/gerencias/GerenciasModule';
import { DepartamentosModule } from './components/departamentos/DepartamentosModule';
import { CargosModule } from './components/cargos/CargosModule';
import { DenominacionesCargosModule } from './components/denominaciones/DenominacionesCargosModule';
import { EmpleadosModule } from './components/empleados/EmpleadosModule';
import { PerfilesCompetenciasModule } from './components/perfiles/PerfilesCompetenciasModule';
import { HistorialModule } from './components/historial/HistorialModule';
import { OrganigramaModule } from './components/organigrama/OrganigramaModule';
import { ResponsablesModule } from './components/responsables/ResponsablesModule';
import { Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [isNewEmployeeOpen, setIsNewEmployeeOpen] = useState(false);

  // Loading Splash Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-brand-600 to-indigo-500 p-0.5 shadow-glow animate-pulse-glow mb-4">
          <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-brand-400" />
          </div>
        </div>
        <h2 className="text-lg font-bold text-white tracking-tight">Portal Talento Humano</h2>
        <p className="text-xs text-slate-400 mt-1">Cargando portal...</p>
        <div className="w-48 h-1 bg-slate-800 rounded-full mt-6 overflow-hidden">
          <div className="w-full h-full bg-brand-500 rounded-full animate-[pulse_1.5s_ease-in-out_infinite]" />
        </div>
      </div>
    );
  }

  // If not logged in, render Auth flow
  if (!user) {
    return <AuthPage />;
  }

  // Render main application with active module
  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && (
        <DashboardView
          onNavigate={(tab) => {
            setActiveTab(tab);
          }}
          onOpenNewEmployee={() => {
            setActiveTab('empleados');
            setIsNewEmployeeOpen(true);
          }}
        />
      )}

      {activeTab === 'empresas' && <EmpresasModule />}
      {activeTab === 'tabulador' && <TabuladorModule />}
      {activeTab === 'tipo_costos' && <TipoCostosModule />}
      {activeTab === 'centros_costos' && <CentrosCostosModule />}
      {activeTab === 'direcciones' && <DireccionesModule />}
      {activeTab === 'gerencias' && <GerenciasModule />}
      {activeTab === 'departamentos' && <DepartamentosModule />}
      {activeTab === 'cargos' && <CargosModule />}
      {activeTab === 'denominaciones_cargos' && <DenominacionesCargosModule />}

      {activeTab === 'empleados' && (
        <EmpleadosModule
          initialCreateOpen={isNewEmployeeOpen}
          onResetInitialOpen={() => setIsNewEmployeeOpen(false)}
        />
      )}
      {activeTab === 'perfiles_competencias' && <PerfilesCompetenciasModule />}

      {activeTab === 'historial' && <HistorialModule />}
      {activeTab === 'organigrama' && <OrganigramaModule />}
      {activeTab === 'responsables' && <ResponsablesModule />}
    </Layout>
  );
};
export default App;
