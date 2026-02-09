/** @type {import('next').NextConfig} */
const nextConfig = {
    // We can skip type checking during build since we run it locally/in CI
    typescript: {
        ignoreBuildErrors: true,
    },
    // Same for ESLint
    eslint: {
        ignoreDuringBuilds: true,
    },
}

module.exports = nextConfig
