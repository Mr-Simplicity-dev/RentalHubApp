/**
 * ICE servers for calls.
 *
 * STUN alone only tells each side its public address; it cannot relay media.
 * On Nigerian mobile networks (carrier-grade NAT) a direct path often cannot
 * be found at all, so a call that works on WiFi silently fails on data. A TURN
 * relay is what makes calls connect reliably, so it is preferred when set.
 *
 * Credentials come from the environment (EXPO_PUBLIC_* so Expo inlines them at
 * build time) and are never hard-coded.
 */
export const getWebRtcIceServers = () => {
  const turnUrl = process.env.EXPO_PUBLIC_TURN_URL || process.env.TURN_URL;
  const turnUsername = process.env.EXPO_PUBLIC_TURN_USERNAME || process.env.TURN_USERNAME;
  const turnPassword = process.env.EXPO_PUBLIC_TURN_PASSWORD || process.env.TURN_PASSWORD;

  const servers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnPassword,
    });

    // Some providers hand out the UDP and TCP endpoints separately.
    const turnUrls = Array.isArray(turnUrl) ? turnUrl : [turnUrl];
    const seen = new Set(turnUrls.map((url) => String(url)));
    for (const url of turnUrls) {
      const value = String(url);
      if (value.startsWith('turn:')) {
        const tls = `turns:${value.slice(5)}`;
        if (!seen.has(tls)) {
          seen.add(tls);
          servers.push({ urls: tls, username: turnUsername, credential: turnPassword });
        }
      }
    }
  }

  return servers;
};

export const isVideoEnabledCall = (callType) =>
  ['video', 'virtual_tour'].includes(callType);

/**
 * Whether a relay is available. Worth surfacing in logs: "calls only fail on
 * mobile data" is the classic symptom of a missing or unreachable TURN server.
 */
export const isTurnConfigured = () =>
  Boolean(process.env.EXPO_PUBLIC_TURN_URL || process.env.TURN_URL);
