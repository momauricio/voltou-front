const fs = require("fs");
const p =
  "C:/Users/Maurício/.cursor/projects/c-Users-Maur-cio-Projects-voltou-web/agent-transcripts/578a58f4-0a7d-4af4-8e4c-4716104b178f/578a58f4-0a7d-4af4-8e4c-4716104b178f.jsonl";
const out = "C:/Users/Maurício/Projects/voltou-web/src/lib/api.ts";
const lines = fs.readFileSync(p, "utf8").split(/\n/);

// Prefer tool results that contain full file reads of api.ts
let best = "";
for (const line of lines) {
  if (!line.includes("markApiCheckoutPaid")) continue;
  if (!line.includes("resolveTenantContext")) continue;
  if (!line.includes("listApiCustomers")) continue;
  if (line.length > best.length) best = line;
}
console.log("candidate line length", best.length);

if (!best) {
  console.error("not found");
  process.exit(1);
}

const j = JSON.parse(best);
const content = j.message?.content;
const parts = Array.isArray(content) ? content : [content];
for (const part of parts) {
  if (part?.type === "tool_use" && part.input?.contents?.includes("markApiCheckoutPaid")) {
    fs.writeFileSync(out, part.input.contents);
    console.log("wrote from Write tool", part.input.contents.length);
    process.exit(0);
  }
}

// Try to find read tool results in other lines - look for output with line numbers
let readBest = "";
for (const line of lines) {
  if (!line.includes('"path"') && !line.includes("api.ts")) continue;
  if (line.includes("export async function listApiCustomers") && line.includes("export async function resolveTenantContext")) {
    if (line.length > readBest.length) readBest = line;
  }
}
console.log("readBest", readBest.length);

// Fallback: reconstruct from corrupt by undoing jsonFetch mess is hard.
// Search all transcripts folder
const dir =
  "C:/Users/Maurício/.cursor/projects/c-Users-Maur-cio-Projects-voltou-web/agent-transcripts";
function walk(d) {
  for (const name of fs.readdirSync(d)) {
    const fp = d + "/" + name;
    const st = fs.statSync(fp);
    if (st.isDirectory()) walk(fp);
    else if (name.endsWith(".jsonl")) scan(fp);
  }
}
let foundFile = null;
function scan(fp) {
  const text = fs.readFileSync(fp, "utf8");
  if (!text.includes("async function resolveTenantContext")) return;
  if (!text.includes("export async function markApiCheckoutPaid")) return;
  // look for a Write contents of full api
  const idx = text.indexOf('"contents":"const API_URL');
  if (idx === -1) return;
  console.log("possible in", fp, "at", idx);
}
walk(dir);
console.log("done scan");
