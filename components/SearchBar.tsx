'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search } from 'lucide-react';

interface SearchBarProps {
  className?: string;
  placeholder?: string;
}

function SearchBarInner({
  className = '',
  placeholder = 'Search for food, fashion, properties...',
}: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialQ = pathname === '/search' ? searchParams.get('q') ?? '' : '';
  const [query, setQuery] = useState(initialQ);

  useEffect(() => {
    if (pathname === '/search') {
      setQuery(searchParams.get('q') ?? '');
    }
  }, [pathname, searchParams]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex items-center gap-2 bg-white rounded-2xl p-2 shadow-2xl ${className}`}
    >
      <div className="flex items-center gap-2 flex-1 px-3">
        <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full text-sm outline-none text-gray-700 placeholder:text-gray-400 bg-transparent"
        />
      </div>
      <button
        type="submit"
        className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-red-700 transition-all whitespace-nowrap"
      >
        Search
      </button>
    </form>
  );
}

export default function SearchBar(props: SearchBarProps) {
  return (
    <Suspense fallback={null}>
      <SearchBarInner {...props} />
    </Suspense>
  );
}