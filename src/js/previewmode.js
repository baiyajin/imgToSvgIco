/**
 * SVGcode—Convert raster images to SVG vector graphics
 * Copyright (C) 2021 Google LLC
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

/**
 * Apply preview mode to SVG
 * @param {string} svg - SVG string
 * @param {string} mode - Preview mode: 'normal', 'fill-only', 'outline-only', 'wireframe'
 * @param {number} outlineWidth - Outline width for outline mode
 * @returns {string} SVG with preview mode applied
 */
const applyPreviewMode = (svg, mode = 'normal', outlineWidth = 2) => {
  if (!svg || typeof svg !== 'string' || mode === 'normal') {
    return svg;
  }

  // Match all path elements
  const pathRegex = /<path\s+([^>]*)\/?>/gi;

  return svg.replace(pathRegex, (match, attributes) => {
    let newAttributes = attributes;

    switch (mode) {
      case 'fill-only':
        // Remove stroke, keep fill
        newAttributes = newAttributes
          .replace(/\s+stroke="[^"]*"/g, '')
          .replace(/\s+stroke-width="[^"]*"/g, '')
          .replace(/\s+stroke-opacity="[^"]*"/g, '');
        // Ensure fill exists
        if (!newAttributes.includes('fill=')) {
          newAttributes = 'fill="currentColor" ' + newAttributes;
        }
        break;

      case 'outline-only':
        // Remove fill, keep stroke
        newAttributes = newAttributes
          .replace(/\s+fill="[^"]*"/g, 'fill="none"');
        // Ensure stroke exists
        if (!newAttributes.includes('stroke=')) {
          newAttributes = newAttributes.replace('d="', `stroke="currentColor" stroke-width="${outlineWidth}" d="`);
        } else {
          // Update stroke-width
          newAttributes = newAttributes.replace(/\s+stroke-width="[^"]*"/g, ` stroke-width="${outlineWidth}"`);
          if (!newAttributes.includes('stroke-width=')) {
            newAttributes = newAttributes.replace('stroke="', `stroke="currentColor" stroke-width="${outlineWidth}" `);
          }
        }
        break;

      case 'wireframe':
        // Show only paths as thin strokes, no fill
        newAttributes = newAttributes
          .replace(/\s+fill="[^"]*"/g, 'fill="none"')
          .replace(/\s+stroke="[^"]*"/g, 'stroke="#000"')
          .replace(/\s+stroke-width="[^"]*"/g, 'stroke-width="1"');
        if (!newAttributes.includes('stroke=')) {
          newAttributes = 'stroke="#000" stroke-width="1" ' + newAttributes;
        }
        break;

      default:
        return match;
    }

    return `<path ${newAttributes}/>`;
  });
};

/**
 * Get CSS class name for preview mode
 * @param {string} mode - Preview mode
 * @returns {string} CSS class name
 */
const getPreviewModeClass = (mode) => {
  const modeClasses = {
    'normal': '',
    'fill-only': 'preview-fill-only',
    'outline-only': 'preview-outline-only',
    'wireframe': 'preview-wireframe',
  };
  return modeClasses[mode] || '';
};

export { applyPreviewMode, getPreviewModeClass };

