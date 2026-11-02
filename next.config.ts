import type { NextConfig } from 'next';

// Security headers on every page. KROVA's own pages are never meant to be shown inside another site (no iframes
// anywhere - the website chat is a script on the business's site, served by the API), so framing is refused.
// Camera and microphone stay allowed for KROVA itself (calls in the browser, scanning a QR); location is off.
const SECURITY_HEADERS = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    qualities: [75, 95],
  },
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
