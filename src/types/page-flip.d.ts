declare module "page-flip" {
  export interface PageFlipOptions {
    width: number;
    height: number;

    size?: "fixed" | "stretch";

    minWidth?: number;
    maxWidth?: number;

    minHeight?: number;
    maxHeight?: number;

    showCover?: boolean;

    drawShadow?: boolean;

    flippingTime?: number;

    usePortrait?: boolean;

    mobileScrollSupport?: boolean;

    startPage?: number;

    maxShadowOpacity?: number;
  }

  export interface FlipEvent {
    data: number;
  }

  export class PageFlip {
    constructor(
      element: HTMLElement,
      options: PageFlipOptions
    );

    loadFromHTML(
      elements: HTMLElement[]
    ): void;

    loadFromImages(
      images: string[]
    ): void;

    flipNext(
      corner?: "top" | "bottom"
    ): void;

    flipPrev(
      corner?: "top" | "bottom"
    ): void;

    flip(
      page: number,
      corner?: "top" | "bottom"
    ): void;

    getPageCount(): number;

    getCurrentPageIndex(): number;

    on(
      event: string,
      callback: (event: FlipEvent) => void
    ): void;

    destroy(): void;
  }
}