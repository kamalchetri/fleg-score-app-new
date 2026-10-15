// Canonical SHA-256 of classification fields. No database access and no personal fields.
// The same line format is produced by public.nspg_snapshot_canonical() in importer.sql.

import type { NspgSnapshot } from "./classify";

const HASH_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export const SNAPSHOT_HASH_PATTERN = /^[0-9a-f]{64}$/;

function rotr(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

/** Lowercase hex SHA-256. UTF-8 input. Independent of locale. */
export function sha256Hex(message: string): string {
  const bytes = new TextEncoder().encode(message);
  const bitLength = bytes.length * 8;
  const zeroPad = (64 - ((bytes.length + 1 + 8) % 64)) % 64;
  const padded = new Uint8Array(bytes.length + 1 + zeroPad + 8);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  const high = Math.floor(bitLength / 0x100000000);
  const low = bitLength >>> 0;
  view.setUint32(padded.length - 8, high);
  view.setUint32(padded.length - 4, low);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;
  const words = new Uint32Array(64);

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(offset + index * 4);
    }
    for (let index = 16; index < 64; index += 1) {
      const s0 = rotr(words[index - 15], 7) ^ rotr(words[index - 15], 18) ^ (words[index - 15] >>> 3);
      const s1 = rotr(words[index - 2], 17) ^ rotr(words[index - 2], 19) ^ (words[index - 2] >>> 10);
      words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
    }
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;
    for (let index = 0; index < 64; index += 1) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + HASH_K[index] + words[index]) >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7].map((part) => part.toString(16).padStart(8, "0")).join("");
}

export function compareUtf8(left: string, right: string): number {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  const length = Math.min(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    if (leftBytes[index] !== rightBytes[index]) return leftBytes[index] - rightBytes[index];
  }
  return leftBytes.length - rightBytes.length;
}

/** Escape a field so `|` and newlines cannot change the line shape. */
export function escapeHashField(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r/g, "\\r").replace(/\n/g, "\\n");
}

function competitionForm(snapshot: NspgSnapshot, formId: string): boolean {
  const form = snapshot.forms.find((item) => item.id === formId);
  return Boolean(form && form.slug.toLowerCase().startsWith("nspg26-") && form.sport !== "officials");
}

/**
 * Stable registration text. Includes form, category, submission status, and category links.
 * Excludes names, contact details, answers, documents, inspection time, and officials.
 * Line order is UTF-8 byte order, so property order and input order do not matter.
 */
export function canonicalSnapshotText(snapshot: NspgSnapshot): string {
  const lines: string[] = [];
  for (const form of snapshot.forms) {
    if (!form.slug.toLowerCase().startsWith("nspg26-") || form.sport === "officials") continue;
    lines.push(`form|${form.id.toLowerCase()}|${escapeHashField(form.slug)}|${escapeHashField(form.sport)}`);
  }
  for (const category of snapshot.categories) {
    if (!competitionForm(snapshot, category.formId)) continue;
    lines.push(
      `category|${category.id.toLowerCase()}|${category.formId.toLowerCase()}|${escapeHashField(category.name)}`,
    );
  }
  const competitionSubmissions = new Set(
    snapshot.submissions.filter((submission) => competitionForm(snapshot, submission.formId)).map((submission) => submission.id),
  );
  for (const submission of snapshot.submissions) {
    if (!competitionSubmissions.has(submission.id)) continue;
    lines.push(
      `submission|${submission.id.toLowerCase()}|${submission.formId.toLowerCase()}|${escapeHashField(submission.status)}`,
    );
  }
  for (const link of snapshot.links) {
    if (!competitionSubmissions.has(link.submissionId)) continue;
    lines.push(`link|${link.submissionId.toLowerCase()}|${link.categoryId.toLowerCase()}`);
  }
  lines.sort(compareUtf8);
  return lines.join("\n");
}

export function registrationDigest(snapshot: NspgSnapshot): string {
  return sha256Hex(canonicalSnapshotText(snapshot));
}
