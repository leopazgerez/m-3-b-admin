import type { NextConfig } from "next";

const isGithubActions = process.env.GITHUB_ACTIONS === "true";
const githubRepoName = process.env.GITHUB_REPOSITORY
  ? `/${process.env.GITHUB_REPOSITORY.split("/")[1]}`
  : "";

let rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH;
if (rawBasePath === undefined && isGithubActions) {
  rawBasePath = githubRepoName;
}

// Next.js requirement: basePath must start with a slash and must NOT end with a slash, nor be "/"
const formatBasePath = (path?: string): string | undefined => {
  if (!path || path.trim() === "" || path.trim() === "/") return undefined;
  let formatted = path.trim();
  if (!formatted.startsWith("/")) formatted = `/${formatted}`;
  if (formatted.endsWith("/")) formatted = formatted.slice(0, -1);
  return formatted;
};

const basePath = formatBasePath(rawBasePath);

const nextConfig: NextConfig = {
  // Enables static HTML export for GitHub Pages
  output: "export",

  // GitHub Pages does not have a dynamic image optimization server
  images: {
    unoptimized: true,
  },

  // Base path for GitHub Pages (e.g. /m-3-b-admin) or custom domain
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,

  // Generates trailing slashes for each route (e.g. /productos/index.html), essential for static host routing
  trailingSlash: true,
};

export default nextConfig;
