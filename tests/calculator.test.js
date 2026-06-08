const assert = require('assert');
const {
  estimateOneRepMax,
  calculateProfile,
  scoreLift,
  toKg,
  fromKg,
} = require('../app.js');

assert.strictEqual(toKg(220.462, 'lb').toFixed(1), '100.0');
assert.strictEqual(fromKg(100, 'lb').toFixed(1), '220.5');

assert.strictEqual(estimateOneRepMax(100, 1), 100);

const fiveRepMax = estimateOneRepMax(100, 5);
assert.ok(fiveRepMax > 112 && fiveRepMax < 118, `unexpected 5RM estimate: ${fiveRepMax}`);

const profile = calculateProfile({
  sex: 'male',
  age: '30',
  bodyweight: '80',
  unit: 'kg',
  squatWeight: '140',
  squatReps: '5',
  benchWeight: '100',
  benchReps: '5',
  deadliftWeight: '180',
  deadliftReps: '3',
});

assert.strictEqual(profile.unit, 'kg');
assert.ok(profile.totalKg > 450 && profile.totalKg < 500, `unexpected total: ${profile.totalKg}`);
assert.ok(profile.totalRatio > 5.5 && profile.totalRatio < 6.3, `unexpected ratio: ${profile.totalRatio}`);
assert.ok(profile.totalPercentile >= 50 && profile.totalPercentile <= 95, `unexpected percentile: ${profile.totalPercentile}`);

const strongDeadlift = scoreLift({
  lift: 'deadlift',
  oneRmKg: 260,
  bodyweightKg: 80,
  sex: 'male',
  age: 30,
});

assert.ok(strongDeadlift.percentile >= 90, `unexpected deadlift percentile: ${strongDeadlift.percentile}`);

const olderProfile = calculateProfile({
  sex: 'female',
  age: '60',
  bodyweight: '63',
  unit: 'kg',
  squatWeight: '80',
  squatReps: '3',
  benchWeight: '45',
  benchReps: '5',
  deadliftWeight: '105',
  deadliftReps: '3',
});

assert.strictEqual(olderProfile.ageBucket, '55-64');
assert.ok(olderProfile.totalPercentile >= 1 && olderProfile.totalPercentile <= 99);

console.log('calculator.test.js: PASS');
