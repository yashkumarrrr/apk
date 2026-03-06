import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@prisma/client',
    'bcryptjs',
    'ssh2',
    'cpu-features',
    'sshcrypto',
  ],
}

export default nextConfig
