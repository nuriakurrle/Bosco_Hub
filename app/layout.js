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
        {/* Theme + Dichte vor dem ersten Paint setzen (kein Aufblitzen). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('db_theme');document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light');if(localStorage.getItem('db_density')==='compact')document.documentElement.classList.add('compact');}catch(e){}",
          }}
        />
      </head>
      {/* suppressHydrationWarning: extensions (Grammarly, ColorZilla…) inject
          attributes into <body> before React loads; this avoids the false error. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
