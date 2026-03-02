import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/workspace/", "/khu/", "/budget/", "/settings/", "/auth/"],
    },
    sitemap: "https://personal-project-alpha-six.vercel.app/sitemap.xml",
  };
}
