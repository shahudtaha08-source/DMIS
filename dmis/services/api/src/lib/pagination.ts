import type { PaginationMeta } from "@dmis/shared";

/** Shared list-pagination contract (docs/API_DESIGN.md footer). Both halves
 *  are clamped here rather than per-module so page numbers can't be used to
 *  ask the database for an unbounded result set. */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface PageQuery {
  page: number;
  pageSize: number;
}

export function resolvePage(query: { page?: unknown; pageSize?: unknown }): PageQuery {
  const page = Math.max(1, Number(query.page) || 1);
  const requested = Number(query.pageSize) || DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, requested));
  return { page, pageSize };
}

export function skipTake(page: PageQuery): { skip: number; take: number } {
  return { skip: (page.page - 1) * page.pageSize, take: page.pageSize };
}

export function pageMeta(page: PageQuery, total: number): PaginationMeta {
  return { page: page.page, pageSize: page.pageSize, total };
}
