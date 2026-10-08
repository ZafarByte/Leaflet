import { useState } from "react";
import { renderPdf, type RenderedPage } from "../lib/pdfRenderer";

interface PdfUploaderProps {
  onPdfLoaded: (pages: RenderedPage[]) => void;
}

export default function PdfUploader({ onPdfLoaded }: PdfUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const processFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      setError("Please select a PDF file.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const pages = await renderPdf(file);

      onPdfLoaded(pages);
    } catch (err) {
      console.error(err);
      setError("Unable to open this PDF.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (file) void processFile(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    if (loading) return;

    const file = event.dataTransfer.files[0];
    if (file) void processFile(file);
  };

  return (
    <section
      className={`uploader${loading ? " is-loading" : ""}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      aria-labelledby="uploader-title"
    >
      <div className="upload-topline">
        <span className="upload-symbol" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none">
            <path d="M13 6.5h14l9 9v25H13a3 3 0 0 1-3-3v-28a3 3 0 0 1 3-3Z" />
            <path d="M27 7v9h9M24 32V21m0 0-5 5m5-5 5 5" />
          </svg>
        </span>
        <span className="upload-label">YOUR NEXT CHAPTER</span>
      </div>

      <h2 id="uploader-title">Open a PDF</h2>
      <p className="uploader-description">
        Choose a document from your device to settle in and read.
      </p>

      <label className="upload-button">
        <input
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleFileChange}
          disabled={loading}
          hidden
        />
        <span>{loading ? "Opening your book..." : "Choose a PDF"}</span>
        {!loading && <span className="button-arrow" aria-hidden="true">→</span>}
      </label>

      <p className="drop-hint">or drop a PDF anywhere in this box</p>

      <div className="local-note">
        <span className="local-note-icon" aria-hidden="true">⌑</span>
        <span>Processed on this device. Never uploaded.</span>
      </div>

      {loading && (
        <p className="loading" role="status">
          Rendering your pages locally…
        </p>
      )}
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  );
}