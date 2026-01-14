import type { Metadata } from "next";
import { Crimson_Pro, Outfit, Space_Mono } from "next/font/google";
import "./globals.css";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ToastProvider } from "@/context/ToastContext";
import { ToastContainer } from "@/components/Toast";
import { ThemeProvider } from "@/context/ThemeContext";

const crimsonPro = Crimson_Pro({
  variable: "--font-serif",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Meal Planner Dashboard",
  description: "Solarpunk automated meal planning system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${crimsonPro.variable} ${outfit.variable} ${spaceMono.variable} font-sans antialiased`}
      >
        <ErrorBoundary>
          <ToastProvider>
            <ThemeProvider>
              {children}
              <ToastContainer />
            </ThemeProvider>
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
