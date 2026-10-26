import * as Sentry from '@sentry/sveltekit';

Sentry.init({
  dsn: 'https://1ca49bbc5bc1aa4e51fdc5e678b22892@o4512270423293952.ingest.de.sentry.io/4512270441119824',

  tracesSampleRate: 1.0,
  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: import.meta.env.DEV,
});