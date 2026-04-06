import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import AuthModal from "./components/AuthModal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GITMURPH",
  description: "Discover, understand and run open-source apps with one tap",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} bg-[#042a33] text-white antialiased`}
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="flex min-h-[100dvh] w-full flex-col bg-[#042a33] overflow-hidden selection:bg-blue-500/30">
        <AuthProvider>
          <div className="flex h-[100dvh] w-full">
            {children}
          </div>
          <AuthModal />
        </AuthProvider>
      </body>
    </html>
  );
}
