import React from 'react';

const ProgressBar = ({ progress, className = '', showLabel = false, size = 'md' }) => {
  const value = Math.min(100, Math.max(0, parseFloat(progress)));

  const heights = { sm: 'h-1.5', md: 'h-2', lg: 'h-2.5' };
  const height = heights[size] || heights.md;

  // Color logic: green < 75%, amber 75-89%, red >= 90%
  const getColor = () => {
    if (value >= 90) return 'bg-red-500';
    if (value >= 75) return 'bg-amber-500';
    return 'bg-emerald-600';
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-[11px] font-semibold text-slate-500">Progresso</span>
          <span className={`text-xs font-bold ${value >= 90 ? 'text-red-500' : value >= 75 ? 'text-amber-500' : 'text-emerald-600'}`}>
            {value.toFixed(1)}%
          </span>
        </div>
      )}
      <div className={`w-full ${height} bg-emerald-100/50 rounded-full overflow-hidden`}>
        <div
          className={`h-full ${getColor()} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
