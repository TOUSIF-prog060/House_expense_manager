import webPush from 'web-push';

if (typeof window !== 'undefined') {
  throw new Error('VAPID module cannot be imported on the client.');
}

let configured = false;

export function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
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
