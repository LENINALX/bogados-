export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/casos/:path*",
    "/tareas/:path*",
    "/agenda/:path*",
    "/admin/:path*",
    "/portal/:path*",
  ],
};
