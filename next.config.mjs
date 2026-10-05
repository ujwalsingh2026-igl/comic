/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@node-rs/argon2', '@electric-sql/pglite', 'pg'],
  },
};

export default nextConfig;
