import { useState } from "react";
import PdfUploader from "./components/PdfUploader";
import BookReader from "./components/BookReader";
import type { RenderedPdf } from "./lib/pdfRenderer";
import "./App.css";

function App() {
  const [pdf, setPdf] = useState<RenderedPdf | null>(null);
  const [reading, setReading] = useState(false);

  const handlePdfLoaded = (loadedPdf: RenderedPdf) => {
    setPdf(loadedPdf);
    setReading(true);
  };

  const handleCloseReader = () => {
    setReading(false);
    setPdf(null);
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
    <div className="app">
      <header className="header">
        <div className="brand" aria-label="Private Reader">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M5 7.5c4.2-.9 7.8.1 11 2.8v15c-3.2-2.7-6.8-3.7-11-2.8v-15Z" />
              <path d="M27 7.5c-4.2-.9-7.8.1-11 2.8v15c3.2-2.7 6.8-3.7 11-2.8v-15Z" />
              <path d="M16 10.3v15" />
            </svg>
          </span>
          <span className="brand-name">Private <strong>Reader</strong></span>
        </div>

        <div className="privacy-badge">
          <span className="privacy-dot" />
          Your files stay on this device
        </div>
      </header>

      <main className="main">
        <section className="welcome">
          <div className="hero-copy">
            <p className="eyebrow">A MORE PERSONAL WAY TO READ</p>
            <h1>
              Make room for a <span>good read.</span>
            </h1>
            <p className="hero-description">
              Turn a PDF on your device into a book you can page through.
              No account, no upload, just you and your next chapter.
            </p>
            <div className="privacy-points">
              <div className="privacy-point">
                <span className="point-icon" aria-hidden="true">✓</span>
                Processed locally
              </div>
              <div className="privacy-point">
                <span className="point-icon" aria-hidden="true">✓</span>
                Nothing sent online
              </div>
            </div>
          </div>

          <PdfUploader onPdfLoaded={handlePdfLoaded} />
        </section>

        <footer className="site-footer">
          <span>PRIVATE BY DESIGN</span>
          <span className="footer-divider" />
          <span>Take your time. Turn the page.</span>
        </footer>
      </main>
    </div>
  );
}

export default App;