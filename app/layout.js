import "./globals.css";

export const metadata = {
  title: "Don Bosco · ZUK Buchungs-Dashboard",
  description:
    "Staff-Dashboard für die Anfragen, die der n8n-Agent aus E-Mails extrahiert.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Newsreader:ital,wght@0,400;0,500;1,400&display=swap"
        />
      </head>
      {/* suppressHydrationWarning: extensiones (Grammarly, ColorZilla…) inyectan
          atributos en <body> antes de que React cargue; esto evita el falso error. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
