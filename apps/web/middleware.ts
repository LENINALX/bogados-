export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/casos/:path*",
    "/portal/:path*",
    "/api/cases/:path*",
    "/api/documents/:path*",
  ],
};
