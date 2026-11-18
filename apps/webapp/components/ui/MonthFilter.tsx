"use client";

import { useParamSetter } from "./client";
import { inputBase } from "./kit";

/** Month picker bound to ?month=YYYY-MM. */
export function MonthFilter({ value, max, name = "month" }: { value: string; max?: string; name?: string }) {
  const [, set] = useParamSetter();
  return (
    <input
      type="month"
      aria-label="Month"
      value={value}
      max={max}
      onChange={(e) => e.target.value && set({ [name]: e.target.value })}
      className={`${inputBase} h-11 w-[170px] px-3.5`}
    />
  );
}
