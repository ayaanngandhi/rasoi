import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter, Baloo_2 } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Nav } from "@/components/nav";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
});

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const baloo = Baloo_2({ subsets: ["devanagari"], variable: "--font-baloo" });

export const metadata: Metadata = {
  title: "Rasoi — My Kitchen",
  description:
    "Rasoi: a colorful home kitchen manager for recipes, weekly menus, and the bazaar list.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFF9F2" },
    { media: "(prefers-color-scheme: dark)", color: "#181009" },
  ],
};

const themeInit = `(function(){try{if(localStorage.getItem("rasoi-theme")==="dark"){var d=document.documentElement;d.classList.add("dark");d.style.colorScheme="dark";}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ colorScheme: "light" }} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className={`${bricolage.variable} ${inter.variable} ${baloo.variable}`}>
        <ThemeProvider>
          <Nav />
          <main className="min-h-dvh pb-24 lg:pb-0 lg:pl-64">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
