'use client';

import { useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import { searchPlacesClient } from './placeSearchClient';

interface Props {
  readonly value: string | null;
  readonly onChange: (placeId: string | null, placeName: string | null) => void;
  readonly placeholder?: string;
}

/**
 * Searchable combobox over the seeded `places` table. Debounced via
 * React Query's default staleTime; searches both Arabic and English
 * names via the server-side `searchPlaces` helper.
 */
export function PlaceCombobox({
  value,
  onChange,
  placeholder = 'اختر القرية أو المدينة',
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const { data: places = [], isFetching } = useQuery({
    queryKey: ['places', query],
    queryFn: () => searchPlacesClient(query),
    staleTime: 60_000,
  });

  const selected = places.find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between font-normal',
            !selected && 'text-muted-foreground'
          )}
        >
          {selected
            ? selected.name_ar ?? selected.name_en ?? '—'
            : placeholder}
          <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="ابحث بالعربية أو الإنجليزية..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              {isFetching ? 'جارٍ البحث…' : 'لم يتم العثور على نتائج.'}
            </CommandEmpty>
            <CommandGroup>
              {places.map((place) => (
                <CommandItem
                  key={place.id}
                  value={place.id}
                  onSelect={() => {
                    onChange(
                      place.id,
                      place.name_ar ?? place.name_en ?? null
                    );
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'me-2 h-4 w-4',
                      value === place.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {place.name_ar ?? place.name_en}
                    </span>
                    {place.district_ar ? (
                      <span className="text-xs text-muted-foreground">
                        {place.district_ar}
                      </span>
                    ) : null}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
