/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.discordapp.com" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  // Lets the key-check endpoint be reachable at the exact path style you
  // wanted (https://api.flexozy.online/V1/key/{code}) while the real
  // handler lives at the conventional lowercase /api/v1/key/{code} route.
  async rewrites() {
    return [{ source: "/V1/key/:code", destination: "/api/v1/key/:code" }];
  },
};

module.exports = nextConfig;
