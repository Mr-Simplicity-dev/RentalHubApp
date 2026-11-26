const fs = require('node:fs');
const path = require('node:path');

function validatePushConfig(config, packageName = 'com.rentalhubng') {
  if (!config || config.type === 'service_account' || config.private_key || config.private_key_id) {
    throw Error('Use the public Android google-services.json, not a private service-account key.');
  }
  const info = config.project_info;
  if (!info?.project_id || !/^\d+$/.test(String(info.project_number || ''))) {
    throw Error('Firebase project details are missing from google-services.json.');
  }
  const client = Array.isArray(config.client) ? config.client.find(item => item.client_info?.android_client_info?.package_name === packageName) : null;
  if (!client) throw Error('The Firebase Android app must use package ' + packageName + '.');
  if (!String(client.client_info?.mobilesdk_app_id || '').startsWith('1:' + info.project_number + ':android:')) {
    throw Error('Firebase Android app ID does not match its project.');
  }
  if (!Array.isArray(client.api_key) || !client.api_key.some(item => typeof item.current_key === 'string' && item.current_key.length > 10)) {
    throw Error('The public Firebase Android API key is missing.');
  }
  return { packageName, projectId: info.project_id, projectNumber: String(info.project_number) };
}

if (require.main === module) {
  try {
    const file = path.resolve(__dirname, '../android/app/google-services.json');
    if (!fs.existsSync(file)) throw Error('Firebase setup is incomplete: add the public Android config at android/app/google-services.json before building a release.');
    validatePushConfig(JSON.parse(fs.readFileSync(file, 'utf8')));
    console.log('Firebase Android client configuration passed. Expo FCM credentials and a real phone delivery test are still required.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { validatePushConfig };
