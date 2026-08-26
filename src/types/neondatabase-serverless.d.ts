// The deployment installs the runtime package. Keeping this small public API
// declaration in-tree also lets offline development environments type-check.
declare module "@neondatabase/serverless" {
  interface NeonQueryFunction {
    (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]>;
  }

  export function neon(connectionString: string): NeonQueryFunction;
}
