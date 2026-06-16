/**
 * svgLabel — safe SVG text label positioning
 * Flips label to the left of its dot when the dot is in the right 55% of the container,
 * preventing overflow regardless of label length, container width, or idea title.
 * Use this for every dot label in every SVG visualization on the platform.
 *
 * @param {number} cx          - dot's x pixel position within the SVG
 * @param {number} containerW  - total SVG width in pixels
 * @param {number} offset      - pixel gap between dot edge and label (default 8)
 * @returns {{ x: number, textAnchor: string }}
 */
export function svgLabelAttrs(cx, containerW, offset = 8) {
  if (cx > containerW * 0.55) {
    return { x: cx - offset, textAnchor: 'end' }
  }
  return { x: cx + offset, textAnchor: 'start' }
}
