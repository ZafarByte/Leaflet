import { useState } from "react";
import PdfUploader from "./components/PdfUploader";
import BookReader from "./components/BookReader";
import type { RenderedPdf } from "./lib/pdfRenderer";
import "./App.css";

type SiteTheme = "light" | "dark";

const SITE_THEME_STORAGE_KEY = "leaflet:site-theme";

function readSiteTheme(): { theme: SiteTheme; error: string | null } {
  try {
    const stored = window.localStorage.getItem(SITE_THEME_STORAGE_KEY);
    if (stored === null || stored === "light" || stored === "dark") {
      return { theme: stored ?? "light", error: null };
    }
    throw new Error("Saved site theme is invalid.");
  } catch (error) {
    console.error("Unable to load the saved site theme.", error);
    return {
      theme: "light",
      error: "Theme preference could not be loaded from this device.",
    };
  }
}

function App() {
  const [pdf, setPdf] = useState<RenderedPdf | null>(null);
  const [reading, setReading] = useState(false);
  const [initialSiteTheme] = useState(readSiteTheme);
  const [siteTheme, setSiteTheme] = useState<SiteTheme>(initialSiteTheme.theme);
  const [themeError, setThemeError] = useState<string | null>(initialSiteTheme.error);

  const handlePdfLoaded = (loadedPdf: RenderedPdf) => {
    setPdf(loadedPdf);
    setReading(true);
  };

  const handleCloseReader = () => {
    setReading(false);
    setPdf(null);
  };

  const toggleSiteTheme = () => {
    const nextTheme = siteTheme === "light" ? "dark" : "light";
    setSiteTheme(nextTheme);

    try {
      window.localStorage.setItem(SITE_THEME_STORAGE_KEY, nextTheme);
      setThemeError(null);
    } catch (error) {
      console.error("Unable to save the site theme.", error);
      setThemeError("Theme changed for this visit but could not be saved on this device.");
    }
  };

  if (reading && pdf && pdf.pages.length > 0) {
    return (
      <BookReader
        key={pdf.id}
        pdf={pdf}
        onClose={handleCloseReader}
      />
    );
  }

  return (
    <div className="app" data-theme={siteTheme}>
      <header className="header">
        <div className="brand" aria-label="Leaflet">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M5 7.5c4.2-.9 7.8.1 11 2.8v15c-3.2-2.7-6.8-3.7-11-2.8v-15Z" />
              <path d="M27 7.5c-4.2-.9-7.8.1-11 2.8v15c3.2-2.7 6.8-3.7 11-2.8v-15Z" />
              <path d="M16 10.3v15" />
              <path d="M19.4 8.2c1.8-1.4 3.4-1.8 5.6-1.7-.1 2.6-1.4 4.2-4.5 4.7" />
            </svg>
          </span>
          <span className="brand-name">Leaflet</span>
        </div>

        <div className="privacy-badge">
          <span className="privacy-dot" />
          Your files stay on this device
          <button
            aria-label={`Switch to ${siteTheme === "light" ? "dark" : "light"} theme`}
            aria-pressed={siteTheme === "dark"}
            className="site-theme-toggle"
            onClick={toggleSiteTheme}
            title={`Switch to ${siteTheme === "light" ? "dark" : "light"} theme`}
            type="button"
          >
            {siteTheme === "light" ? (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <path d="M20.2 15.3A8.5 8.5 0 0 1 8.7 3.8 8.7 8.7 0 1 0 20.2 15.3Z" />
              </svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
              </svg>
            )}
          </button>
        </div>
      </header>
      {themeError && <p className="site-theme-error" role="status">{themeError}</p>}

      <main className="main">
        <section className="welcome">
          <div className="hero-copy">
            <p className="eyebrow">A MORE PERSONAL WAY TO READ</p>
            <h1>
              Turn every PDF into a <span>better read.</span>
            </h1>
            <p className="hero-description">
              Leaflet transforms your PDFs into a beautiful, page-flip book experience.
              No account, no upload — just you and your next chapter.
            </p>
            <div className="hero-features">
              <div className="hero-feature">
                <span className="point-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <rect x="4.5" y="10" width="15" height="11" rx="2" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14.5v2" />
                  </svg>
                </span>
                <span><strong>Private by design</strong><small>Your files never leave your device.</small></span>
              </div>
              <div className="hero-feature">
                <span className="point-icon" aria-hidden="true">▤</span>
                <span><strong>Realistic page flip</strong><small>A natural, immersive reading experience.</small></span>
              </div>
              <div className="hero-feature">
                <span className="point-icon" aria-hidden="true">▣</span>
                <span><strong>Works offline</strong><small>No account. Just open and read.</small></span>
              </div>
            </div>
          </div>

          <PdfUploader onPdfLoaded={handlePdfLoaded} />
        </section>

        <section aria-label="Leaflet features" className="feature-strip">
          <div className="feature-item">
            <span aria-hidden="true">▤</span>
            <p><strong>Book-like reading</strong><small>Flip through pages like a real book.</small></p>
          </div>
          <div className="feature-item">
            <span aria-hidden="true">◉</span>
            <p><strong>Clean, distraction-free</strong><small>Focus on what matters.</small></p>
          </div>
          <div className="feature-item">
            <span aria-hidden="true">⚙</span>
            <p><strong>Customizable view</strong><small>Choose your reading theme.</small></p>
          </div>
          <div className="feature-item">
            <span aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="13" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
            </span>
            <p><strong>Lightweight &amp; fast</strong><small>Works smoothly on your device.</small></p>
          </div>
        </section>

        <footer className="site-footer">
          <span>LEAFLET · PRIVATE BY DESIGN</span>
          <span className="footer-divider" />
          <span>Take your time. Turn the page.</span>
        </footer>
      </main>
    </div>
  );
}

export default App;