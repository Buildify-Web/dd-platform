import type { Session, User } from "@dd/db";
import type { ClientContext } from "../middleware/client-context";

declare global {
  namespace Express {
    interface Request {
      ctx: ClientContext;
      /** Set by the `authenticate` middleware. */
      auth?: { user: User; session: Session };
      requestId: string;
    }
  }
}

export {};
