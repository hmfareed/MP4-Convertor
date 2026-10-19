import { MetadataRoute } from "next";
import { env } from "@/lib/config/env";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = env.APP_URL || "http://localhost:3000";
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/register", "/privacy", "/terms"],
      disallow: ["/api/", "/admin", "/conversions", "/settings", "/share/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
