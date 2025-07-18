import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ToastProvider } from "@/contexts/ToastContext";
import { DialogProvider } from "@/contexts/DialogContext";
import ClassificationBanner from "@/components/ClassificationBanner";
import EnvironmentBanner from "@/components/EnvironmentBanner";
const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Cirrus Data Preparedness Studio | CirrusLabs",
  description: "AI Data Preparation and Readiness Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${quicksand.variable} font-sans antialiased`}
      >
        <AuthProvider>
          <ToastProvider>
            <DialogProvider>
              <ClassificationBanner />
              <ProtectedRoute>
                {children}
              </ProtectedRoute>
              <EnvironmentBanner />
            </DialogProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
