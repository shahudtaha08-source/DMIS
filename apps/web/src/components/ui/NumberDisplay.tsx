/** `null` (metric unavailable) renders as an em dash, never a false "0". */
export function NumberDisplay({ value, format }: { value: number | null; format?: (n: number) => string }) {
  if (value === null) return <span aria-label="unavailable">—</span>;
  return <>{format ? format(value) : value.toLocaleString("en-IN")}</>;
}
