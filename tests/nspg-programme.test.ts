import { parseNspgProgramme } from "../lib/nspg-programme";

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
