import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { PageFlip } from "page-flip";
import "page-flip/src/Style/stPageFlip.css";
import type { RenderedPdf } from "../lib/pdfRenderer";

interface BookReaderProps {
  pdf: RenderedPdf;
  onClose: () => void;
}

type Orientation = "landscape" | "portrait";
type ReadingTheme = "warm-paper" | "dark" | "high-contrast";
const READING_THEMES: Array<[ReadingTheme, string]> = [
  ["warm-paper", "Warm paper"],
  ["dark", "Dark"],
  ["high-contrast", "High contrast"],
];

const getBookmarksStorageKey = (pdfId: string) => `private-book-reader:bookmarks:${pdfId}`;
const READING_THEME_STORAGE_KEY = "private-book-reader:reading-theme";

function isReadingTheme(value: string): value is ReadingTheme {
  return value === "warm-paper" || value === "dark" || value === "high-contrast";
}

function readReadingTheme(): ReadingTheme {
  const stored = window.localStorage.getItem(READING_THEME_STORAGE_KEY);
  if (stored === null) return "dark";
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
  const [currentPage, setCurrentPage] = useState(0);
  const [orientation, setOrientation] = useState<Orientation>("landscape");
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
  const [initialThemeState] = useState<{
    theme: ReadingTheme;
    error: string | null;
  }>(() => {
    try {
      return { theme: readReadingTheme(), error: null };
    } catch (error) {
      console.error("Unable to load the saved reading theme.", error);
      return {
        theme: "dark",
        error: "Your reading theme preference could not be loaded.",
      };
    }
  });
  const [theme, setTheme] = useState<ReadingTheme>(initialThemeState.theme);
  const [themeError, setThemeError] = useState<string | null>(initialThemeState.error);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

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
  const toggleCurrentBookmark = () => {
    const nextBookmarks = isCurrentPageBookmarked
      ? bookmarks.filter((pageIndex) => pageIndex !== currentPage)
      : [...bookmarks, currentPage].sort((a, b) => a - b);
    saveBookmarks(nextBookmarks);
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
          );
        host.style.maxWidth = `${getMaxBookWidth()}px`;

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
          setCurrentPage(pageFlip.getCurrentPageIndex());
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
          host.style.maxWidth = `${getMaxBookWidth()}px`;
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
        event.target instanceof HTMLInputElement ||
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
        onClose();
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
  const progress = pages.length > 1 ? (currentPage / (pages.length - 1)) * 100 : 100;

  return (
    <div className="reader" data-theme={theme}>
      <header className="reader-toolbar">
        <button className="reader-back" onClick={onClose} type="button">
          <span aria-hidden="true">←</span>
          <span>Library</span>
        </button>
        <div className="reader-title">
          <span className="reader-title-mark" aria-hidden="true">▤</span>
          <span>Private Book Reader</span>
        </div>
        <div className="reader-tools">
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
              <span>{theme === "warm-paper" ? "Warm paper" : theme === "dark" ? "Dark" : "High contrast"}</span>
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
            <div aria-label="Flip book preview" className="book" ref={bookHostRef} role="region" />
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
          <button
            aria-controls="reader-thumbnails-panel"
            aria-expanded={thumbnailsOpen}
            className="reader-thumbnails-toggle"
            disabled={!isReady}
            onClick={() => setThumbnailsOpen((open) => !open)}
            type="button"
          >
            <span aria-hidden="true">▦</span>
            <span>Pages</span>
          </button>
          <div
            aria-label="Reading progress"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={Math.round(progress)}
            className="reading-progress"
            role="progressbar"
          >
            <div className="reading-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="reader-hint">Drag a page corner or use the arrows to turn pages</p>
        </footer>
      </main>
    </div>
  );
}

export default BookReader;
