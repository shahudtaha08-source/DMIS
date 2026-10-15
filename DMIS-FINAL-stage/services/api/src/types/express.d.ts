import type { UserRole } from "@dmis/shared";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by the `authenticate` middleware on protected routes. */
      user?: { id: string; email: string; name: string; role: UserRole };
    }
  }
}

export {};
