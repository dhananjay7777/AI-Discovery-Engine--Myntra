import type { Metadata, Viewport } from "next";
import { Fraunces, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { SiteAtmosphere } from "@/components/site/SiteAtmosphere";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteScrollVar } from "@/components/site/SiteScrollVar";
import "./globals.css";

const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Discovery Engine",
  description:
    "People save items on Myntra and often never buy them. This site reads public comments and ranks a few ideas to check with real shoppers.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0c0b0e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${body.variable} ${geistMono.variable} ${display.variable} antialiased`}
      >
        <SiteScrollVar />
        <SiteAtmosphere />
        <div className="site-root">
          <SiteHeader />
          {children}
        </div>
      </body>
    </html>
  );
}
