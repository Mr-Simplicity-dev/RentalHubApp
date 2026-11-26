const canManageStaff = user => user?.user_type === 'super_admin';
const identityDestination = user => canManageStaff(user) ? 'StaffIdentityManagement' : 'MyStaffIdentity';
const actionsForStatus = status => ({
  pending_approval: ['approve', 'reject'],
  active: ['suspend', 'revoke'],
  suspended: ['reinstate', 'revoke'],
  rejected: ['activate'],
  revoked: ['activate'],
}[status] || []);
const freshForm = (identity = {}) => ({
  user_id: identity.user_id ? String(identity.user_id) : '',
  full_name: identity.full_name || '',
  official_role: identity.official_role || '',
  department: identity.department || '',
  engagement_type: identity.engagement_type || 'field_agent',
  approved_activities: Array.isArray(identity.approved_activities) ? [...identity.approved_activities] : [],
  financial_collection_authorized: identity.financial_collection_authorized === true,
  valid_from: identity.valid_from ? String(identity.valid_from).slice(0, 10) : new Date().toISOString().slice(0, 10),
  expires_at: identity.expires_at ? String(identity.expires_at).slice(0, 10) : '',
});
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
function identityPayload(form, catalog, creating = true) {
  if (creating && (!Number.isSafeInteger(Number(form.user_id)) || Number(form.user_id) <= 0)) throw Error('Select an existing staff account.');
  const full_name = form.full_name.trim(), official_role = form.official_role.trim(), department = form.department.trim();
  if (!full_name || full_name.length > 255) throw Error('Enter the staff member’s full name (up to 255 characters).');
  if (!official_role || official_role.length > 150) throw Error('Enter the official role (up to 150 characters).');
  if (!department || department.length > 150) throw Error('Enter the department (up to 150 characters).');
  if (!Object.prototype.hasOwnProperty.call(catalog.engagement_types || {}, form.engagement_type)) throw Error('Select an available engagement type.');
  const activities = new Set((catalog.approved_activity_catalog || []).map(item => item.code));
  if (!Array.isArray(form.approved_activities) || form.approved_activities.some(code => !activities.has(code))) throw Error('Select activities from the approved list.');
  if ((form.valid_from && !validDate(form.valid_from)) || (form.expires_at && !validDate(form.expires_at))) throw Error('Use a valid date in YYYY-MM-DD format.');
  if (form.expires_at && form.valid_from && form.expires_at <= form.valid_from) throw Error('The expiry date must be after the start date.');
  return {
    ...(creating ? { user_id: Number(form.user_id) } : {}), full_name, official_role, department,
    engagement_type: form.engagement_type, approved_activities: [...new Set(form.approved_activities)],
    financial_collection_authorized: form.financial_collection_authorized === true,
    valid_from: form.valid_from || null, expires_at: form.expires_at || null,
  };
}
module.exports = { canManageStaff, identityDestination, actionsForStatus, freshForm, identityPayload };
