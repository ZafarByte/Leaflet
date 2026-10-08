import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { PageFlip } from "page-flip";
import "page-flip/src/Style/stPageFlip.css";
import { createStandaloneFlipbook } from "../lib/flipbookExport";
import type { RenderedPdf } from "../lib/pdfRenderer";

interface BookReaderProps {
  pdf: RenderedPdf;
  onClose: () => void;
}

type Orientation = "landscape" | "portrait";
type ReadingTheme = "normal" | "warm-paper" | "dark" | "high-contrast";
const READING_THEMES: Array<[ReadingTheme, string]> = [
  ["normal", "Normal"],
  ["warm-paper", "Warm paper"],
  ["dark", "Dark"],
  ["high-contrast", "High contrast"],
];

const getBookmarksStorageKey = (pdfId: string) => `private-book-reader:bookmarks:${pdfId}`;
const READING_THEME_STORAGE_KEY = "private-book-reader:reading-theme";

function isReadingTheme(value: string): value is ReadingTheme {
  return value === "normal" || value === "warm-paper" || value === "dark" || value === "high-contrast";
}

function readReadingTheme(): ReadingTheme {
  const stored = window.localStorage.getItem(READING_THEME_STORAGE_KEY);
  if (stored === null) return "warm-paper";
  if (isReadingTheme(stored)) return stored;
  throw new Error("Saved reading theme is invalid.");
}

function readBookmarks(pdfId: string, pageCount: number): number[] {
  const stored = window.localStorage.getItem(getBookmarksStorageKey(pdfId));
  if (stored === null) return [];

  const parsed: unknown = JSON.parse(stored);
  const validPageIndices = Array.isArray(parsed)
    ? parsed.filter(
        (pageIndex: unknown): pageIndex is number =>
          typeof pageIndex === "number" &&
          Number.isSafeInteger(pageIndex) &&
          pageIndex >= 0 &&
          pageIndex < pageCount,
      )
    : [];
  if (
    !Array.isArray(parsed) ||
    validPageIndices.length !== parsed.length
  ) {
    throw new Error("Saved bookmarks for this PDF are invalid.");
  }

  return [...new Set(validPageIndices)].sort((a, b) => a - b);
}

export function BookReader({ pdf, onClose }: BookReaderProps) {
  const { id: pdfId, pages } = pdf;
  const stageRef = useRef<HTMLDivElement>(null);
  const bookHostRef = useRef<HTMLDivElement>(null);
  const themeControlRef = useRef<HTMLDivElement>(null);
  const themeTriggerRef = useRef<HTMLButtonElement>(null);
  const themeOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const pageFlipRef = useRef<PageFlip | null>(null);
  const zoomRef = useRef(100);
  const [currentPage, setCurrentPage] = useState(0);
  const [sliderPage, setSliderPage] = useState(0);
  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTurning, setIsTurning] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [readerError, setReaderError] = useState<string | null>(null);
  const [initialBookmarkState] = useState<{
    bookmarks: number[];
    error: string | null;
  }>(() => {
    try {
      return { bookmarks: readBookmarks(pdfId, pages.length), error: null };
    } catch (error) {
      console.error("Unable to load saved bookmarks.", error);
      return {
        bookmarks: [],
        error: "Saved bookmarks could not be loaded from this device.",
      };
    }
  });
  const [bookmarks, setBookmarks] = useState(initialBookmarkState.bookmarks);
  const [bookmarksOpen, setBookmarksOpen] = useState(initialBookmarkState.error !== null);
  const [bookmarkStorageReady] = useState(initialBookmarkState.error === null);
  const [bookmarkError, setBookmarkError] = useState(initialBookmarkState.error);
  const [thumbnailsOpen, setThumbnailsOpen] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [initialThemeState] = useState<{
    theme: ReadingTheme;
    error: string | null;
  }>(() => {
    try {
      return { theme: readReadingTheme(), error: null };
    } catch (error) {
      console.error("Unable to load the saved reading theme.", error);
      return {
        theme: "warm-paper",
        error: "Your reading theme preference could not be loaded.",
      };
    }
  });
  const [theme, setTheme] = useState<ReadingTheme>(initialThemeState.theme);
  const [themeError, setThemeError] = useState<string | null>(initialThemeState.error);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  const updateZoom = (nextZoom: number) => {
    const boundedZoom = Math.max(70, Math.min(130, nextZoom));
    zoomRef.current = boundedZoom;
    setZoom(boundedZoom);
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.querySelector(".reader")?.requestFullscreen();
      }
    } catch (error) {
      console.error("Unable to change fullscreen mode.", error);
      setShareError("Fullscreen mode is not available in this browser.");
      setShareStatus(null);
    }
  };

  useEffect(() => {
    const updateFullscreenState = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", updateFullscreenState);
    return () => document.removeEventListener("fullscreenchange", updateFullscreenState);
  }, []);

  const updateTheme = (nextTheme: ReadingTheme) => {
    try {
      window.localStorage.setItem(READING_THEME_STORAGE_KEY, nextTheme);
      setTheme(nextTheme);
      setThemeError(null);
    } catch (error) {
      console.error("Unable to save the reading theme preference.", error);
      setThemeError("Your reading theme could not be saved on this device.");
    }
  };

  useEffect(() => {
    const stage = stageRef.current;
    const host = bookHostRef.current;
    const pageFlip = pageFlipRef.current;
    if (!isReady || !stage || !host || !pageFlip) return;

    const pageRatio = pages[0].width / pages[0].height;
    const bookWidth = Math.min(
      stage.clientWidth,
      Math.max(320, (stage.clientHeight - 36) * 2 * pageRatio),
    );
    host.style.width = `${bookWidth * (zoom / 100)}px`;
    pageFlip.update();
  }, [isReady, pages, zoom]);

  useEffect(() => {
    if (!themeMenuOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !themeControlRef.current?.contains(event.target)
      ) {
        setThemeMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [themeMenuOpen]);

  const handleThemeMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const activeIndex = themeOptionRefs.current.findIndex(
      (option) => option === document.activeElement,
    );
    let nextIndex: number | null = null;

    if (event.key === "ArrowDown") nextIndex = (activeIndex + 1) % themeOptionRefs.current.length;
    else if (event.key === "ArrowUp") {
      nextIndex = (activeIndex - 1 + themeOptionRefs.current.length) % themeOptionRefs.current.length;
    } else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = themeOptionRefs.current.length - 1;
    else if (event.key === "Escape") {
      event.preventDefault();
      setThemeMenuOpen(false);
      themeTriggerRef.current?.focus();
      return;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      themeOptionRefs.current[nextIndex]?.focus();
    }
  };

  const saveBookmarks = (nextBookmarks: number[]) => {
    try {
      window.localStorage.setItem(
        getBookmarksStorageKey(pdfId),
        JSON.stringify(nextBookmarks),
      );
      setBookmarks(nextBookmarks);
      setBookmarkError(null);
    } catch (error) {
      console.error("Unable to save bookmarks.", error);
      setBookmarkError("Bookmarks could not be saved on this device.");
      setBookmarksOpen(true);
    }
  };

  const isCurrentPageBookmarked = bookmarks.includes(currentPage);
  const currentThemeLabel = READING_THEMES.find(([value]) => value === theme)?.[1] ?? "Normal";
  const toggleCurrentBookmark = () => {
    const nextBookmarks = isCurrentPageBookmarked
      ? bookmarks.filter((pageIndex) => pageIndex !== currentPage)
      : [...bookmarks, currentPage].sort((a, b) => a - b);
    saveBookmarks(nextBookmarks);
  };

  const shareFlipbook = async () => {
    const confirmed = window.confirm(
      "Create a self-contained HTML flipbook with every rendered page embedded? Nothing is uploaded by this reader. The file contains the book and will be accessible to anyone you choose to share it with.",
    );
    if (!confirmed) return;

    let filename: string;
    let html: string;
    try {
      ({ filename, html } = createStandaloneFlipbook(pdf));
    } catch (error) {
      console.error("Unable to prepare the shareable flipbook.", error);
      setShareError(
        `The flipbook could not be prepared: ${error instanceof Error ? error.message : "Unexpected error."}`,
      );
      setShareStatus(null);
      return;
    }

    try {
      try {
        if (typeof navigator.share === "function" && typeof navigator.canShare === "function") {
          const file = new File([html], filename, { type: "text/html;charset=utf-8" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: pdf.name,
              text: "Offline flipbook",
            });
            setShareError(null);
            setShareStatus("The flipbook file was shared using your device's share option.");
            return;
          }
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.warn("Device sharing failed; trying a local download.", error);
      }

      const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setShareError(null);
      setShareStatus("A self-contained HTML flipbook was downloaded. Nothing was uploaded.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("Unable to share or download the flipbook.", error);
      setShareError(
        `The flipbook could not be downloaded: ${error instanceof Error ? error.message : "Unexpected error."}`,
      );
      setShareStatus(null);
    }
  };

  const goToBookmark = (pageIndex: number) => {
    pageFlipRef.current?.flip(pageIndex);
    setBookmarksOpen(false);
  };

  useEffect(() => {
    const stage = stageRef.current;
    const host = bookHostRef.current;
    if (!stage || !host || pages.length === 0) return;

    let disposed = false;
    let pageFlip: PageFlip | null = null;
    let runtimeRoot: HTMLDivElement | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const initialize = async () => {
      try {
        const firstPages = pages.slice(0, Math.min(pages.length, 3));
        await Promise.all(
          firstPages.map((page) => {
            const image = new Image();
            image.src = page.dataUrl;
            return image.decode();
          }),
        );
        if (disposed) return;

        const pageRatio = pages[0].width / pages[0].height;
        const getMaxBookWidth = () =>
          Math.min(
            stage.clientWidth,
            Math.max(320, (stage.clientHeight - 36) * 2 * pageRatio),
          ) * (zoomRef.current / 100);
        host.style.maxWidth = "none";
        host.style.width = `${getMaxBookWidth()}px`;

        const availableHeight = Math.max(250, Math.min(stage.clientHeight - 36, 750));
        const portraitLayout = stage.clientWidth < 500;
        const availablePageWidth = Math.max(
          160,
          (stage.clientWidth - (portraitLayout ? 20 : 36)) / (portraitLayout ? 1 : 2),
        );
        const initialPageWidth = Math.max(
          160,
          Math.min(availableHeight * pageRatio, availablePageWidth),
        );
        const pageHeight = Math.max(220, initialPageWidth / pageRatio);
        const pageWidth = pageHeight * pageRatio;

        const pageElements = pages.map((page, index) => {
          const element = document.createElement("div");
          element.className = "book-sheet";
          element.setAttribute("aria-label", `Page ${index + 1}`);

          const image = document.createElement("img");
          image.src = page.dataUrl;
          image.alt = `Page ${index + 1}`;
          image.draggable = false;
          element.appendChild(image);
          return element;
        });

        runtimeRoot = document.createElement("div");
        runtimeRoot.className = "pageflip-root";
        host.appendChild(runtimeRoot);

        pageFlip = new PageFlip(runtimeRoot, {
          width: pageWidth,
          height: pageHeight,
          size: "stretch",
          minWidth: 160,
          maxWidth: 750 * pageRatio,
          minHeight: 220,
          maxHeight: 750,
          showCover: true,
          usePortrait: true,
          drawShadow: true,
          maxShadowOpacity: 0.3,
          flippingTime: 650,
          mobileScrollSupport: true,
          autoSize: true,
        });

        pageFlip.on("flip", () => {
          if (!pageFlip) return;
          const pageIndex = pageFlip.getCurrentPageIndex();
          setCurrentPage(pageIndex);
          setSliderPage(pageIndex);
          setOrientation(pageFlip.getOrientation());
        });
        pageFlip.on("changeOrientation", () => {
          if (pageFlip) setOrientation(pageFlip.getOrientation());
        });
        pageFlip.on("changeState", (event) => {
          setIsTurning(event.data === "flipping");
        });
        pageFlip.loadFromHTML(pageElements);

        if (disposed) {
          pageFlip.destroy();
          return;
        }
        pageFlipRef.current = pageFlip;
        resizeObserver = new ResizeObserver(() => {
          if (disposed || !pageFlip) return;
          host.style.width = `${getMaxBookWidth()}px`;
          pageFlip.update();
        });
        resizeObserver.observe(stage);
        setCurrentPage(pageFlip.getCurrentPageIndex());
        setOrientation(pageFlip.getOrientation());
        setIsReady(true);
      } catch (error) {
        if (disposed) return;
        pageFlipRef.current = null;
        pageFlip?.destroy();
        pageFlip = null;
        runtimeRoot?.remove();
        console.error("Unable to initialize the book preview.", error);
        setReaderError("The book preview could not be loaded. Please try opening the PDF again.");
      }
    };

    void initialize();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      pageFlipRef.current = null;
      pageFlip?.destroy();
      runtimeRoot?.remove();
    };
  }, [pages]);

  useEffect(() => {
    const pageFlip = pageFlipRef.current;
    if (!pageFlip) return;

    const firstToWarm = Math.max(0, currentPage - 1);
    const lastToWarm = Math.min(pages.length - 1, currentPage + 3);
    for (let index = firstToWarm; index <= lastToWarm; index += 1) {
      const image = new Image();
      image.src = pages[index].dataUrl;
    }
  }, [currentPage, pages]);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.target instanceof HTMLButtonElement ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLSelectElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target instanceof HTMLElement &&
          event.target.closest(".reader-theme-control, .reader-thumbnails")) ||
        (event.target instanceof HTMLElement && event.target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        pageFlipRef.current?.flipNext();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        pageFlipRef.current?.flipPrev();
      } else if (event.key === "Escape") {
        if (!document.fullscreenElement) onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const canGoBack = currentPage > 0;
  const pagesAfterCurrent =
    orientation === "landscape" && currentPage > 0 ? currentPage + 1 : currentPage;
  const canGoForward = pagesAfterCurrent < pages.length - 1;
  const visiblePageIndices = new Set([currentPage]);
  if (
    orientation === "landscape" &&
    currentPage > 0 &&
    currentPage + 1 < pages.length
  ) {
    visiblePageIndices.add(currentPage + 1);
  }
  const pageLabel =
    currentPage === 0
      ? `Cover · ${pages.length} ${pages.length === 1 ? "page" : "pages"}`
      : orientation === "landscape" && currentPage + 1 < pages.length
        ? `Pages ${currentPage + 1}-${Math.min(currentPage + 2, pages.length)} of ${pages.length}`
        : `Page ${currentPage + 1} of ${pages.length}`;
  return (
    <div className="reader" data-theme={theme}>
      <header className="reader-toolbar">
        <button className="reader-back" onClick={onClose} type="button">
          <span aria-hidden="true">←</span>
          <span>Library</span>
        </button>
        <div className="reader-title">
          <span className="reader-title-mark" aria-hidden="true">▤</span>
          <span>Leaflet</span>
        </div>
        <div className="reader-tools">
          <button
            aria-label="Export or share an offline HTML flipbook"
            className="reader-share-button"
            disabled={!isReady}
            onClick={shareFlipbook}
            title="Create an offline HTML file; no online link or upload"
            type="button"
          >
            <span aria-hidden="true">↗</span>
            <span>Export HTML</span>
          </button>
          <button
            aria-label={`${isCurrentPageBookmarked ? "Remove" : "Add"} bookmark for page ${currentPage + 1}`}
            aria-pressed={isCurrentPageBookmarked}
            className={`reader-bookmark-toggle${isCurrentPageBookmarked ? " is-bookmarked" : ""}`}
            disabled={!bookmarkStorageReady || !isReady || isTurning}
            onClick={toggleCurrentBookmark}
            title={`${isCurrentPageBookmarked ? "Remove" : "Add"} bookmark`}
            type="button"
          >
            <span aria-hidden="true">{isCurrentPageBookmarked ? "★" : "☆"}</span>
          </button>
          <div className="reader-theme-control" ref={themeControlRef}>
            <button
              aria-expanded={themeMenuOpen}
              aria-haspopup="menu"
              className="reader-theme-trigger"
              onClick={() => {
                const willOpen = !themeMenuOpen;
                setThemeMenuOpen(willOpen);
                if (willOpen) {
                  requestAnimationFrame(() => {
                    const selectedIndex = READING_THEMES.findIndex(([value]) => value === theme);
                    themeOptionRefs.current[selectedIndex]?.focus();
                  });
                }
              }}
              ref={themeTriggerRef}
              type="button"
            >
              <span>Theme</span>
              <span>{currentThemeLabel}</span>
              <span aria-hidden="true" className="reader-theme-chevron" />
            </button>
            {themeMenuOpen && (
              <div
                aria-label="Reading theme"
                className="reader-theme-menu"
                onKeyDown={handleThemeMenuKeyDown}
                role="menu"
              >
                {READING_THEMES.map(([themeValue, label], index) => (
                  <button
                    aria-checked={theme === themeValue}
                    className="reader-theme-option"
                    data-theme-option={themeValue}
                    key={themeValue}
                    onClick={() => {
                      updateTheme(themeValue);
                      setThemeMenuOpen(false);
                      themeTriggerRef.current?.focus();
                    }}
                    ref={(element) => {
                      themeOptionRefs.current[index] = element;
                    }}
                    role="menuitemradio"
                    type="button"
                  >
                    <span aria-hidden="true" className="reader-theme-swatch" />
                    <span>{label}</span>
                    {theme === themeValue && <span aria-hidden="true" className="reader-theme-check">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            aria-label={`Switch reading theme to ${theme === "dark" ? "Warm paper" : "Dark"}`}
            className="reader-quick-theme"
            onClick={() => updateTheme(theme === "dark" ? "warm-paper" : "dark")}
            title={`Switch to ${theme === "dark" ? "Warm paper" : "Dark"} theme`}
            type="button"
          >
            {theme === "dark" ? (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
              </svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <path d="M20.2 15.3A8.5 8.5 0 0 1 8.7 3.8 8.7 8.7 0 1 0 20.2 15.3Z" />
              </svg>
            )}
          </button>
          <div className="reader-bookmarks">
            <button
              aria-label={`Bookmarks, ${bookmarks.length} saved`}
              aria-controls="reader-bookmarks-panel"
              aria-expanded={bookmarksOpen}
              className="reader-bookmarks-toggle"
              onClick={() => setBookmarksOpen((open) => !open)}
              type="button"
            >
              <span className="reader-bookmarks-label">Bookmarks</span>
              <span aria-hidden="true">{bookmarks.length}</span>
            </button>
            {bookmarksOpen && (
              <section
                aria-label="Saved bookmarks"
                className="reader-bookmarks-panel"
                id="reader-bookmarks-panel"
              >
                <div className="reader-bookmarks-heading">
                  <h2>Saved bookmarks</h2>
                  <button
                    aria-label="Close bookmarks"
                    className="reader-bookmarks-close"
                    onClick={() => setBookmarksOpen(false)}
                    type="button"
                  >
                    ×
                  </button>
                </div>
                {bookmarkError && <p className="reader-bookmark-error" role="alert">{bookmarkError}</p>}
                {bookmarks.length > 0 ? (
                  <ul className="reader-bookmarks-list">
                    {bookmarks.map((pageIndex) => (
                      <li key={pageIndex}>
                        <button
                          className="reader-bookmark-jump"
                          disabled={!isReady || isTurning}
                          onClick={() => goToBookmark(pageIndex)}
                          type="button"
                        >
                          <span aria-hidden="true">★</span>
                          Page {pageIndex + 1}
                        </button>
                        <button
                          aria-label={`Remove bookmark for page ${pageIndex + 1}`}
                          className="reader-bookmark-remove"
                          onClick={() =>
                            saveBookmarks(bookmarks.filter((savedPage) => savedPage !== pageIndex))
                          }
                          type="button"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="reader-bookmarks-empty">
                    {bookmarkError ? "Bookmarks are unavailable." : "No bookmarks yet. Save a page with the star button."}
                  </p>
                )}
                <p className="reader-bookmarks-note">Saved only on this device</p>
              </section>
            )}
          </div>
          <div className="reader-page-count" aria-live="polite">{pageLabel}</div>
        </div>
      </header>

      <main className="reader-content">
        <div className="reader-book-area">
          <button
            aria-label="Previous page"
            className="page-nav page-nav-prev"
            disabled={!canGoBack || isTurning || !isReady}
            onClick={() => pageFlipRef.current?.flipPrev()}
            type="button"
          >
            <span aria-hidden="true">‹</span>
          </button>

          <div className="book-stage" ref={stageRef}>
            <div
              aria-label="Flip book preview"
              className={`book${currentPage === 0 && orientation === "landscape" ? " is-cover" : ""}`}
              ref={bookHostRef}
              role="region"
            />
            {!isReady && !readerError && (
              <div className="book-status" role="status">Preparing your book…</div>
            )}
            {readerError && <div className="book-status book-error" role="alert">{readerError}</div>}
          </div>

          <button
            aria-label="Next page"
            className="page-nav page-nav-next"
            disabled={!canGoForward || isTurning || !isReady}
            onClick={() => pageFlipRef.current?.flipNext()}
            type="button"
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>

        {thumbnailsOpen && (
          <section
            aria-label="Page thumbnails"
            className="reader-thumbnails"
            id="reader-thumbnails-panel"
          >
            <div className="reader-thumbnails-heading">
              <h2>Pages</h2>
              <span>{pages.length} pages</span>
              <button
                aria-label="Close page thumbnails"
                className="reader-thumbnails-close"
                onClick={() => setThumbnailsOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <div className="reader-thumbnails-rail">
              {pages.map((page, index) => {
                const isVisible = visiblePageIndices.has(index);
                return (
                  <button
                    aria-current={isVisible ? "page" : undefined}
                    aria-label={`Go to page ${index + 1}${isVisible ? ", currently visible" : ""}`}
                    className={`reader-page-thumbnail${isVisible ? " is-current" : ""}`}
                    disabled={!isReady || isTurning}
                    key={page.pageNumber}
                    onClick={() => {
                      pageFlipRef.current?.flip(index);
                      setThumbnailsOpen(false);
                    }}
                    type="button"
                  >
                    <img
                      alt=""
                      decoding="async"
                      loading="lazy"
                      src={page.dataUrl}
                    />
                    <span>{page.pageNumber}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <footer className="reader-footer">
          {themeError && <p className="reader-theme-error" role="alert">{themeError}</p>}
          {shareError && <p className="reader-theme-error" role="alert">{shareError}</p>}
          {shareStatus && <p className="reader-share-status" role="status">{shareStatus}</p>}
          <button
            aria-controls={thumbnailsOpen ? "reader-thumbnails-panel" : undefined}
            aria-expanded={thumbnailsOpen}
            className="reader-thumbnails-toggle"
            disabled={!isReady}
            onClick={() => setThumbnailsOpen((open) => !open)}
            type="button"
          >
            <span aria-hidden="true">▤</span>
            <span>Pages</span>
            <span aria-hidden="true" className={`reader-thumbnails-chevron${thumbnailsOpen ? " is-open" : ""}`} />
          </button>
          <input
            aria-label="Jump to page"
            className="reader-page-slider"
            disabled={!isReady || isTurning}
            max={Math.max(0, pages.length - 1)}
            min={0}
            onChange={(event) => setSliderPage(Number(event.currentTarget.value))}
            onPointerUp={() => {
              if (!isTurning && sliderPage !== currentPage) pageFlipRef.current?.flip(sliderPage);
            }}
            onKeyUp={() => {
              if (!isTurning && sliderPage !== currentPage) pageFlipRef.current?.flip(sliderPage);
            }}
            type="range"
            value={sliderPage}
          />
          <span className="reader-footer-count" aria-live="polite">
            {orientation === "landscape" && currentPage > 0 && currentPage + 1 < pages.length
              ? `${currentPage + 1}-${currentPage + 2} / ${pages.length}`
              : `${currentPage + 1} / ${pages.length}`}
          </span>
          <span className="reader-footer-divider" aria-hidden="true" />
          <div className="reader-zoom-controls" aria-label="Book zoom">
            <button
              aria-label="Zoom out"
              className="reader-zoom-button"
              disabled={zoom <= 70}
              onClick={() => updateZoom(zoom - 10)}
              type="button"
            >−</button>
            <span aria-live="polite">{zoom}%</span>
            <button
              aria-label="Zoom in"
              className="reader-zoom-button"
              disabled={zoom >= 130}
              onClick={() => updateZoom(zoom + 10)}
              type="button"
            >+</button>
          </div>
          <span className="reader-footer-divider" aria-hidden="true" />
          <button
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            className="reader-fullscreen-button"
            onClick={() => void toggleFullscreen()}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            type="button"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
              {isFullscreen ? (
                <path d="M9 4v5H4m16 0h-5V4M4 15h5v5m10-5h-5v5" />
              ) : (
                <path d="M4 9V4h5m6 0h5v5M20 15v5h-5M9 20H4v-5" />
              )}
            </svg>
          </button>
          <span className="reader-footer-divider" aria-hidden="true" />
          <p className="reader-hint"><span aria-hidden="true">⌨</span> Drag a page corner or use arrow keys to turn pages</p>
        </footer>
      </main>
    </div>
  );
}

export default BookReader;
