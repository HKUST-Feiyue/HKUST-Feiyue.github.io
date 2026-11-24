/* Public-only settings. Secrets belong exclusively to Cloudflare Worker. */
window.HKUST_SUBMISSION_CONFIG = Object.freeze({
  enabled: true,
  apiEndpoint: 'https://hkust-feiyue-submissions.futseyi.workers.dev/submit',
  turnstileSiteKey: '0x4AAAAAAGQTBxcAxDK7wpD3'
});
