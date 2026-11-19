function getIdentityRequirements(user = {}) {
  const hasPhoto = typeof user.has_live_photo === 'boolean' ? user.has_live_photo : Boolean(user.passport_photo_url);
  const hasDocument = typeof user.has_identity_document === 'boolean' ? user.has_identity_document : Boolean(user.nin || user.international_passport_number);
  const missing = [...(hasPhoto ? [] : ['live face photo']), ...(hasDocument ? [] : ['NIN or passport number'])];
  return { hasPhoto, hasDocument, missing, ready: missing.length === 0 };
}

module.exports = { getIdentityRequirements };
