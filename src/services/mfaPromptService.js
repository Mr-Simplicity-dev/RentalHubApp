// Privileged endpoints (everything behind requireSuperAdmin / financial or
// support dashboards) return 403 { code: 'MFA_REQUIRED' } unless a TOTP code
// was verified in the last 15 minutes. The axios interceptor asks for a code
// here, this module owns the pending promise, and <MfaCodeModal /> renders it.

let pending = null;
let attempt = 0;
const listeners = new Set();

const emit = () => {
  const state = getMfaState();
  listeners.forEach((listener) => {
    try {
      listener(state);
    } catch (error) {
      // Listener errors must never break the challenge flow.
    }
  });
};

export const getMfaState = () => {
  if (!pending) return { visible: false, attempt: 0 };
  return { visible: true, attempt: pending.attempt };
};

export const subscribeMfaChallenge = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// Resolves with the 6-digit code the user typed. Concurrent requests share one
// prompt (and one code), so parallel dashboard loads do not stack modals.
export const requestMfaCode = () => {
  if (pending) return pending.promise;

  attempt += 1;
  let resolveCode;
  let rejectCode;
  const promise = new Promise((resolve, reject) => {
    resolveCode = resolve;
    rejectCode = reject;
  });

  pending = { promise, resolve: resolveCode, reject: rejectCode, attempt };
  emit();
  return promise;
};

export const submitMfaCode = (code) => {
  const current = pending;
  if (!current) return;
  pending = null;
  emit();
  current.resolve(String(code || '').trim());
};

export const cancelMfaChallenge = () => {
  const current = pending;
  if (!current) return;
  pending = null;
  attempt = 0;
  emit();
  current.reject(new Error('MFA_CHALLENGE_CANCELLED'));
};

// Called after a request that carried a code succeeded, so the next real
// challenge starts counting from a fresh prompt again.
export const resetMfaAttempts = () => {
  attempt = 0;
};
