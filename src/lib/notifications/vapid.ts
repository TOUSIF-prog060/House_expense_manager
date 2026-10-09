import webPush from 'web-push';

if (typeof window !== 'undefined') {
  throw new Error('VAPID module cannot be imported on the client.');
}

// Built-in default key pair for zero-config deployments, overridable via environment variables
const DEFAULT_PUBLIC_KEY =
  'BJadHF5Gj_lMrh_6DeqHiXVdnF8ui-wKfpmb_BYgx5ygfWAg5f3mWskvmoCbSYDn25hjyVoEnfcwZoB08L87G7Y';
const DEFAULT_PRIVATE_KEY =
  'R2c0lszi7Sjhd08FJguNv36YxvLs17ExutZ-Nu3E1DM';

let configured = false;

export function getPublicVapidKey(): string {
  return (
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    process.env.VAPID_PUBLIC_KEY ||
    DEFAULT_PUBLIC_KEY
  );
}

export function getVapidConfig() {
  const publicKey = getPublicVapidKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY || DEFAULT_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@ourhome.app';

  if (!publicKey || !privateKey) {
    return null;
  }

  return { publicKey, privateKey, subject };
}

export function isVapidConfigured(): boolean {
  return getVapidConfig() !== null;
}

export function setupWebPush(): typeof webPush {
  const config = getVapidConfig();
  if (!config) {
    throw new Error(
      'Web Push VAPID keys are missing. Configure NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in your server environment.'
    );
  }

  if (!configured) {
    webPush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
    configured = true;
  }

  return webPush;
}
