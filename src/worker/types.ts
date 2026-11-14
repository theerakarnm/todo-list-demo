/** Hono generics shared by the app, routes and middleware. */
export type AppEnv = {
  Bindings: Env;
  Variables: {
    requestId: string;
    /** The signed-in user, set by the currentUser middleware. */
    userId: string;
  };
};
