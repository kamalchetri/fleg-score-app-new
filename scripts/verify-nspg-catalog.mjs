// Node-only live contract smoke test. Safe to run in Codespaces or GitHub Actions.
// Never logs the public anon credential or private registration data.
import { readFileSync } from "node:fs";

const preview = JSON.parse(readFileSync("eas.json", "utf8")).build.preview.env;
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || preview.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || preview.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) throw new Error("Missing Supabase public credentials.");
const response = await fetch(`${url}/rest/v1/rpc/nspg26_public_programme`, {
  method: "POST",
  headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: "{}",
});
if (!response.ok) throw new Error(`Programme RPC rejected anon access: HTTP ${response.status}`);
const data = await response.json();
if (!Array.isArray(data.districts) || !Array.isArray(data.sports)) {
  throw new Error("Programme RPC returned an invalid response.");
}
const standardSports = data.sports.filter((sport) => sport.slug !== "para");
const para = data.sports.find((sport) => sport.slug === "para");
const totalCategories = data.sports.reduce((sum, sport) =>
  sum + (Array.isArray(sport.categories) ? sport.categories.length : 0), 0);

if (data.districts.length !== 17 || standardSports.length !== 14 || !para) {
  throw new Error(`NSPG programme count mismatch: ${data.districts.length} districts, ${standardSports.length} sports, para=${!!para}`);
}
if (totalCategories < 179 || para.categories.length < 5) {
  throw new Error(`NSPG category data incomplete: ${totalCategories} total, ${para.categories.length} para`);
}
const names = new Set(standardSports.map((sport) => sport.slug));
if (names.size !== 14 || new Set(data.districts).size !== 17) {
  throw new Error("NSPG programme contains duplicate names.");
}
console.log(`Live Supabase verified: ${data.districts.length} districts, ${standardSports.length} standard sports, ${totalCategories} categories including ${para.categories.length} para categories.`);
