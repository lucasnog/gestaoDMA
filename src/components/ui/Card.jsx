import React from 'react';

const Card = ({ children, className = '', padding = 'p-6', hover = false, ...rest }) => {
  return (
    <div
      {...rest}
      className={`bg-white ${padding} rounded-xl border border-emerald-100/50 shadow-sm ${
        hover ? 'hover:shadow-card hover:border-emerald-200/60 transition-all duration-200' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
