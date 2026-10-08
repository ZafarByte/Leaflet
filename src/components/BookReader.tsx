import { useEffect, useRef, useState } from "react";
import type { RenderedPage } from "../lib/pdfRenderer";

interface BookReaderProps {
  pages: RenderedPage[];
  onClose: () => void;
}

type TurnDirection = "next" | "previous";
type TurnState = {
  direction: TurnDirection;
  targetPage: number;
};
type SwipeState = {
  direction: TurnDirection;
  progress: number;
  phase: "dragging" | "settling";
  targetPage: number;
};
type PointerStart = {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastTime: number;
  direction: TurnDirection | null;
  pageWidth: number;
};

const TURN_DURATION = 1100;
const SWIPE_SETTLE_DURATION = 650;

export default function BookReader({ pages, onClose }: BookReaderProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [turning, setTurning] = useState<TurnState | null>(null);
  const [swipe, setSwipe] = useState<SwipeState | null>(null);
  const pointerStart = useRef<PointerStart | null>(null);
  const isCover = currentPage === 0;
  const isTurning = turning !== null || swipe?.phase === "settling";

  const nextPage = currentPage === 0 ? 1 : currentPage + 2;
  const previousPage = currentPage === 1 ? 0 : currentPage - 2;
  const canGoNext = nextPage < pages.length && !isTurning && swipe === null;
  const canGoPrevious = currentPage > 0 && !isTurning && swipe === null;

  useEffect(() => {
    if (!turning) return;
    const timeout = window.setTimeout(() => {
      setCurrentPage(turning.targetPage);
      setTurning(null);
    }, TURN_DURATION);
    return () => window.clearTimeout(timeout);
  }, [turning]);

  useEffect(() => {
    if (swipe?.phase !== "settling") return;
    const settledSwipe = swipe;
    const timeout = window.setTimeout(() => {
      setCurrentPage(settledSwipe.targetPage);
      setSwipe((activeSwipe) => activeSwipe === settledSwipe ? null : activeSwipe);
    }, SWIPE_SETTLE_DURATION);
    return () => window.clearTimeout(timeout);
  }, [swipe]);

  const startTurn = (direction: TurnDirection) => {
    if (isTurning || swipe) return;

    if (direction === "next" && canGoNext) {
      setTurning({ direction, targetPage: nextPage });
    } else if (direction === "previous" && canGoPrevious) {
      setTurning({ direction, targetPage: previousPage });
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isTurning || swipe || (!canGoNext && !canGoPrevious)) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const onRightPage = event.clientX >= bounds.left + bounds.width / 2;
    const direction = onRightPage ? "next" : "previous";
    if (direction === "next" ? !canGoNext : !canGoPrevious) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerStart.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      direction: null,
      pageWidth: bounds.width / 2,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    if (!start || start.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - start.startX;
    const deltaY = event.clientY - start.startY;

    if (!start.direction) {
      if (Math.abs(deltaX) < 8 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.15) {
        return;
      }
      start.direction = deltaX < 0 ? "next" : "previous";
    }

    event.preventDefault();
    start.lastX = event.clientX;
    start.lastTime = event.timeStamp;
    const progress = Math.min(
      Math.max(
        (start.direction === "next" ? -deltaX : deltaX) / start.pageWidth,
        0
      ),
      0.96
    );
    const targetPage = start.direction === "next" ? nextPage : previousPage;
    setSwipe({ direction: start.direction, progress, phase: "dragging", targetPage });
  };

  const finishPointerSwipe = (
    event: React.PointerEvent<HTMLDivElement>,
    cancelled = false
  ) => {
    const start = pointerStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    pointerStart.current = null;

    if (!start.direction) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      return;
    }

    const deltaX = event.clientX - start.startX;
    const progress = Math.min(
      Math.max(
        (start.direction === "next" ? -deltaX : deltaX) / start.pageWidth,
        0
      ),
      1
    );
    const elapsed = Math.max(event.timeStamp - start.lastTime, 1);
    const velocity = (event.clientX - start.lastX) / elapsed;
    const velocityTowardTurn = start.direction === "next" ? -velocity : velocity;
    const shouldTurn =
      !cancelled &&
      (progress >= 0.28 || (progress >= 0.08 && velocityTowardTurn >= 0.45));

    setSwipe({
      direction: start.direction,
      progress: shouldTurn ? 1 : 0,
      phase: "settling",
      targetPage: shouldTurn
        ? start.direction === "next" ? nextPage : previousPage
        : currentPage,
    });
  };

  const displayLeftPage = isCover ? pages[1] : pages[currentPage];
  const displayRightPage = isCover ? pages[2] : pages[currentPage + 1];
  const coverPage = pages[0];
  const activeDirection = turning?.direction ?? swipe?.direction;
  const activePhase = swipe?.phase;
  const flipFrontPage = turning || swipe
    ? activeDirection === "next"
      ? isCover ? coverPage : pages[currentPage + 1]
      : isCover ? undefined : pages[currentPage]
    : undefined;
  const flipBackPage = turning || swipe
    ? activeDirection === "next"
      ? isCover ? pages[1] : pages[currentPage + 2]
      : currentPage === 1 ? coverPage : pages[currentPage - 1]
    : undefined;
  const lastVisiblePage = isCover
    ? 1
    : Math.min(currentPage + 2, pages.length);
  const progress = Math.round((lastVisiblePage / pages.length) * 100);

  const renderPage = (page: RenderedPage | undefined, alt: string) => (
    page ? (
      <img
        src={page.dataUrl}
        alt={alt}
        draggable={false}
      />
    ) : <div className="blank-page" aria-hidden="true" />
  );

  return (
    <div className="book-reader">
      <header className="reader-toolbar">
        <button className="back-button" onClick={onClose}>
          <span aria-hidden="true">←</span>
          <span>Library</span>
        </button>

        <div className="reader-brand">
          <span className="reader-brand-mark" aria-hidden="true">⌑</span>
          <span>Private Reader</span>
        </div>

        <div className="reader-page-count" aria-live="polite">
          <span className="page-count-label">{isCover ? "COVER" : "PAGES"}</span>
          <strong>{isCover ? "1" : `${currentPage + 1}${displayRightPage ? `–${currentPage + 2}` : ""}`}</strong>
          <span className="page-count-total">/ {pages.length}</span>
        </div>
      </header>

      <main className="book-stage">
        <button
          className="book-navigation"
          onClick={() => startTurn("previous")}
          disabled={!canGoPrevious}
          aria-label="Previous spread"
        >
          <span aria-hidden="true">‹</span>
        </button>

        <div
          className={`book${swipe ? " is-swiping" : ""}${isCover ? " is-cover" : ""}`}
          style={{
            aspectRatio: `${(coverPage?.width ?? 450) * 2} / ${coverPage?.height ?? 636}`,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointerSwipe}
          onPointerCancel={(event) => finishPointerSwipe(event, true)}
          onLostPointerCapture={(event) => finishPointerSwipe(event, true)}
          aria-label="Book pages. Drag the right page to turn forward or the left page to turn back."
        >
          <div className="book-shadow" />

          <div className="book-page page-left">
            {renderPage(displayLeftPage, `Page ${displayLeftPage?.pageNumber ?? ""}`)}
          </div>
          <div className="book-page page-right">
            {renderPage(displayRightPage, `Page ${displayRightPage?.pageNumber ?? ""}`)}
          </div>

          {isCover && coverPage && !activeDirection && (
            <div className="book-page cover-surface">
              {renderPage(coverPage, `Cover, page ${coverPage.pageNumber}`)}
            </div>
          )}

          {flipFrontPage && (
            <div
              className={`book-page turn-leaf turn-${activeDirection}${activePhase ? ` is-${activePhase}` : ""}`}
              style={swipe ? {
                transform: `rotateY(${(activeDirection === "next" ? -180 : 180) * swipe.progress}deg)`,
              } : undefined}
            >
              <div className="turn-front">
                {renderPage(flipFrontPage, "")}
              </div>
              <div className="turn-back">
                {renderPage(flipBackPage, "")}
              </div>
            </div>
          )}
        </div>

        <button
          className="book-navigation"
          onClick={() => startTurn("next")}
          disabled={!canGoNext}
          aria-label="Next spread"
        >
          <span aria-hidden="true">›</span>
        </button>
      </main>

      <footer className="reader-footer">
        <span className="reader-hint">
          {isCover ? "Open the cover to begin reading" : "Drag a page to turn the spread"}
        </span>
        <div
          className="reading-progress"
          role="progressbar"
          aria-label="Reading progress"
          aria-valuemin={1}
          aria-valuemax={pages.length}
          aria-valuenow={lastVisiblePage}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
        <span className="reader-progress-label">{progress}% read</span>
      </footer>
    </div>
  );
}
