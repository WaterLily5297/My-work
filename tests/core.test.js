const test = require("node:test");
const assert = require("node:assert/strict");
const { F, parseAnswer, matches, checkAnswers, sumTex, polyTex } = require("../js/core.js");

test("fractions reduce and keep the sign in the numerator", () => {
  assert.equal(F(6, -8).toString(), "-3/4");
  assert.equal(F(0, -5).toString(), "0");
  assert.equal(F(1, 2).add(F(1, 3)).toString(), "5/6");
  assert.equal(F(2, 3).div(F(4, 9)).toString(), "3/2");
  assert.equal(F(-3, 4).toTex(), "-\\frac{3}{4}");
});

test("parseAnswer understands the common ways people type numbers", () => {
  const v = (s) => parseAnswer(s)?.value.toString();
  assert.equal(v("3"), "3");
  assert.equal(v(" -3/4 "), "-3/4");
  assert.equal(v("+5"), "5");
  assert.equal(v("0.75"), "3/4");
  assert.equal(v(".5"), "1/2");
  assert.equal(v("−2"), "-2"); // Unicode minus
  assert.equal(v("１２/５"), "12/5"); // full-width digits
  assert.equal(v("4/8"), "1/2");
  assert.equal(parseAnswer("1/0"), null);
  assert.equal(parseAnswer("abc"), null);
  assert.equal(parseAnswer(""), null);
});

test("decimals need 3+ places unless exact", () => {
  assert.ok(matches(parseAnswer("0.333"), F(1, 3)));
  assert.ok(matches(parseAnswer("-0.667"), F(-2, 3)));
  assert.ok(!matches(parseAnswer("0.33"), F(1, 3)));
  assert.ok(!matches(parseAnswer("0.334"), F(1, 3)));
  assert.ok(matches(parseAnswer("0.5"), F(1, 2)));
});

test("unordered answers can be entered in any order", () => {
  const pr = { answers: [{ value: F(2) }, { value: F(-3) }], unordered: true };
  assert.ok(checkAnswers(pr, ["-3", "2"]).ok);
  assert.ok(!checkAnswers(pr, ["2", "2"]).ok);
  const ordered = { answers: [{ value: F(2) }, { value: F(-3) }] };
  assert.ok(!checkAnswers(ordered, ["-3", "2"]).ok);
});

test("TeX helpers format signs and coefficients", () => {
  assert.equal(polyTex([1, -3, 0, 2]), "x^{3} - 3 x^{2} + 2");
  assert.equal(polyTex([-1, 0, 1]), "-x^{2} + 1");
  assert.equal(polyTex([0, 0]), "0");
  assert.equal(sumTex([[F(-1, 2), "y"]]), "-\\frac{1}{2} y");
});
