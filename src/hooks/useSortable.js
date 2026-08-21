import { useState, useMemo } from 'react';

/**
 * Hook genérico para ordenação de tabelas.
 * Uso: const { sortConfig, handleSort, sortedData } = useSortable(data, { key: null, direction: null });
 */
export function useSortable(data, initialConfig = { key: null, direction: null }) {
    const [sortConfig, setSortConfig] = useState(initialConfig);

    const handleSort = (key) => {
        setSortConfig(prev => {
            if (prev.key !== key) return { key, direction: 'asc' };
            if (prev.direction === 'asc') return { key, direction: 'desc' };
            return { key: null, direction: null };
        });
    };

    const sortedData = useMemo(() => {
        if (!sortConfig.key || !sortConfig.direction) return data;

        return [...data].sort((a, b) => {
            let aVal = a[sortConfig.key];
            let bVal = b[sortConfig.key];

            // Trata valores nulos/undefined
            if (aVal == null) return 1;
            if (bVal == null) return -1;

            // Tenta parse como número
            const aNum = parseFloat(aVal);
            const bNum = parseFloat(bVal);
            if (!isNaN(aNum) && !isNaN(bNum)) {
                return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
            }

            // String
            aVal = String(aVal).toLowerCase();
            bVal = String(bVal).toLowerCase();
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, sortConfig]);

    /**
     * Renderiza o cabeçalho de uma coluna ordenável
     */
    const SortHeader = ({ label, sortKey, className = '' }) => {
        const isActive = sortConfig.key === sortKey;
        return (
            <th
                onClick={() => handleSort(sortKey)}
                className={`cursor-pointer select-none hover:text-emerald-600 transition-colors ${className}`}
                title={`Ordenar por ${label}`}
            >
                <span className="inline-flex items-center gap-1">
                    {label}
                    {isActive ? (
                        <span className="text-emerald-500 text-[10px]">
                            {sortConfig.direction === 'asc' ? ' ▲' : ' ▼'}
                        </span>
                    ) : (
                        <span className="text-slate-300 text-[10px] opacity-0 group-hover:opacity-100"> ↕</span>
                    )}
                </span>
            </th>
        );
    };

    return { sortConfig, handleSort, sortedData, SortHeader };
}

export default useSortable;
