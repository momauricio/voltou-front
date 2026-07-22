const fs = require("fs");
const path = "C:/Users/Maurício/Projects/voltou-web/src/lib/api.ts";
let s = fs.readFileSync(path, "utf8");

s = s.replace(
  /const res = await fetch\(\s*`\$\{API_URL\}(\/[^`]+)`\s*,\s*(\{[\s\S]*?\})\s*\);\s*\r?\n\s*return parseJson<([^>]+)>\(res\);/g,
  (m, p, opts, type) => {
    const pub =
      /\/checkouts\/public\//.test(p) ||
      (/\/(bling|mercadopago)\/callback/.test(p) && /POST/.test(opts));
    // strip Content-Type from opts since jsonFetch adds it
    let clean = opts.replace(/\s*headers:\s*\{\s*'Content-Type':\s*'application\/json'\s*\},?\s*/g, "\n");
    if (pub) {
      return `return jsonFetch<${type}>(\`${p}\`, { ...${clean}, auth: false });`;
    }
    return `return jsonFetch<${type}>(\`${p}\`, ${clean});`;
  },
);

s = s.replace(
  /const res = await fetch\(\s*`\$\{API_URL\}(\/[^`]+)`\s*\);\s*\r?\n\s*return parseJson<([^>]+)>\(res\);/g,
  (m, p, type) => {
    const pub = /\/checkouts\/public\//.test(p);
    if (pub) return `return jsonFetch<${type}>(\`${p}\`, { auth: false });`;
    return `return jsonFetch<${type}>(\`${p}\`);`;
  },
);

// getPublicCheckout specifically
s = s.replace(
  /export async function getPublicCheckout\(token: string\) \{[\s\S]*?\n\}/,
  `export async function getPublicCheckout(token: string) {
  return jsonFetch<PublicCheckout>(
    \`/checkouts/public/\${encodeURIComponent(token)}\`,
    { cache: 'no-store', auth: false },
  );
}`,
);

// Fix trailing commas / awkward spreads
s = s.replace(/\{ \.\.\.(\{[\s\S]*?\}), auth: false \}/g, "{ ...$1, auth: false }");
s = s.replace(/,\s*,/g, ",");

fs.writeFileSync(path, s);
console.log("left fetch API_URL", (s.match(/fetch\(`\$\{API_URL\}/g) || []).length);
console.log("parseJson(res)", (s.match(/parseJson<[^>]+>\(res\)/g) || []).length);
