import React from 'react';

const variants = {
  rect: 'rounded-lg',
  circle: 'rounded-full',
  text: 'rounded-md h-4 w-full',
};

const Skeleton = ({ className = '', variant = 'rect' }) => {
  return (
    <div
      className={`bg-emerald-100/40 animate-pulse ${variants[variant] || variants.rect} ${className}`}
    />
  );
};

export default Skeleton;
