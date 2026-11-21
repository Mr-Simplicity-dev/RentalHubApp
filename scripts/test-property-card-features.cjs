const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('propertyParking utility resolves explicit parking_spaces, structured features, and amenities', async () => {
  const mod = await import('file://' + path.join(ROOT, 'src/utils/propertyParking.js'));
  const { getParkingSummary } = mod;

  assert.deepEqual(getParkingSummary({ parking_spaces: 3 }), {
    count: 3,
    hasParking: true,
    label: '3',
  });
  assert.deepEqual(
    getParkingSummary({
      structured_features: { parking: { available: true, details: { capacity: 2 } } },
    }),
    { count: 2, hasParking: true, label: '2' }
  );
  assert.deepEqual(
    getParkingSummary({ structured_features: { covered_parking: { available: true } } }),
    { count: 1, hasParking: true, label: '1' }
  );
  assert.deepEqual(getParkingSummary({ amenities: ['24/7 Power', 'Car Park'] }), {
    count: 1,
    hasParking: true,
    label: '1',
  });
  assert.deepEqual(getParkingSummary({}), { count: 0, hasParking: false, label: '0' });
});

test('Mobile PropertyCard displays beds, baths, parking, rent amount, and save icon', () => {
  const card = read('src/components/properties/PropertyCard.js');
  assert.match(card, /bed-outline/);
  assert.match(card, /water-outline/);
  assert.match(card, /car-outline/);
  assert.match(card, /getParkingSummary/);
  assert.match(card, /heart-outline/);
  assert.match(card, /formatCurrency\(property\?\.rent_amount\)/);
});

test('Mobile HomeScreen enables save on featured cards and full 37-state nationwide coverage', () => {
  const home = read('src/screens/home/HomeScreen.js');
  assert.match(home, /getPopularLocations\(37\)/);
  assert.match(home, /NATIONWIDE COVERAGE/);
  assert.match(home, /All 36 States & FCT/);
  assert.match(home, /Show all 37 states/);
  assert.match(home, /onSave=\{savingId === item\.id \? undefined : toggleSave\}/);
  assert.match(home, /isSaved=\{savedIds\.has\(item\.id\)\}/);
  // Count default Nigerian states (36 states + FCT = 37)
  const stateMatches = home.match(/\[\d+,\s*'[^']+'\]/g) || [];
  assert.equal(stateMatches.length, 37);
});

test('Mobile PropertyDetailScreen, AddPropertyScreen, and SubscribedPropertiesScreen support parking & save', () => {
  const detail = read('src/screens/home/PropertyDetailScreen.js');
  assert.match(detail, /car-outline/);
  assert.match(detail, /getParkingSummary\(property\)\.label/);

  const add = read('src/screens/dashboard/AddPropertyScreen.js');
  assert.match(add, /parking_spaces/);
  assert.match(add, /Parking spaces/);

  const sub = read('src/screens/shared/SubscribedPropertiesScreen.js');
  assert.match(sub, /onSave=/);
  assert.match(sub, /isSaved=/);
});
