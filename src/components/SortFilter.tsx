// src/components/SortFilter.tsx
import React, { useEffect, useState } from 'react';
import { Search, Calendar, ChevronDown, ChevronUp, X } from 'lucide-react';

type SortOption = 'newest' | 'oldest';

interface SortFilterProps {
  /** initial selected sort (default 'newest') */
  initialSort?: SortOption;
  /** initial search term (default '') */
  initialSearch?: string;
  /** initial exact date filter in 'YYYY-MM-DD' format or null */
  initialDate?: string | null;
  /** called when sort option changes */
  onSortChange?: (sort: SortOption) => void;
  /** called when search term changes (debounced) */
  onSearchChange?: (searchTerm: string) => void;
  /** called when exact date filter changes; null when cleared */
  onDateFilterChange?: (dateISO: string | null) => void;
  /** debounce delay in ms for search (default 300) */
  searchDebounceMs?: number;
  /** optional className wrapper */
  className?: string;
}

/**
 * SortFilter
 *
 * Re-usable search / exact-date filter / sort toggle component.
 * - Search is debounced before calling onSearchChange.
 * - Date expects browser-native yyyy-mm-dd string (ISO-like).
 */
const SortFilter: React.FC<SortFilterProps> = ({
  initialSort = 'newest',
  initialSearch = '',
  initialDate = null,
  onSortChange,
  onSearchChange,
  onDateFilterChange,
  searchDebounceMs = 300,
  className = ''
}) => {
  const [sort, setSort] = useState<SortOption>(initialSort);
  const [search, setSearch] = useState<string>(initialSearch);
  const [date, setDate] = useState<string | null>(initialDate);
  const [debounceTimer, setDebounceTimer] = useState<number | null>(null);

  // Sync initial values if props change (defensive)
  useEffect(() => {
    setSort(initialSort);
  }, [initialSort]);

  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    setDate(initialDate ?? null);
  }, [initialDate]);

  // Handle debounced search change
  useEffect(() => {
    if (!onSearchChange) return;

    if (debounceTimer) {
      window.clearTimeout(debounceTimer);
    }

    const id = window.setTimeout(() => {
      onSearchChange(search.trim());
    }, searchDebounceMs);

    setDebounceTimer(id);

    return () => {
      window.clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, onSearchChange, searchDebounceMs]);

  const handleSortToggle = () => {
    const next: SortOption = sort === 'newest' ? 'oldest' : 'newest';
    setSort(next);
    if (onSortChange) onSortChange(next);
  };

  const handleDateChange = (val: string) => {
    // val is '' or 'YYYY-MM-DD'
    const next = val === '' ? null : val;
    setDate(next);
    if (onDateFilterChange) onDateFilterChange(next);
  };

  const handleClearAll = () => {
    setSearch('');
    setDate(null);
    setSort('newest');
    if (onSearchChange) onSearchChange('');
    if (onDateFilterChange) onDateFilterChange(null);
    if (onSortChange) onSortChange('newest');
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        {/* Search box */}
        <div className="relative flex-1 max-w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 glass-effect rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-800 dark:text-gray-200 placeholder-gray-500"
            aria-label="Search by name or title"
          />
        </div>

        {/* Exact date filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={date ?? ''}
              onChange={(e) => handleDateChange(e.target.value)}
              className="pl-10 pr-4 py-2 glass-effect rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-800 dark:text-gray-200"
              aria-label="Filter by exact date"
            />
          </div>
          {date && (
            <button
              type="button"
              onClick={() => handleDateChange('')}
              className="inline-flex items-center justify-center px-3 py-2 rounded-lg button-secondary hover-scale"
              aria-label="Clear date filter"
              title="Clear date"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Sort toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSortToggle}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200 button-glow"
            aria-label="Toggle sort order"
            title={`Sort: ${sort === 'newest' ? 'Newest → Oldest' : 'Oldest → Newest'}`}
          >
            {sort === 'newest' ? (
              <>
                <ChevronDown className="h-4 w-4" />
                Newest → Oldest
              </>
            ) : (
              <>
                <ChevronUp className="h-4 w-4" />
                Oldest → Newest
              </>
            )}
          </button>
        </div>

        {/* Clear all */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={handleClearAll}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg button-secondary hover-scale"
            aria-label="Clear search, date and sort"
            title="Reset filters"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

export default SortFilter;

