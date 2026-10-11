'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { minibusFare, minibusRateFor } = require('./pricing');

test('minibus applies the agreed whole-route rate at exact boundaries', () => {
  const cases = [
    [0, 54, 0],
    [50, 54, 2700],
    [50.1, 50, 2510],
    [51, 50, 2550],
    [70, 50, 3500],
    [99, 50, 4950],
    [99.9, 50, 5000],
    [100, 43, 4300],
    [150, 43, 6450]
  ];

  for (const [km, rate, fare] of cases) {
    assert.equal(minibusRateFor(km), rate, `rate at ${km} km`);
    assert.equal(minibusFare(km), fare, `fare at ${km} km`);
  }
});

test('minibus rejects invalid distances', () => {
  for (const km of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => minibusFare(km), RangeError);
  }
});
