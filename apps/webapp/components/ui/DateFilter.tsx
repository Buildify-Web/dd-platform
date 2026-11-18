"use client";

import { useParamSetter } from "@/components/ui/client";
import { inputBase } from "@/components/ui/kit";

/** Date input bound to a search param (default "date"). */
export function DateFilter({ id, value, max, min, name = "date", label }: { id?: string; value: string; max?: string; min?: string; name?: string; label?: string }) {
  const [, set] = useParamSetter();
  return (
    <input
      id={id}
      type="date"
      aria-label={label}
      value={value}
      max={max}
      min={min}
      onChange={(e) => e.target.value && set({ [name]: e.target.value })}
      className={`${inputBase} h-11 w-[170px] px-3.5`}
    />
  );
}
