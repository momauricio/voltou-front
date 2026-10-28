'use client';

import { useRef, useState } from 'react';
import {
  LEVOU_CHIP_GROUPS,
  LEVOU_MAX,
  canAddChip,
  isChipSelected,
  toggleChip,
} from '@/lib/o-que-levou-chips';

const DEFAULT_INPUT_CLASS =
  'mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';

const CHIP_BASE =
  'inline-flex h-11 items-center rounded-full border px-4 text-sm transition';

type Props = {
  id: string;
  value: string;
  onChange(v: string): void;
  defaultOpen?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  inputClassName?: string;
};

export function OQueLevouField({
  id,
  value,
  onChange,
  defaultOpen = false,
  autoFocus = false,
  disabled = false,
  inputClassName = DEFAULT_INPUT_CLASS,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelId = `${id}Panel`;

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-full items-center text-left text-sm text-[#111e15]/70"
      >
        {open ? '−' : '+'} O que o cliente levou (opcional)
      </button>
      <div id={panelId} hidden={!open}>
        <input
          ref={inputRef}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, LEVOU_MAX))}
          placeholder="Ex.: calça jeans"
          aria-label="O que o cliente levou"
          maxLength={LEVOU_MAX}
          autoFocus={autoFocus}
          disabled={disabled}
          className={inputClassName}
        />
        <p aria-live="polite" className="mt-1 text-right text-xs text-muted-foreground">
          {value.length}/{LEVOU_MAX}
        </p>
        {LEVOU_CHIP_GROUPS.map((group) => (
          <div key={group.label} className="mt-2">
            <p
              id={`${id}-${group.label}`}
              className="text-xs uppercase tracking-wide text-[#111e15]/70"
            >
              {group.label}
            </p>
            <div
              role="group"
              aria-labelledby={`${id}-${group.label}`}
              className="mt-1.5 flex flex-wrap gap-2"
            >
              {group.chips.map((chip) => {
                const selected = isChipSelected(value, chip);
                const blocked = !selected && !canAddChip(value, chip);
                return (
                  <button
                    key={chip}
                    type="button"
                    aria-pressed={selected}
                    disabled={disabled || blocked}
                    onClick={() => onChange(toggleChip(value, chip))}
                    className={`${CHIP_BASE} ${
                      selected
                        ? 'border-[#111e15] bg-[#111e15] text-[#f6fbf6]'
                        : 'border-[#111e15]/20 bg-transparent text-[#111e15]'
                    } disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.focus()}
            className={`${CHIP_BASE} border-[#111e15]/20 bg-transparent text-[#111e15] disabled:cursor-not-allowed disabled:opacity-40`}
          >
            Outro
          </button>
        </div>
      </div>
    </div>
  );
}
