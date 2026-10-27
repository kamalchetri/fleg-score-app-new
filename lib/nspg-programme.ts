/**
 * Public NSPG 2026 programme metadata fetched live from Supabase.
 * The read-only RPC exposes names and event categories only; it never exposes
 * private registration submissions, athlete identities, or draft results.
 */
export interface NspgEventCategory {
  id: string;
  name: string;
  sortOrder: number | null;
}

export interface NspgDiscipline {
  slug: string;
  name: string;
  categories: NspgEventCategory[];
}

export interface NspgProgramme {
  districts: string[];
  sports: NspgDiscipline[];
  para: NspgDiscipline | null;
}

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Validate response shape so a malformed query does not silently hide sports. */
export function parseNspgProgramme(data: unknown): NspgProgramme {
  if (!isRecord(data) || !Array.isArray(data.districts) || !Array.isArray(data.sports)) {
    throw new Error("Invalid NSPG programme response from Supabase.");
  }
  const districts = data.districts.map((district: unknown) => {
    if (typeof district !== "string" || !district.trim()) {
      throw new Error("Invalid NSPG district name.");
    }
    return district.trim();
  });
  if (new Set(districts).size !== districts.length) {
    throw new Error("Duplicate NSPG districts in Supabase programme.");
  }
  const groups = data.sports.map((group: unknown): NspgDiscipline => {
    if (!isRecord(group) || typeof group.slug !== "string"
      || typeof group.title !== "string" || !Array.isArray(group.categories)) {
      throw new Error("Invalid NSPG discipline in Supabase programme.");
    }
    const categories = group.categories.map((category: unknown): NspgEventCategory => {
      if (!isRecord(category) || typeof category.name !== "string"
        || typeof category.id !== "string") {
        throw new Error(`Invalid event category for ${group.slug}.`);
      }
      return {
        id: category.id,
        name: category.name,
        sortOrder: typeof category.sortOrder === "number" ? category.sortOrder : null,
      };
    });
    return {
      slug: group.slug,
      name: group.title.replace(/^NSPG\s*26\s*[—-]\s*/i, "").trim(),
      categories,
    };
  });
  const para = groups.find((group) => group.slug === "para") ?? null;
  const sports = groups.filter((group) => group.slug !== "para");
  return { districts, sports, para };
}

type NspgRpcClient = {
  rpc(name: string): Promise<{
    data: unknown;
    error: { message: string } | null;
  }>;
};

/**
 * Invoke the RPC as a client method, retaining its `this` receiver.
 * SupabaseClient.rpc accesses `this.rest`; calling a detached function
 * produces "Cannot read property 'rest' of undefined" on Android.
 */
export async function readNspgProgrammeFromClient(client: NspgRpcClient): Promise<NspgProgramme> {
  const { data, error } = await client.rpc("nspg26_public_programme");
  if (error) throw new Error(`Could not load NSPG programme: ${error.message}`);
  return parseNspgProgramme(data);
}

/** Always queries Supabase: no hardcoded district, sport, or category fallback. */
export async function fetchNspgProgramme(): Promise<NspgProgramme> {
  // Lazy import keeps pure programme tests independent of Expo/native storage.
  const { supabase } = await import("./supabase");
  // Database types are generated separately; narrow the new RPC's payload.
  return readNspgProgrammeFromClient(supabase as unknown as NspgRpcClient);
}
