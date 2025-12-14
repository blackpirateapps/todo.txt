import "./globals.css"; // <--- Critical: Imports Tailwind CSS

export const metadata = {
  title: "Todo.txt Editor",
  description: "Minimalist, Syncing Todo.txt Editor",
  manifest: "/manifest.json",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
  themeColor: "#000000",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Todo.txt",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}