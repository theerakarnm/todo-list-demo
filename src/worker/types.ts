import type { AuthSession, AuthUser } from "./auth/create-auth";

/** Hono generics shared by the app, routes and middleware. */
export type AppEnv = {
  Bindings: Env;
  Variables: {
    requestId: string;
    /** The signed-in user, set by the currentUser middleware. */
    userId: string;
  };
};

/** For routes behind `requireSession`: the signed-in user and their session. */
export type SessionEnv = {
  Bindings: Env;
  Variables: AppEnv["Variables"] & {
    user: AuthUser;
    session: AuthSession;
  };
};
