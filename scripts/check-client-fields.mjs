#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   CLIENT FIELD COVERAGE

   The client supplied 24 required fields. This asserts that each one has both
   a label a user can see and a place in the saved profile to store it, so a
   later refactor cannot quietly drop one.

   Run: npm run check:fields
   ═══════════════════════════════════════════════════════════════════════════ */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "../lib/profile/migrate.mjs";
import { FIRST_RUN_V0 } from "../lib/profile/schema.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const GREEN = "\x1b[32m", RED = "\x1b[31m", DIM = "\x1b[2m", OFF = "\x1b[0m";

/* Every .jsx/.mjs under app, components and lib. */
function collect(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e === ".next") continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) collect(p, out);
    else if (/\.(jsx?|mjs)$/.test(e)) out.push(p);
  }
  return out;
}
const src = collect(join(root, "app"))
  .concat(collect(join(root, "components")), collect(join(root, "lib")))
  .map((f) => readFileSync(f, "utf8"))
  .join("\n");

const plan = migrate(FIRST_RUN_V0);
const at = (path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), plan);

/* label: text the user sees. path: where the answer is stored. */
const FIELDS = [
  [1,  "Full Name",                            "Full Name",                          "personal.fullName"],
  [2,  "Date of Birth",                        "Date of Birth",                      "personal.dob"],
  [3,  "Salary (monthly)",                     "Salary",                             "incomes"],
  [4,  "Other Income (if any)",                "Other Income",                       "incomes"],
  [5,  "Average Salary Growth (annual %)",     "Average Salary Growth",              "incomes"],
  [6,  "Household expenses (monthly)",         "Household expenses",                 "expenses.household"],
  [7,  "Rent Expenses (monthly)",              "Rent (₹/month)",                     "expenses.rent"],
  [8,  "Medical Insurance — self",             "Medical Insurance of your own",      "medical.self.enabled"],
  [9,  "Medical Insurance — parents",          "Medical Insurance cover for your parents", "medical.parents.enabled"],
  [10, "Mutual Fund SIPs (monthly)",           "Mutual Fund SIPs",                   "contributions.mfSip.amount"],
  [11, "NPS contribution (monthly)",           "NPS Contribution",                   "contributions.nps.amount"],
  [12, "PPF Contribution (monthly)",           "PPF Contribution",                   "contributions.ppf.amount"],
  [13, "EPF Contribution (monthly)",           "EPF Contribution",                   "contributions.epf.amount"],
  [14, "Recurring Deposits (monthly)",         "Recurring Deposits (RDs)",           "contributions.rd.amount"],
  [15, "LIC Premiums (monthly)",               "LIC Insurance Premiums",             "contributions.lic.amount"],
  [16, "Other (please specify)",               "Add Other Contribution",             "contributions.other"],
  [17, "Current Value of Mutual Funds",        "Current Value of Mutual Funds",      "holdings.mf"],
  [18, "Current Value of FD/RD",               "Combined FD / RD",                   "holdings.fd"],
  [19, "Current Value of PPF",                 "Current Value of PPF",               "holdings.ppf"],
  [20, "Current Value of NPS",                 "Current Value of NPS",               "holdings.nps"],
  [21, "Current Value of EPF",                 "Current Value of EPF",               "holdings.epf"],
  [22, "Current Value of Stocks",              "Current Value of Stocks",            "holdings.stocks"],
  [23, "Current value of Crypto",              "Current value of Crypto",            "holdings.crypto"],
  [24, "Life Insurance value (Rs)",            "Life Insurance value",               "lifeInsurance.value"],
];

console.log(`\nClient field coverage — ${FIELDS.length} required fields\n`);
let failures = 0;
for (const [n, name, label, path] of FIELDS) {
  const hasLabel = src.includes(label);
  const hasStore = at(path) !== undefined;
  const ok = hasLabel && hasStore;
  if (!ok) failures++;
  const why = ok ? "" : `  ${RED}${!hasLabel ? `no label "${label}"` : ""}${!hasStore ? ` no storage at ${path}` : ""}${OFF}`;
  console.log(`  ${ok ? GREEN + "OK  " + OFF : RED + "MISS" + OFF}  ${String(n).padStart(2)}. ${name.padEnd(38)} ${DIM}${path}${OFF}${why}`);
}

console.log("");
if (failures) {
  console.log(`${RED}${failures} of ${FIELDS.length} client fields unaccounted for${OFF}\n`);
  process.exit(1);
}
console.log(`${GREEN}All ${FIELDS.length} client fields have a label and a storage location${OFF}\n`);
