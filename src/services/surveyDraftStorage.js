import * as Keychain from 'react-native-keychain';

const service = type => 'com.rentalhubng.survey-draft.' + (type === 'landlord' ? 'landlord' : 'tenant');
const valid = value => typeof value === 'string' && /^[A-Za-z0-9_-]{24,64}$/.test(value);
export const surveyDraftStorage = {
  async get(type) { const saved = await Keychain.getGenericPassword({service:service(type)}); return saved && valid(saved.password) ? saved.password : ''; },
  async save(type, token) { if (!valid(token)) throw new Error('Invalid survey draft'); await Keychain.setGenericPassword('survey-draft',token,{service:service(type),accessible:Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY}); },
  async clear(type) { await Keychain.resetGenericPassword({service:service(type)}); },
};
