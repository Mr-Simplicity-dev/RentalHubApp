const timestampOf = (...values) => values.reduce((latest, value) => {
  const timestamp = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(timestamp) ? Math.max(latest, timestamp) : latest;
}, 0);

const chooseNewestResumeCandidate = ({ localCandidate, remoteCandidate, remoteState }) => {
  const state = remoteState?.state || remoteState || null;
  const terminalAt = timestampOf(
    state?.last_completed_at,
    state?.last_skipped_at,
    state?.last_dismissed_at,
    ['completed', 'skipped', 'dismissed'].includes(state?.status)
      ? state?.last_event_at || state?.updated_at
      : null
  );
  return [localCandidate, remoteCandidate]
    .filter(Boolean)
    .filter((candidate) => !terminalAt || Number(candidate.timestamp || 0) > terminalAt)
    .sort((left, right) => Number(right.timestamp || 0) - Number(left.timestamp || 0))[0] || null;
};

const sanitizeTourIdentifier = (value, maxLength = 120) => {
  const normalized = String(value || '')
    .split(/[?#]/, 1)[0]
    .replace(/[^a-zA-Z0-9_.:-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, maxLength);
  return normalized || null;
};

const sanitizeTourContext = (context = {}) => {
  const safe = {};
  ['workflow_id', 'route', 'reason', 'target_status', 'action_id'].forEach((key) => {
    const value = sanitizeTourIdentifier(context[key], key === 'route' ? 80 : 120);
    if (value) safe[key] = value;
  });
  if (typeof context.action_required === 'boolean') {
    safe.action_required = context.action_required;
  }
  return safe;
};

module.exports = {
  chooseNewestResumeCandidate,
  sanitizeTourContext,
  sanitizeTourIdentifier,
  timestampOf,
};
