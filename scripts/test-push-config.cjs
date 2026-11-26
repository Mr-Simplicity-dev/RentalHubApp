const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePushConfig } = require('./verify-push-config.cjs');
const config = () => ({ project_info: { project_id: 'test-only', project_number: '12345' }, client: [{ client_info: { mobilesdk_app_id: '1:12345:android:testonly', android_client_info: { package_name: 'com.rentalhubng' } }, api_key: [{ current_key: 'public-test-value-only' }] }] });
test('public Android Firebase configuration must match the RentalHub package and project', () => {
  assert.equal(validatePushConfig(config()).packageName, 'com.rentalhubng');
  const wrongPackage = config(); wrongPackage.client[0].client_info.android_client_info.package_name = 'com.example.other';
  assert.throws(() => validatePushConfig(wrongPackage), /package/);
  const wrongProject = config(); wrongProject.client[0].client_info.mobilesdk_app_id = '1:99999:android:testonly';
  assert.throws(() => validatePushConfig(wrongProject), /match/);
});
test('private service-account credentials cannot be mistaken for public app configuration', () => {
  assert.throws(() => validatePushConfig({ type: 'service_account', private_key: 'TEST ONLY' }), /private service-account/);
  assert.throws(() => validatePushConfig({}), /project details/);
});
