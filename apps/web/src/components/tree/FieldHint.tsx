'use client';

import { HelpCircle } from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TOOLTIP_COPY } from '@/lib/tree/tooltipCopy';

interface Props {
  readonly fieldKey: keyof typeof TOOLTIP_COPY;
  readonly lang?: 'ar' | 'en';
}

/**
 * Small info-circle that reveals the bilingual field description on
 * hover. FRS rule: "hovering over any field shows a pop-up description".
 */
export function FieldHint({ fieldKey, lang = 'ar' }: Props) {
  const copy = TOOLTIP_COPY[fieldKey];
  if (!copy) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={lang === 'ar' ? 'تلميح' : 'Field hint'}
            className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-right">
          <p className="text-sm">{copy[lang]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
