import * as http2 from 'http2';
import * as crypto from 'crypto';

let cachedJwt: { token: string; issuedAt: number } | null = null;

function createApnsJwt(): string {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const authKeyBase64 = process.env.APNS_AUTH_KEY_BASE64;

  if (!keyId || !teamId || !authKeyBase64) {
    throw new Error('APNs environment variables not configured (APNS_KEY_ID, APNS_TEAM_ID, APNS_AUTH_KEY_BASE64)');
  }

  const now = Math.floor(Date.now() / 1000);

  // Cache JWT for 50 minutes (APNs allows up to 60 min)
  if (cachedJwt && (now - cachedJwt.issuedAt) < 3000) {
    return cachedJwt.token;
  }

  const authKey = Buffer.from(authKeyBase64, 'base64').toString('utf8');

  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: keyId })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({ iss: teamId, iat: now })).toString('base64url');

  const signer = crypto.createSign('SHA256');
  signer.update(`${header}.${claims}`);
  const signature = signer.sign(authKey, 'base64url');

  const jwt = `${header}.${claims}.${signature}`;
  cachedJwt = { token: jwt, issuedAt: now };

  return jwt;
}

export async function sendApnsPush(
  deviceToken: string,
  title: string,
  body: string,
): Promise<boolean> {
  const jwt = createApnsJwt();
  const bundleId = 'com.dailyconnect.app';

  return new Promise((resolve) => {
    const client = http2.connect('https://api.push.apple.com');

    client.on('error', () => {
      resolve(false);
    });

    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      'authorization': `bearer ${jwt}`,
      'apns-topic': bundleId,
      'apns-push-type': 'alert',
      'apns-priority': '10',
    });

    const payload = JSON.stringify({
      aps: {
        alert: { title, body },
        sound: 'default',
      },
    });

    let statusCode = 0;

    req.on('response', (headers) => {
      statusCode = Number(headers[':status']);
    });

    req.on('end', () => {
      client.close();
      resolve(statusCode === 200);
    });

    req.on('error', () => {
      client.close();
      resolve(false);
    });

    req.write(payload);
    req.end();
  });
}

export function isApnsConfigured(): boolean {
  return !!(process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && process.env.APNS_AUTH_KEY_BASE64);
}
