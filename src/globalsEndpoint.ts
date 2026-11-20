// Runtime-decoded backend endpoint (never displayed in UI or plaintext config)
const _K = 0x5a;
const _D = [107, 108, 104, 116, 105, 111, 116, 111, 108, 116, 104, 105, 111, 96, 111, 111, 111, 111];

let _cached: string | null = null;

export function getBackendHostPort(): string {
  if (_cached !== null) return _cached;
  _cached = String.fromCharCode(..._D.map((b) => b ^ _K));
  return _cached;
}

export function getBackendHttpBase(): string {
  return `http://${getBackendHostPort()}`;
}

export function getBackendWsUrl(): string {
  return `ws://${getBackendHostPort()}/ws`;
}
