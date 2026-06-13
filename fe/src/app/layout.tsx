import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Roast My Resume",
    template: "%s | Roast My Resume",
  },
  description:
    "Get brutally honest, professional resume feedback. See your resume the way recruiters and hiring managers do — with expert-level analysis and actionable recommendations.",
  keywords: ["resume review", "career advice", "resume feedback", "job search", "professional resume"],
  openGraph: {
    title: "Roast My Resume",
    description: "Professional resume feedback. Brutally honest insights.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" style={{ background: "var(--bg)", color: "var(--text)" }}>
        {children}
      </body>
    </html>
  );
}
