// src/components/layout/GlobalSearch.tsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Building2, DollarSign, UserPlus, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { searchApi, SearchResult } from '@/services/search.api';

interface GlobalSearchProps {
  className?: string;
}

export function GlobalSearch({ className }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    contacts: SearchResult[];
    companies: SearchResult[];
    deals: SearchResult[];
    leads: SearchResult[];
  } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (query.length >= 2) {
        setIsLoading(true);
        try {
          const data = await searchApi.globalSearch(query, 5);
          setResults(data);
          setIsOpen(true);
        } catch (error) {
          console.error('Search error:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setResults(null);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const handleResultClick = (type: string, id: string) => {
    setIsOpen(false);
    setQuery('');

    switch (type) {
      case 'contact':
        navigate(`/contacts/${id}`);
        break;
      case 'company':
        navigate(`/companies/${id}`);
        break;
      case 'deal':
        navigate(`/deals`);
        break;
      case 'lead':
        navigate(`/leads`);
        break;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'contact':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'company':
        return <Building2 className="h-4 w-4 text-purple-500" />;
      case 'deal':
        return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'lead':
        return <UserPlus className="h-4 w-4 text-orange-500" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'contact':
        return 'جهة اتصال';
      case 'company':
        return 'شركة';
      case 'deal':
        return 'صفقة';
      case 'lead':
        return 'عميل محتمل';
      default:
        return type;
    }
  };

  const hasResults = results && (
    results.contacts.length > 0 ||
    results.companies.length > 0 ||
    results.deals.length > 0 ||
    results.leads.length > 0
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="بحث في جهات الاتصال، الشركات، الصفقات..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          className="pr-10 pl-8 w-full md:w-80"
          aria-label="البحث العام"
          role="searchbox"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults(null);
              setIsOpen(false);
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="مسح البحث"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full mt-2 w-full md:w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">جاري البحث...</div>
          ) : hasResults ? (
            <div className="py-2">
              {results.contacts.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50">
                    جهات الاتصال ({results.contacts.length})
                  </div>
                  {results.contacts.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleResultClick(item.type, item.id)}
                      className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-50 text-right"
                      type="button"
                    >
                      {getIcon(item.type)}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{item.title}</div>
                        {item.subtitle && (
                          <div className="text-sm text-gray-500 truncate">{item.subtitle}</div>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{getTypeLabel(item.type)}</span>
                    </button>
                  ))}
                </div>
              )}

              {results.companies.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50">
                    الشركات ({results.companies.length})
                  </div>
                  {results.companies.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleResultClick(item.type, item.id)}
                      className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-50 text-right"
                      type="button"
                    >
                      {getIcon(item.type)}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{item.title}</div>
                        {item.subtitle && (
                          <div className="text-sm text-gray-500 truncate">{item.subtitle}</div>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{getTypeLabel(item.type)}</span>
                    </button>
                  ))}
                </div>
              )}

              {results.deals.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50">
                    الصفقات ({results.deals.length})
                  </div>
                  {results.deals.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleResultClick(item.type, item.id)}
                      className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-50 text-right"
                      type="button"
                    >
                      {getIcon(item.type)}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{item.title}</div>
                        {item.subtitle && (
                          <div className="text-sm text-gray-500 truncate">{item.subtitle}</div>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{getTypeLabel(item.type)}</span>
                    </button>
                  ))}
                </div>
              )}

              {results.leads.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50">
                    العملاء المحتملين ({results.leads.length})
                  </div>
                  {results.leads.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleResultClick(item.type, item.id)}
                      className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-50 text-right"
                      type="button"
                    >
                      {getIcon(item.type)}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{item.title}</div>
                        {item.subtitle && (
                          <div className="text-sm text-gray-500 truncate">{item.subtitle}</div>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{getTypeLabel(item.type)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : query.length >= 2 ? (
            <div className="p-4 text-center text-gray-500">
              لا توجد نتائج لـ "{query}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
