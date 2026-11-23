import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
  },
  // `npm run dev`-ийг дотоод сүлжээний IP-ээр (жнь 192.168.1.7:3000, утас / өөр компьютер) нээхэд
  // Next.js dev JS-ийг хаадаг тул хуудас ажиллахгүй (товч дарагдахгүй) болдог — дотоод сүлжээг зөвшөөрнө
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Өөр сайт дотор iframe-ээр нээх (clickjacking) хориглоно
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Байршил, камерыг зөвхөн энэ сайт ашиглана
          { key: "Permissions-Policy", value: "geolocation=(self), camera=(self), microphone=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
