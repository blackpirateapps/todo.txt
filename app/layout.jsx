import "./globals.css";

export const metadata = {
  title: "Todo.txt Editor",
  description: "Minimalist, Syncing Todo.txt Editor",
  manifest: "/manifest.json",
  // Updated viewport: 'viewport-fit=cover' handles the iPhone notch area
  // 'user-scalable=0' prevents accidental zooming on inputs
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover",
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
      {/* 'overscroll-none' prevents the browser bounce effect on scroll limits */}
      <body className="overscroll-none">{children}</body>
    </html>
  );
}