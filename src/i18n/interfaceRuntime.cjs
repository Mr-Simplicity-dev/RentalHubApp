const copy = require('./interfaceCopy.json');
let language = 'en';
const listeners = new Set();
const normalize = value => value.replace(/\s+/g, ' ').trim().toLowerCase();
const setInterfaceLanguage = value => { if (language === value) return; language = value; listeners.forEach(listener => listener()); };
const getInterfaceLanguage = () => language;
const subscribeInterfaceLanguage = listener => { listeners.add(listener); return () => listeners.delete(listener); };
const translateUi = (text, variables = {}) => {
  if (typeof text !== 'string') return text;
  const entry = copy[normalize(text)] || copy[normalize(text).replace(/_/g, ' ')];
  const translated = language === 'en' || !entry?.[language] ? text : (text.match(/^\s*/)[0] + entry[language].trim() + text.match(/\s*$/)[0]);
  return translated.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => variables[key] == null ? match : String(variables[key]));
};
module.exports = { setInterfaceLanguage, getInterfaceLanguage, subscribeInterfaceLanguage, translateUi };
