'use client';

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
import type { Person } from '@/types/database';

interface Props {
  readonly value: string | null;
  readonly onChange: (personId: string | null) => void;
  readonly persons: readonly Person[];
  readonly filterGender?: 'M' | 'F';
  readonly placeholder?: string;
  readonly emptyLabel?: string;
}

/**
 * Combobox over existing persons in the current tree. Used to pick
 * fathers/mothers on the AddChildForm. Filter by gender to keep the
 * father/mother slots sensible.
 */
export function PersonSelect({
  value,
  onChange,
  persons,
  filterGender,
  placeholder = 'اختر شخصًا',
  emptyLabel = 'لم يتم العثور على نتائج',
}: Props) {
  const [open, setOpen] = useState(false);

  const filtered = filterGender
    ? persons.filter((p) => p.gender === filterGender)
    : persons;

  const selected = persons.find((p) => p.id === value);

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
            ? selected.display_name_ar ?? selected.display_name_en ?? '—'
            : placeholder}
          <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="ابحث بالاسم..." />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {filtered.map((p) => (
                <CommandItem
                  key={p.id}
                  value={
                    `${p.display_name_ar ?? ''} ${p.display_name_en ?? ''} ${p.id}`.trim()
                  }
                  onSelect={() => {
                    onChange(p.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'me-2 h-4 w-4',
                      value === p.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {p.display_name_ar ?? p.display_name_en ?? '—'}
                    </span>
                    {p.notes === 'placeholder' ? (
                      <span className="text-xs text-muted-foreground">
                        شخص مؤقت
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
