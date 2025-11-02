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
 * Extract color from path element
 * @param {string} pathElement - Path element HTML string
 * @returns {string|null} Color string (fill or stroke color)
 */
const extractPathColor = (pathElement) => {
  const fillMatch = pathElement.match(/fill="([^"]+)"/);
  const strokeMatch = pathElement.match(/stroke="([^"]+)"/);
  
  // Prefer fill, fall back to stroke
  const color = fillMatch ? fillMatch[1] : (strokeMatch ? strokeMatch[1] : null);
  return color;
};

/**
 * Extract path data from path element
 * @param {string} pathElement - Path element HTML string
 * @returns {string|null} Path data string
 */
const extractPathData = (pathElement) => {
  const match = pathElement.match(/d="([^"]+)"/);
  return match ? match[1] : null;
};

/**
 * Check if two paths are adjacent (end points match)
 * @param {string} pathData1 - First path data
 * @param {string} pathData2 - Second path data
 * @returns {boolean} True if paths are adjacent
 */
const arePathsAdjacent = (pathData1, pathData2) => {
  if (!pathData1 || !pathData2) return false;
  
  // Extract last point from first path
  const points1 = pathData1.match(/[\d.]+/g) || [];
  if (points1.length < 2) return false;
  const lastX = parseFloat(points1[points1.length - 2]);
  const lastY = parseFloat(points1[points1.length - 1]);
  
  // Extract first point from second path (after M command)
  const points2 = pathData2.match(/[\d.]+/g) || [];
  if (points2.length < 2) return false;
  const firstX = parseFloat(points2[0]);
  const firstY = parseFloat(points2[1]);
  
  // Check if points are close (within 0.1 pixel tolerance)
  const threshold = 0.1;
  return Math.abs(lastX - firstX) < threshold && Math.abs(lastY - firstY) < threshold;
};

/**
 * Merge two path data strings
 * @param {string} pathData1 - First path data
 * @param {string} pathData2 - Second path data
 * @returns {string} Merged path data
 */
const mergePathData = (pathData1, pathData2) => {
  // Remove closing Z if present in first path
  let path1 = pathData1.trim().replace(/\s*[Zz]\s*$/, '');
  
  // Remove M command and keep only path commands from second path
  let path2 = pathData2.trim().replace(/^\s*[Mm]\s*[\d.\s,+-]+/, '');
  
  // If second path is empty after removing M, just return first path
  if (!path2.trim()) {
    return path1;
  }
  
  // Connect with L if needed, otherwise just concatenate
  return path1 + ' ' + path2;
};

/**
 * Parse path element and extract all attributes
 * @param {string} pathElement - Path element HTML string
 * @returns {Object} Path attributes
 */
const parsePathElement = (pathElement) => {
  const attrs = {};
  
  // Extract all attributes
  const attrRegex = /(\w+)="([^"]+)"/g;
  let match;
  while ((match = attrRegex.exec(pathElement)) !== null) {
    attrs[match[1]] = match[2];
  }
  
  return attrs;
};

/**
 * Create path element from attributes
 * @param {Object} attrs - Path attributes
 * @returns {string} Path element HTML string
 */
const createPathElement = (attrs) => {
  let html = '<path';
  for (const [key, value] of Object.entries(attrs)) {
    html += ` ${key}="${value}"`;
  }
  html += '/>';
  return html;
};

/**
 * Merge paths with same color and adjacent endpoints
 * @param {string} svg - SVG string
 * @returns {string} Merged SVG string
 */
const mergeSVGPaths = (svg) => {
  if (!svg || typeof svg !== 'string') {
    return svg;
  }

  // Extract all path elements
  const pathRegex = /<path\s+[^>]*\/?>/gi;
  const paths = [];
  let match;
  while ((match = pathRegex.exec(svg)) !== null) {
    paths.push({
      html: match[0],
      index: match.index,
      color: extractPathColor(match[0]),
      pathData: extractPathData(match[0]),
      attrs: parsePathElement(match[0]),
    });
  }

  if (paths.length === 0) {
    return svg;
  }

  // Group paths by color
  const pathsByColor = {};
  paths.forEach((path) => {
    const color = path.color || 'default';
    if (!pathsByColor[color]) {
      pathsByColor[color] = [];
    }
    pathsByColor[color].push(path);
  });

  // Merge paths within each color group
  const mergedPaths = [];
  for (const color in pathsByColor) {
    const colorPaths = pathsByColor[color];
    
    // Try to merge adjacent paths
    const processed = new Set();
    for (let i = 0; i < colorPaths.length; i++) {
      if (processed.has(i)) continue;
      
      let mergedPath = { ...colorPaths[i] };
      processed.add(i);
      
      // Try to find adjacent paths to merge
      let foundMore = true;
      while (foundMore) {
        foundMore = false;
        for (let j = 0; j < colorPaths.length; j++) {
          if (processed.has(j)) continue;
          
          if (arePathsAdjacent(mergedPath.pathData, colorPaths[j].pathData)) {
            // Merge path data
            mergedPath.pathData = mergePathData(mergedPath.pathData, colorPaths[j].pathData);
            mergedPath.attrs.d = mergedPath.pathData;
            mergedPath.html = createPathElement(mergedPath.attrs);
            processed.add(j);
            foundMore = true;
            break;
          }
          // Also check reverse order
          if (arePathsAdjacent(colorPaths[j].pathData, mergedPath.pathData)) {
            mergedPath.pathData = mergePathData(colorPaths[j].pathData, mergedPath.pathData);
            mergedPath.attrs.d = mergedPath.pathData;
            mergedPath.html = createPathElement(mergedPath.attrs);
            processed.add(j);
            foundMore = true;
            break;
          }
        }
      }
      
      mergedPaths.push(mergedPath);
    }
  }

  // Replace paths in SVG
  let result = svg;
  // Replace in reverse order to preserve indices
  for (let i = paths.length - 1; i >= 0; i--) {
    const path = paths[i];
    result = result.substring(0, path.index) + result.substring(path.index + path.html.length);
  }

  // Insert merged paths
  const svgMatch = svg.match(/<svg[^>]*>/);
  if (svgMatch) {
    const svgEnd = svgMatch[0].length;
    const pathStrings = mergedPaths.map(p => p.html).join('\n  ');
    result = result.substring(0, svgEnd) + '\n  ' + pathStrings + '\n' + result.substring(svgEnd);
  }

  return result;
};

export { mergeSVGPaths };
