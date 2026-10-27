import { parseNspgProgramme, readNspgProgrammeFromClient } from "../lib/nspg-programme";

const sample = {
  districts: ["Kohima", "Dimapur"],
  sports: [
    { slug: "athletics", title: "NSPG26 — Athletics", categories: [
      { id: "category-1", name: "Women 100m", sortOrder: 1 },
      { id: "category-2", name: "Men 100m", sortOrder: 2 },
    ] },
    { slug: "para", title: "NSPG26 — Para Athletes", categories: [
      { id: "category-3", name: "Men Blind 100 Meter Race", sortOrder: 1 },
    ] },
  ],
};

const result = parseNspgProgramme(sample);
if (result.districts.length !== 2 || result.sports.length !== 1 || result.para?.categories.length !== 1) {
  throw new Error("Programme parser lost districts, standard sports, or the para programme");
}
if (result.sports[0].name !== "Athletics" || result.sports[0].categories[1].name !== "Men 100m") {
  throw new Error("Programme parser did not preserve display names or event categories");
}
for (const bad of [
  { districts: [], sports: null },
  { districts: ["Kohima", "Kohima"], sports: [] },
  { districts: ["Kohima"], sports: [{ slug: "boxing", title: "Boxing", categories: "bad" }] },
]) {
  let rejected = false;
  try { parseNspgProgramme(bad); } catch { rejected = true; }
  if (!rejected) throw new Error("Malformed programme payload was accepted");
}
console.log("NSPG Supabase programme parser tests passed");

/**
 * Regression for Android crash: SupabaseClient.rpc reads `this.rest`.
 * A detached rpc reference must never be invoked without the client receiver.
 */
async function verifyRpcClientBinding(): Promise<void> {
  const client = {
    rest: { ready: true },
    async rpc(this: { rest: { ready: boolean } }, name: string) {
      if (!this.rest?.ready) throw new Error("Cannot read property 'rest' of undefined");
      if (name !== "nspg26_public_programme") throw new Error("Wrong programme RPC");
      return { data: sample, error: null };
    },
  };

  const programme = await readNspgProgrammeFromClient(client);
  if (programme.districts.length !== 2 || programme.sports[0]?.name !== "Athletics") {
    throw new Error("NSPG RPC result was not parsed correctly");
  }

  let rejected = false;
  try {
    await readNspgProgrammeFromClient({
      async rpc() { return { data: null, error: { message: "access denied" } }; },
    });
  } catch (error) {
    rejected = error instanceof Error && error.message.includes("access denied");
  }
  if (!rejected) throw new Error("NSPG RPC access errors were not surfaced");
}

void verifyRpcClientBinding()
  .then(() => console.log("NSPG RPC client binding regression tests passed"))
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
