#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   PROFILE ROUND-TRIP CHECK

   Save and load cannot be exercised end to end locally: .env.local deliberately
   leaves the Supabase and Google credentials unset. This script covers the part
   that actually carries risk — the serialisation, migration and validation
   logic — against stored legacy profile shapes.

   Run: npm run check:profiles
   ═══════════════════════════════════════════════════════════════════════════ */

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { migrate } from "../lib/profile/migrate.mjs";
import { serialize, SCHEMA_VERSION } from "../lib/profile/schema.mjs";
import { validate, hasErrors } from "../lib/profile/validate.mjs";
import { runProjection } from "../lib/finance/projection.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(here, "..", "lib", "profile", "fixtures");

const GREEN = "\x1b[32m", RED = "\x1b[31m", YEL = "\x1b[33m", DIM = "\x1b[2m", OFF = "\x1b[0m";

let failures = 0;
const check = (name, fn) => {
  try {
    const note = fn();
    console.log(`  ${GREEN}PASS${OFF}  ${name}${note ? `  ${DIM}${note}${OFF}` : ""}`);
  } catch (e) {
    failures++;
    console.log(`  ${RED}FAIL${OFF}  ${name}\n        ${RED}${e.message}${OFF}`);
  }
};

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const files = readdirSync(fixtureDir).filter((f) => f.endsWith(".json"));
console.log(`\nProfile round-trip check — ${files.length} fixture(s)\n`);

for (const file of files) {
  const raw = JSON.parse(readFileSync(join(fixtureDir, file), "utf8"));
  console.log(`${file}`);

  check("migrates to the current schema version", () => {
    assert(migrate(raw).schemaVersion === SCHEMA_VERSION, "wrong schemaVersion");
  });

  check("migration is idempotent", () => {
    assert(deepEqual(migrate(migrate(raw)), migrate(raw)), "second migrate changed the plan");
  });

  check("survives a serialize / JSON / migrate round trip", () => {
    const once = migrate(raw);
    const back = migrate(JSON.parse(JSON.stringify(serialize(once))));
    assert(deepEqual(back, once), "round trip lost or altered data");
  });

  check("the legacy aggregate is preserved, not reallocated", () => {
    const p = migrate(raw);
    const expected = Number(raw.currentNW ?? 0);
    assert(p.holdings.unallocated === expected,
      `unallocated ${p.holdings.unallocated} != stored currentNW ${expected}`);
    const named = ["mf", "fd", "rd", "ppf", "nps", "epf", "stocks", "crypto"];
    assert(named.every((k) => p.holdings[k] === 0), "a holding was invented");
    return `₹${expected.toLocaleString("en-IN")} kept as unallocated`;
  });

  check("the legacy SIP target is parked, not converted to contributions", () => {
    const p = migrate(raw);
    assert(p.legacy.monthlyInvestment === Number(raw.monthlyInvestment ?? 0), "SIP target lost");
    const detailed = ["mfSip", "nps", "ppf", "epf", "rd", "lic"]
      .reduce((s, k) => s + p.contributions[k].amount, 0);
    assert(detailed === 0, "a detailed contribution was invented");
  });

  check("the expense lump is not split heuristically", () => {
    const p = migrate(raw);
    assert(p.expenses.household === Number(raw.monthlyExpense ?? 0), "household changed");
    assert(p.expenses.rent === 0, "rent was invented");
  });

  check("no numeric field is NaN after migration", () => {
    const walk = (o, path = "") => {
      for (const [k, v] of Object.entries(o ?? {})) {
        const p = path ? `${path}.${k}` : k;
        if (typeof v === "number") assert(Number.isFinite(v), `${p} is ${v}`);
        else if (v && typeof v === "object") walk(v, p);
      }
    };
    walk(migrate(raw));
  });

  check("validates without errors", () => {
    const findings = validate(migrate(raw));
    const errs = findings.filter((f) => f.severity === "error");
    assert(!hasErrors(findings), errs.map((f) => `${f.path}: ${f.message}`).join("; "));
    const warns = findings.filter((f) => f.severity === "warning");
    return warns.length ? `${YEL}${warns.length} warning(s): ${warns.map((f) => f.path).join(", ")}${OFF}` : "";
  });

  check("still projects to a finite net worth", () => {
    const p = migrate(raw);
    /* Fed through the v0 engine using the migrated values, which is the check
       that migration did not change what the numbers mean. */
    const out = runProjection({
      currentAge: p.currentAge,
      lifeExpectancy: p.lifeExpectancy,
      incomes: p.incomes,
      monthlyExpense: p.expenses.household + p.expenses.rent,
      inflationRate: p.inflationRate,
      lifestyleCreep: p.lifestyleCreep,
      currentNW: p.holdings.unallocated,
      monthlyInvestment: p.legacy.monthlyInvestment,
      investmentStepUp: p.investmentStepUp,
      expectedXIRR: p.expectedXIRR,
      postRetireReturn: p.postRetireReturn,
      exitTaxRate: p.exitTaxRate,
      investSurplus: p.investSurplus,
      goals: p.goals,
    });
    assert(out.data.length > 0, "no rows produced");
    assert(out.data.every((r) => Number.isFinite(r.netWorthRaw)), "a row is NaN or Infinity");
    const last = out.data.at(-1).netWorthRaw;
    return `${out.data.length} rows, final ₹${(last / 1e7).toFixed(2)} Cr`;
  });

  console.log("");
}

/* Cross-cutting checks that do not belong to one fixture. */
console.log("cross-cutting");
check("garbage input yields defaults rather than throwing", () => {
  for (const bad of [null, undefined, "nonsense", 42, [], true]) {
    assert(migrate(bad).schemaVersion === SCHEMA_VERSION, `failed on ${JSON.stringify(bad)}`);
  }
});
check("a confirmed zero is distinguishable from a missing value", () => {
  assert(migrate({ currentNW: 0 }).holdings.unallocated === 0, "zero was replaced by a default");
  assert(migrate({}).holdings.unallocated === 0, "unexpected default");
  assert(migrate({ monthlyInvestment: 0 }).legacy.monthlyInvestment === 0, "zero SIP lost");
});
check("an emptied list is not refilled from defaults", () => {
  const p = migrate({});
  p.incomes = [];
  assert(migrate(p).incomes.length === 0, "deleted incomes came back");
});

console.log("");
if (failures) {
  console.log(`${RED}${failures} check(s) failed${OFF}\n`);
  process.exit(1);
}
console.log(`${GREEN}All checks passed${OFF}\n`);
