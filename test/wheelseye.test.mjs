import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWheelseyeEnvelope } from '../lib/wheelseye.mjs';
import { telemetryDayRange } from '../lib/fleet.mjs';

test('normalizes WheelsEye current location without inventing fuel data', () => {
  const value = normalizeWheelseyeEnvelope({
    success: true,
    serverTime: 1793096698,
    data: {
      list: [
        {
          vehicleNumber: 'TN99Z5641',
          deviceNumber: '867542081420195',
          vendorCode: 'WE9292385',
          latitude: 10.93,
          longitude: 76.97,
          speed: 0,
          dttimeInEpoch: 1793096691,
          ignition: false,
          chargeOn: true,
        },
      ],
    },
  });
  assert.equal(value.data.vehicles[0].deviceId, '867542081420195');
  assert.equal(value.data.vehicles[0].gpsTime, 1793096691);
  assert.equal(value.data.vehicles[0].fuelData, null);
  assert.equal(value.data.vehicles[0].chargeOn, true);
});

test('builds a complete telemetry day using the India timezone', () => {
  const range = telemetryDayRange('2026-11-06');
  assert.equal(range.from.toISOString(), '2026-11-05T18:30:00.000Z');
  assert.equal(range.to.toISOString(), '2026-11-06T18:30:00.000Z');
});

test('rejects invalid telemetry dates', () => {
  assert.throws(() => telemetryDayRange('2026-02-31'), /valid telemetry date/);
});
