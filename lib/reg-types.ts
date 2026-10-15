export const FIELD_TYPES = [
  "short_text",
  "long_text",
  "number",
  "dropdown",
  "phone",
  "email",
  "date",
  "file",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export interface FormField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
}

export const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  short_text: "Short text",
  long_text: "Long text",
  number: "Number",
  dropdown: "Dropdown",
  phone: "Phone",
  email: "Email",
  date: "Date",
  file: "File",
};

export function parseFields(raw: unknown): FormField[] {
  if (!Array.isArray(raw)) return [];
  const out: FormField[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const type = String(row.type ?? "short_text") as FieldType;
    if (!FIELD_TYPES.includes(type)) continue;
    const key = String(row.key ?? "").trim();
    const label = String(row.label ?? "").trim();
    if (!key || !label) continue;
    const options = Array.isArray(row.options)
      ? row.options.map((o) => String(o)).filter(Boolean)
      : undefined;
    out.push({ key, label, type, required: Boolean(row.required), options });
  }
  return out;
}
