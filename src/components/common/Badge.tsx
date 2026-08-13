import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
}) => {
  const variantStyles = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    info: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    purple: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    neutral: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  const dotColors = {
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-rose-400',
    info: 'bg-cyan-400',
    purple: 'bg-indigo-400',
    neutral: 'bg-slate-400',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${variantStyles[variant]} ${sizeStyles[size]}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};

export const EstadoLaboralBadge: React.FC<{ estado: string }> = ({ estado }) => {
  switch (estado) {
    case 'ACTIVO':
      return <Badge variant="success" dot>Activo</Badge>;
    case 'INACTIVO':
      return <Badge variant="danger" dot>Inactivo</Badge>;
    case 'VACACIONES':
      return <Badge variant="info" dot>Vacaciones</Badge>;
    case 'LICENCIA':
      return <Badge variant="warning" dot>Licencia</Badge>;
    default:
      return <Badge variant="neutral">{estado}</Badge>;
  }
};

export const EstadoBooleanBadge: React.FC<{ activo: boolean }> = ({ activo }) => {
  return activo ? (
    <Badge variant="success" dot>Activo</Badge>
  ) : (
    <Badge variant="danger" dot>Inactivo</Badge>
  );
};
