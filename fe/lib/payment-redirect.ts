const BACKEND_SEPAY_CHECKOUT_PATTERN = /\/(?:api\/v1\/)?payments\/sepay\/checkout\/([^/?#]+)/;
const FRONTEND_CHECKOUT_PATTERN = /\/payment\/checkout\/([^/?#]+)/;

export function normalizePaymentCheckoutRedirectUrl(redirectUrl: string): string {
  if (typeof window === 'undefined') return redirectUrl;

  try {
    const url = new URL(redirectUrl, window.location.origin);
    const backendMatch = url.pathname.match(BACKEND_SEPAY_CHECKOUT_PATTERN);
    const frontendMatch = url.pathname.match(FRONTEND_CHECKOUT_PATTERN);
    const token = backendMatch?.[1] || frontendMatch?.[1];

    if (!token) return redirectUrl;

    const normalized = new URL(`/payment/checkout/${token}`, window.location.origin);
    normalized.search = url.search;
    normalized.hash = url.hash;
    return normalized.toString();
  } catch {
    const backendMatch = redirectUrl.match(BACKEND_SEPAY_CHECKOUT_PATTERN);
    const frontendMatch = redirectUrl.match(FRONTEND_CHECKOUT_PATTERN);
    const token = backendMatch?.[1] || frontendMatch?.[1];
    return token ? `/payment/checkout/${token}` : redirectUrl;
  }
}
