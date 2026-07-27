import crypto from "crypto";

// The QR code shown to students encodes {sessionId, token}.
// `token` is an HMAC of the session secret + a time bucket, so it
// automatically rotates every ROTATE_SECONDS. A screenshot or a token
// read aloud/shared becomes invalid almost immediately.
export const ROTATE_SECONDS = 12;

function bucketFor(timestampMs) {
  return Math.floor(timestampMs / 1000 / ROTATE_SECONDS);
}

export function currentToken(secret) {
  return tokenForBucket(secret, bucketFor(Date.now()));
}

function tokenForBucket(secret, bucket) {
  return crypto
    .createHmac("sha256", secret)
    .update(String(bucket))
    .digest("hex")
    .slice(0, 16);
}

// Accepts the current bucket and the previous one, to tolerate the student's
// device/network lag right at a rotation boundary.
export function isTokenValid(secret, token) {
  const nowBucket = bucketFor(Date.now());
  for (const b of [nowBucket, nowBucket - 1]) {
    if (tokenForBucket(secret, b) === token) return true;
  }
  return false;
}

export function secondsUntilNextRotation() {
  const nowMs = Date.now();
  const bucketStartMs = bucketFor(nowMs) * ROTATE_SECONDS * 1000;
  return ROTATE_SECONDS - Math.floor((nowMs - bucketStartMs) / 1000);
}
