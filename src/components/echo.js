import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { getCookie } from './cookieUtils';

window.Pusher = Pusher;
window.Pusher.logToConsole = true; // Enable internal Pusher logging

const appKey  = import.meta.env.VITE_REVERB_APP_KEY;
const wsHost  = import.meta.env.VITE_REVERB_HOST;
const wsPort  = Number(import.meta.env.VITE_REVERB_PORT) || 80;
const wssPort = Number(import.meta.env.VITE_REVERB_PORT) || 443;
const scheme  = import.meta.env.VITE_REVERB_SCHEME || 'https';
const forceTLS = scheme === 'https';

const apiBaseUrl   = import.meta.env.VITE_API_BASE_URL || window.location.origin;
const authEndpoint = `${apiBaseUrl}/api/broadcasting/auth`;

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: Pusher-js only recognises 'ws', 'xhr_streaming', 'xhr_polling',
// and 'sockjs' as valid transport names.  The name 'wss' does NOT exist in
// Pusher's transport registry, so ['wss'] alone effectively provides zero
// valid transports and Pusher immediately enters the "failed" state.
//
// The correct pattern is ['ws', 'wss'] (or just ['ws']).  With forceTLS:true,
// Pusher will dial the ws transport over TLS (wss://) automatically.
// See: https://pusher.com/docs/channels/using_channels/connection/
// ─────────────────────────────────────────────────────────────────────────────
const enabledTransports = ['ws', 'wss'];

console.log(">>>>>>> EXECUTION REACHED echo.js <<<<<<<<");
console.log("==========================================");
console.log("[Echo Runtime Config] appKey          :", appKey);
console.log("[Echo Runtime Config] wsHost          :", wsHost);
console.log("[Echo Runtime Config] wsPort          :", wsPort);
console.log("[Echo Runtime Config] wssPort         :", wssPort);
console.log("[Echo Runtime Config] scheme          :", scheme);
console.log("[Echo Runtime Config] forceTLS        :", forceTLS);
console.log("[Echo Runtime Config] enabledTransports:", enabledTransports);
console.log("[Echo Runtime Config] authEndpoint    :", authEndpoint);
console.log("==========================================");
console.log("[Echo Runtime Config] Expected WSS URL:", `wss://${wsHost}:${wssPort}/app/${appKey}`);
console.log("==========================================");

// ─────────────────────────────────────────────────────────────────────────────
// Stale-instance guard
// Vite HMR re-executes this module on every hot reload.  If a previous Echo
// instance already lives on window.Echo we must fully disconnect it before
// creating a new one, otherwise the dead socket re-registers event listeners
// and the new instance never gets a clean start.
// ─────────────────────────────────────────────────────────────────────────────
if (window.Echo) {
  try {
    const prevState = window.Echo.connector?.pusher?.connection?.state;
    console.log(`[Echo] Stale window.Echo detected (state: ${prevState}). Disconnecting…`);
    window.Echo.disconnect();
  } catch (e) {
    console.warn('[Echo] Error while disconnecting stale instance:', e);
  }
  window.Echo = null;
}

const echo = new Echo({
  broadcaster: 'reverb',
  key: appKey,
  wsHost: wsHost,
  wsPort: wsPort,
  wssPort: wssPort,
  forceTLS: forceTLS,
  enabledTransports: enabledTransports,
  authorizer: (channel) => ({
    authorize: (socketId, callback) => {
      const token = getCookie('user_token');
      console.log(`[Echo Auth] Authorizing channel : ${channel.name}`);
      console.log(`[Echo Auth] socketId            : ${socketId}`);
      console.log(`[Echo Auth] token present       : ${!!token}`);
      console.log(`[Echo Auth] authEndpoint        : ${authEndpoint}`);

      fetch(authEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          socket_id: socketId,
          channel_name: channel.name,
        }),
      })
        .then((res) => {
          if (!res.ok) throw new Error('Echo auth failed with status ' + res.status);
          return res.json();
        })
        .then((data) => {
          console.log(`[Echo Auth] SUCCESS for channel: ${channel.name}`, data);
          callback(null, data);
        })
        .catch((err) => {
          console.error('[Echo Auth] FAILED:', err);
          callback(err, null);
        });
    },
  }),
});

window.Echo = echo;

// ─── Connection state diagnostics ──────────────────────────────────────────
echo.connector.pusher.connection.bind('state_change', function(states) {
  console.log(`[Pusher] Connection state: ${states.previous} → ${states.current}`);
  if (states.current === 'connected') {
    console.log('[Pusher] ✅ CONNECTED — window.Echo.connector.pusher.connection.state is now "connected"');
  }
  if (states.current === 'failed') {
    console.error('[Pusher] ❌ FAILED — check wsHost / enabledTransports / forceTLS above');
  }
});

echo.connector.pusher.connection.bind('error', function(err) {
  console.error('[Pusher] Connection error:', err);
});

echo.connector.pusher.connection.bind('connected', function() {
  const socketId = echo.socketId();
  console.log('[Pusher] ✅ Socket connected. socket_id:', socketId);
});

console.log("[Echo FINAL] window.Echo assigned ✓");
console.log("[Echo FINAL] Initial connection state:", echo.connector.pusher.connection.state);

export default echo;
