import type { HTMLAttributes, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

/** The container scrolls horizontally on its own, so a wide table never causes page-level overflow. */
export function TableContainer({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm", className)} {...rest} />;
}
export function Table({ className, ...rest }: TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn("min-w-full divide-y divide-slate-200 text-sm", className)} {...rest} />;
}
export function THead(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="bg-slate-50" {...props} />;
}
export function TBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className="divide-y divide-slate-100" {...props} />;
}
export function TR({ className, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("hover:bg-slate-50", className)} {...rest} />;
}
export function TH({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th scope="col" className={cn("whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600", className)} {...rest} />;
}
export function TD({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 align-middle text-slate-800", className)} {...rest} />;
}
