'use client'

import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState, type ReactElement } from 'react'

interface FilterDropdownProps {
  label: string
  options: string[]
  value: string
  onChange: (value: string) => void
}

export function FilterDropdown({
  label,
  options,
  value,
  onChange,
}: FilterDropdownProps): ReactElement {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const isActive = value !== options[0]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border bg-card px-5 py-3 text-left text-[0.9rem] font-medium transition-colors ${
          isActive ? 'border-primary text-foreground' : 'border-border text-foreground/80'
        }`}
      >
        <span>{isActive ? value : label}</span>
        <ChevronDown
          className={`mr-1 size-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open && (
        <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-[0_20px_44px_-24px_rgba(63,81,54,0.45)]">
          {options.map((option) => (
            <li key={option}>
              <button
                type="button"
                onClick={() => {
                  onChange(option)
                  setOpen(false)
                }}
                className={`flex w-full items-center rounded-lg px-4 py-2.5 text-left text-[0.88rem] transition-colors hover:bg-[#EDF3E8] ${
                  option === value ? 'bg-[#DCE8D2] font-semibold text-brand-dark' : 'text-brand-dark'
                }`}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
