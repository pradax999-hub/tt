'use strict';

function minibusRateFor(km) {
  if (!Number.isFinite(km) || km < 0) throw new RangeError('Distance must be a non-negative finite number.');
  if (km <= 50) return 54;
  if (km < 100) return 50;
  return 43;
}

function minibusFare(km) {
  return Math.round((km * minibusRateFor(km)) / 10) * 10;
}

module.exports = { minibusFare, minibusRateFor };
