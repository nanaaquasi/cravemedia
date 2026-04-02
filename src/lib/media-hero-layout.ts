/**
 * Hero strip on media / season detail: flush top/right/left in the content column.
 * - Cancels GlobalLayout content `pt-6 md:pt-8` with negative margin so the hero meets the top inset.
 * - Below `md`: full viewport width (sidebar hidden).
 * - `md`+: width `calc(100vw - 240px)` to span main (sidebar is 240px) and margin formula centers breakout
 *   from the max-w-7xl inner column; no rounding so edges stay flush.
 */
export const MEDIA_DETAIL_HERO_CLASS =
  "relative -mt-6 md:-mt-8 mb-6 overflow-hidden rounded-none aspect-video max-h-[280px] sm:max-h-[320px] min-w-0 max-md:w-screen max-md:max-w-[100vw] max-md:left-1/2 max-md:-translate-x-1/2 md:left-auto md:translate-x-0 md:w-[calc(100vw-240px)] md:max-w-none md:ml-[calc((100%-100vw+240px)/2)]";
