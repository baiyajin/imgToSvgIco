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

import { parsePathData, pointsToPathData } from './pathsimplify.js';

/**
 * Convert fill path to outline/stroke path
 * @param {string} pathData - Original path data
 * @param {number} strokeWidth - Stroke width in pixels
 * @returns {string} Path data for outline
 */
const convertToOutline = (pathData, strokeWidth = 2) => {
  if (!pathData || pathData.trim() === '' || strokeWidth <= 0) {
    return pathData;
  }

  // Parse path into points
  const points = parsePathData(pathData);
  if (points.length < 2) {
    return pathData;
  }

  const isClosed = /[Zz]\s*$/.test(pathData.trim());

  // Convert to outline by removing fill and adding stroke
  // Keep the same path data but change rendering attributes
  return pathData;
};

/**
 * Extract outline from all paths in SVG
 * @param {string} svg - SVG string
 * @param {number} strokeWidth - Stroke width for outline
 * @returns {string} SVG with paths converted to outlines
 */
const extractSVGOutline = (svg, strokeWidth = 2) => {
  if (!svg || typeof svg !== 'string' || strokeWidth <= 0) {
    return svg;
  }

  // Match all path elements
  const pathRegex = /<path\s+([^>]*d="([^"]+)"[^>]*)\/?>/gi;

  return svg.replace(pathRegex, (match, attributes, pathData) => {
    // Extract fill and stroke attributes
    const fillMatch = attributes.match(/fill="([^"]*)"/);
    const strokeMatch = attributes.match(/stroke="([^"]*)"/);
    const strokeWidthMatch = attributes.match(/stroke-width="([^"]*)"/);
    
    // Get current fill color (prefer fill, fallback to stroke)
    const fillColor = fillMatch ? fillMatch[1] : (strokeMatch ? strokeMatch[1] : '#000000');
    
    // Create outline path by removing fill and setting stroke
    let newAttributes = attributes
      .replace(/fill="[^"]*"/, 'fill="none"')
      .replace(/stroke="[^"]*"/, `stroke="${fillColor}"`)
      .replace(/stroke-width="[^"]*"/, `stroke-width="${strokeWidth}"`);
    
    // Add stroke if it doesn't exist
    if (!newAttributes.includes('stroke="')) {
      newAttributes = newAttributes.replace('d="', `stroke="${fillColor}" stroke-width="${strokeWidth}" d="`);
    }
    
    // Add stroke-width if it doesn't exist
    if (!newAttributes.includes('stroke-width="')) {
      newAttributes = newAttributes.replace('d="', `stroke-width="${strokeWidth}" d="`);
    }
    
    // Ensure fill is set to none
    if (!newAttributes.includes('fill=')) {
      newAttributes = newAttributes.replace('d="', 'fill="none" d="');
    }

    return `<path ${newAttributes}/>`;
  });
};

export { extractSVGOutline, convertToOutline };

