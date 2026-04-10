import type { Metadata } from "next";
import "./globals.css";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Feedback Portal",
  description: "Share your feedback on Ben's projects",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        <nav className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
          <div className="container mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="font-semibold text-lg">
              💬 Feedback Portal
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/" className="hover:text-primary transition-colors">
                Browse
              </Link>
              <Link
                href="/submit"
                className="hover:text-primary transition-colors"
              >
                Submit
              </Link>
              <Link
                href="/login"
                className="hover:text-primary transition-colors"
              >
                Login
              </Link>
            </div>
          </div>
        </nav>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
