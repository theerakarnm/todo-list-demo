import type { AuthSession, AuthUser } from "./auth/create-auth";

/** Hono generics shared by the app, routes and middleware. */
export type AppEnv = {
  Bindings: Env;
  Variables: {
    requestId: string;
  };
};

/** For routes behind `requireSession`: the signed-in user, their id and their session. */
export type SessionEnv = {
  Bindings: Env;
  Variables: AppEnv["Variables"] & {
    user: AuthUser;
    userId: string;
    session: AuthSession;
  };
};
