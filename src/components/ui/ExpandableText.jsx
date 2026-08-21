import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const ExpandableText = ({ text, maxLines = 2, className = '' }) => {
  const [expanded, setExpanded] = useState(false);
  if (!text) return <span className={className}>—</span>;

  const isLong = text.length > 120 || (text.match(/\n/g) || []).length > 1;

  return (
    <div className="relative w-full min-w-0">
      <div
        className={`${className} ${!expanded && isLong ? `line-clamp-${maxLines}` : ''} transition-all duration-200`}
        style={{
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          whiteSpace: 'normal',
          maxWidth: '100%',
          width: '100%',
          ...(!expanded && isLong ? {
            display: '-webkit-box',
            WebkitLineClamp: maxLines,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          } : {})
        }}
      >
        {text}
      </div>
      {isLong && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 mt-0.5 transition-colors"
        >
          {expanded ? (
            <>Ver menos <ChevronUp size={12} strokeWidth={2.5} /></>
          ) : (
            <>Ver mais <ChevronDown size={12} strokeWidth={2.5} /></>
          )}
        </button>
      )}
    </div>
  );
};

export default ExpandableText;
