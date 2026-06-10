/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // "standalone" deja una build mínima que se ejecuta con `node server.js`.
  // Es lo que usa el Dockerfile de producción para crear una imagen ligera.
  output: "standalone",
};

export default nextConfig;
