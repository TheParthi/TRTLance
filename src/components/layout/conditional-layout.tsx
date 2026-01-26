"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import PublicLayout from "@/components/layout/public-layout";
import AuthLayout from "@/components/layout/auth-layout";

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isAuthenticated, loading, authChecked } = useAuth(); // Get loading and authChecked state
  const router = useRouter();

  const isAuthPage = ["/login", "/signup", "/post-project"].includes(pathname);
  const isAuthenticatedRoute = [
    "/dashboard",
    "/profile",
    "/wallet",
    "/projects",
    "/browse",
    "/manage",
    "/messages",
    "/lists",
    "/tasklists",
    "/services",
    "/inbox",
    "/feedback",
    "/credit",
    "/project-updates",
    "/bookmarks",
    "/prototyper",
    "/disputes",
    "/my-projects",
    "/my-applications",
    "/job",
    "/edit-profile",
    "/find-jobs",
    "/escrow",
    "/resolution-gigs",
    "/contracts",
    "/notifications",
    "/contests",
    "/freelancers",
    "/freemarket",
    "/verified",
    "/preferred",
    "/memberships",
    "/exams",
    "/recruiter",
    "/technical-copilot",
    "/enterprise",
    "/local-jobs",
    "/showcase",
    "/community",
    "/discover",
    "/support",
    "/search",
    "/settings",
    "/post-project"
  ].some(route => pathname.startsWith(route));

  useEffect(() => {
    if (!authChecked) return; // Wait until auth status is known

    if (isAuthenticated && (pathname === "/login" || pathname === "/signup")) {
      router.replace("/dashboard");
      return;
    }
    if (!isAuthenticated && isAuthenticatedRoute) {
      router.replace("/login");
    }
  }, [isAuthenticated, authChecked, pathname, router, isAuthenticatedRoute]);

  // While we don't know the auth state, show a spinner to avoid FOUC
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Handle protected routes while unauthenticated (waiting for redirect in useEffect)
  if (isAuthenticatedRoute && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Handle login/signup while authenticated (waiting for redirect in useEffect)
  if (isAuthenticated && (pathname === "/login" || pathname === "/signup")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Auth pages (login, signup, post-project) - no global header/footer
  if (isAuthPage) {
    return <>{children}</>;
  }

  // Authenticated routes - use AuthLayout
  if (isAuthenticatedRoute && isAuthenticated) {
    return <AuthLayout>{children}</AuthLayout>;
  }

  // Public routes or fallback
  return <PublicLayout>{children}</PublicLayout>;
}