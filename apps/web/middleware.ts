export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/casos/:path*",
    "/tareas/:path*",
    "/admin/:path*",
    "/portal/:path*",
    "/api/cases/:path*",
    "/api/documents/:path*",
  ],
};
