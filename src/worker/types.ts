/** Hono generics shared by the app, routes and middleware. */
export type AppEnv = {
  Bindings: Env;
  Variables: {
    requestId: string;
  };
};
