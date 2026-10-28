import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePlan } from "../src/lib/app/params.ts";

const p = (q: string) => parsePlan(new URLSearchParams(q));

test("parameter API kanonik: tidak bisa dipakai menghindari cache CDN", () => {
  assert.deepEqual(p("symbol=BBCA.JK&years=10&mode=dasar&stepUp=0.075"), { symbol: "BBCA.JK", years: 10, mode: "dasar", stepUp: 0.075, dividends: "putar" });
  assert.deepEqual(p("symbol=BBCA.JK&years=7&dividen=tunai"), { symbol: "BBCA.JK", years: 7, mode: "dasar", stepUp: 0, dividends: "tunai" });
  assert.ok("error" in p("symbol=SPY&dividen=bebas"), "mode dividen asing ditolak");
  assert.ok("error" in p("symbol=SPY&years=10&x=acak"), "parameter asing ditolak");
  assert.ok("error" in p("symbol=SPY&years=10&stepUp=0.1000001"), "kenaikan bukan kelipatan 0,1% ditolak");
  assert.ok("error" in p("symbol=SPY&years=31"));
  assert.ok("error" in p("symbol=..&years=10"), "simbol harus diawali huruf/angka/^");
  assert.ok(!("error" in p("symbol=%5EJKSE&years=5")));
});
