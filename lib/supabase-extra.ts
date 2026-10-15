// Access for tables, views, and RPCs added after the last database.types.ts sync.
// Public helpers in lib/* wrap these and return explicit types.
import { supabase } from "@/lib/supabase";

type PostgrestError = { message: string } | null;

export interface QueryResult<T> {
  data: T;
  error: PostgrestError;
}

/** Query builder for objects that are not in the generated Database type yet. */
// The generated client cannot see these relations; callers cast the rows they expect.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function table(name: string): any {
  return (supabase as unknown as { from: (n: string) => unknown }).from(name);
}

export async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await (
    supabase as unknown as {
      rpc: (fn: string, a?: Record<string, unknown>) => Promise<QueryResult<T>>;
    }
  ).rpc(name, args ?? {});
  if (error) throw new Error(error.message);
  return data;
}

export function asRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data.filter((row) => row && typeof row === "object") as Record<string, unknown>[];
  if (data && typeof data === "object") return [data as Record<string, unknown>];
  return [];
}

/** RPCs that take a uuid[] — the argument name differs across functions. */
export async function rpcIdList<T>(fn: string, ids: string[], argNames: string[]): Promise<T> {
  let last = "Could not load data.";
  for (const arg of argNames) {
    try {
      return await rpc<T>(fn, { [arg]: ids });
    } catch (e) {
      last = e instanceof Error ? e.message : last;
    }
  }
  throw new Error(last);
}
