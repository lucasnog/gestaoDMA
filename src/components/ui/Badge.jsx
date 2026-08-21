import React from 'react';

const variants = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  warning: 'bg-amber-50 text-amber-700 border-amber-200/60',
  danger: 'bg-rose-50 text-rose-700 border-rose-200/60',
  info: 'bg-sky-50 text-sky-700 border-sky-200/60',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200/60',
};

const sizes = {
  sm: 'px-2 py-0.5 text-[9px]',
  md: 'px-2.5 py-1 text-[10px]',
  lg: 'px-3 py-1.5 text-xs',
};

const Badge = ({ children, variant = 'info', size = 'md', className = '', dot = false }) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-semibold uppercase tracking-wider ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            variant === 'success'
              ? 'bg-emerald-500'
              : variant === 'warning'
              ? 'bg-amber-500'
              : variant === 'danger'
              ? 'bg-rose-500'
              : variant === 'info'
              ? 'bg-sky-500'
              : 'bg-slate-400'
          }`}
        />
      )}
      {children}
    </span>
  );
};

export default Badge;
