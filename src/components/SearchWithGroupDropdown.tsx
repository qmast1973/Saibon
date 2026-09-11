import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Layers, Store, ChevronRight } from 'lucide-react';
import { CollectionGroupRule } from '../types';
import { getGroupSearchSuggestions, GroupSearchSuggestion } from '../lib/groupRules';

interface SearchWithGroupDropdownProps {
  id?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  collectionGroupRules?: CollectionGroupRule[];
  knownStores?: string[];
  theme?: 'light' | 'dark';
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  required?: boolean;
  onSelectSuggestion?: (item: GroupSearchSuggestion) => void;
}

export const SearchWithGroupDropdown: React.FC<SearchWithGroupDropdownProps> = ({
  id,
  value,
  onChange,
  placeholder = "상호/대표거래처 검색 (초성 가능)",
  collectionGroupRules = [],
  knownStores = [],
  theme = 'dark',
  className = "relative flex-1",
  inputClassName,
  disabled = false,
  required = false,
  onSelectSuggestion
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    if (!value.trim()) return [];
    return getGroupSearchSuggestions(value, collectionGroupRules, knownStores);
  }, [value, collectionGroupRules, knownStores]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: GroupSearchSuggestion) => {
    onChange(item.name);
    if (onSelectSuggestion) {
      onSelectSuggestion(item);
    }
    setIsOpen(false);
  };

  const isDark = theme === 'dark';
  const defaultInputClass = isDark
    ? "w-full bg-gray-900 border border-gray-700 rounded-xl pl-8 pr-7 py-2 text-xs sm:text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
    : "w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-7 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition";

  return (
    <div ref={containerRef} className={className}>
      <div className="relative w-full">
        <input
          id={id}
          type="text"
          value={value}
          disabled={disabled}
          required={required}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled && value.trim()) setIsOpen(true);
          }}
          placeholder={placeholder}
          className={inputClassName || defaultInputClass}
        />
        <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-gray-400' : 'text-slate-400'}`} />
        
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setIsOpen(false);
            }}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full transition ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'}`}
            title="검색어 지우기"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          className={`absolute left-0 right-0 top-full mt-1.5 rounded-xl shadow-2xl border z-[300] overflow-hidden max-h-72 overflow-y-auto ${
            isDark ? 'bg-gray-900 border-gray-700 divide-y divide-gray-800' : 'bg-white border-slate-200 divide-y divide-slate-100'
          }`}
        >
          <div className={`px-3 py-1.5 text-[10px] font-bold flex items-center justify-between ${
            isDark ? 'bg-gray-950 text-gray-400' : 'bg-slate-50 text-slate-500'
          }`}>
            <span>대표 및 종속 거래처 검색 추천</span>
            <span className="text-indigo-400">클릭하여 선택</span>
          </div>

          {suggestions.map((item, idx) => {
            const isGroup = item.type === 'group';
            const isSubordinate = item.type === 'subordinate';

            return (
              <div
                key={`${item.type}-${item.name}-${idx}`}
                onClick={() => handleSelect(item)}
                className={`p-2.5 px-3 flex items-center justify-between gap-2 cursor-pointer transition ${
                  isDark ? 'hover:bg-indigo-950/40 text-gray-200' : 'hover:bg-indigo-50/70 text-slate-800'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {isGroup ? (
                      <span className="text-[10px] bg-violet-900 text-violet-200 border border-violet-700 px-1.5 py-0.2 rounded font-black flex items-center gap-1">
                        <Layers className="w-2.5 h-2.5 text-violet-300" />
                        대표
                      </span>
                    ) : isSubordinate ? (
                      <span className="text-[10px] bg-cyan-950 text-cyan-200 border border-cyan-700 px-1.5 py-0.2 rounded font-bold flex items-center gap-1">
                        <Store className="w-2.5 h-2.5 text-cyan-300" />
                        종속
                      </span>
                    ) : null}

                    <span className="font-bold text-xs sm:text-sm truncate">
                      {item.name}
                    </span>

                    {isSubordinate && item.representativeName && (
                      <span className="text-[11px] text-gray-400">
                        ➔ 대표: <b className="text-violet-300">{item.representativeName}</b>
                      </span>
                    )}
                  </div>

                  {isGroup && item.subStores && item.subStores.length > 0 && (
                    <div className="text-[11px] text-gray-400 mt-1 truncate">
                      종속 거래처 ({item.subStores.length}곳): <span className="text-violet-300 font-medium">{item.subStores.join(', ')}</span>
                    </div>
                  )}
                </div>

                <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
