"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  parseProjectFilterFromSearchParams,
  projectFilterToSearchParams,
  hasProjectFilters,
  defaultProjectFilter,
} from "@/lib/search-filter";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import { Search, X } from "lucide-react";

/** Debounce for search input to limit URL updates */
const SEARCH_DEBOUNCE_MS = 300;

export function ProjectSearchBar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = parseProjectFilterFromSearchParams(searchParams);
  const [inputValue, setInputValue] = useState(filter.q);

  const applyFilter = useCallback(
    (next: { q: string }) => {
      const params = projectFilterToSearchParams(next);
      const query = params.toString();
      const url = query ? `${pathname}?${query}` : pathname;
      router.replace(url, { scroll: false });
    },
    [pathname, router]
  );

  const debouncedApply = useDebouncedCallback(applyFilter, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    setInputValue(filter.q);
  }, [filter.q]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputValue(v);
    debouncedApply({ q: v });
  };

  const handleReset = () => {
    setInputValue("");
    applyFilter(defaultProjectFilter);
  };

  const hasFilters = hasProjectFilters({ q: inputValue });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="ค้นหา Squad (ชื่อ หรือคำอธิบาย)..."
          value={inputValue}
          onChange={handleChange}
          className="pl-9"
          aria-label="ค้นหา Squad"
        />
      </div>
      {hasFilters && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="gap-1.5"
        >
          <X className="h-4 w-4" />
          ล้างตัวกรอง
        </Button>
      )}
    </div>
  );
}
