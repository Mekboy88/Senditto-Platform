/**
 * Platform API endpoint. Same-origin: Caddy proxies /api to the control API,
 * so no host or IP is ever exposed in the browser or in this repository.
 */
window.SENDITTO_PLATFORM_CONFIG = { apiBase: window.location.origin };
