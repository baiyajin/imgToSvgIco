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
 * Parse SVG path data string into points
 * @param {string} pathData - SVG path data string
 * @returns {Array<{x: number, y: number, type: string}>} Array of path points
 */
const parsePathData = (pathData) => {
  const points = [];
  const commands = pathData.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g) || [];
  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;

  for (const command of commands) {
    const type = command[0];
    const isRelative = type === type.toLowerCase();
    const coords = command.slice(1).trim().split(/[\s,]+/).filter(s => s).map(parseFloat);

    switch (type.toLowerCase()) {
      case 'm': // moveto
        if (isRelative) {
          currentX += coords[0] || 0;
          currentY += coords[1] || 0;
        } else {
          currentX = coords[0] || currentX;
          currentY = coords[1] || currentY;
        }
        startX = currentX;
        startY = currentY;
        points.push({ x: currentX, y: currentY, type: 'M' });
        break;
      case 'l': // lineto
        if (isRelative) {
          currentX += coords[0] || 0;
          currentY += coords[1] || 0;
        } else {
          currentX = coords[0] || currentX;
          currentY = coords[1] || currentY;
        }
        points.push({ x: currentX, y: currentY, type: 'L' });
        break;
      case 'h': // horizontal lineto
        if (isRelative) {
          currentX += coords[0] || 0;
        } else {
          currentX = coords[0] || currentX;
        }
        points.push({ x: currentX, y: currentY, type: 'L' });
        break;
      case 'v': // vertical lineto
        if (isRelative) {
          currentY += coords[0] || 0;
        } else {
          currentY = coords[0] || currentY;
        }
        points.push({ x: currentX, y: currentY, type: 'L' });
        break;
      case 'z': // closepath
        if (currentX !== startX || currentY !== startY) {
          currentX = startX;
          currentY = startY;
          points.push({ x: startX, y: startY, type: 'L' });
        }
        break;
      default:
        // For curves and other complex commands, extract end points
        if (coords.length >= 2) {
          const endIndex = coords.length - 2;
          if (isRelative) {
            currentX += coords[endIndex] || 0;
            currentY += coords[endIndex + 1] || 0;
          } else {
            currentX = coords[endIndex] || currentX;
            currentY = coords[endIndex + 1] || currentY;
          }
          points.push({ x: currentX, y: currentY, type: 'L' });
        }
        break;
    }
  }

  return points;
};

/**
 * Calculate perpendicular distance from a point to a line segment
 * @param {{x: number, y: number}} point - The point
 * @param {{x: number, y: number}} lineStart - Start of line segment
 * @param {{x: number, y: number}} lineEnd - End of line segment
 * @returns {number} Perpendicular distance
 */
const perpendicularDistance = (point, lineStart, lineEnd) => {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;

  if (dx === 0 && dy === 0) {
    // Line segment is actually a point
    const distX = point.x - lineStart.x;
    const distY = point.y - lineStart.y;
    return Math.sqrt(distX * distX + distY * distY);
  }

  const t = Math.max(0, Math.min(1, ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy)));
  const projX = lineStart.x + t * dx;
  const projY = lineStart.y + t * dy;

  const distX = point.x - projX;
  const distY = point.y - projY;
  return Math.sqrt(distX * distX + distY * distY);
};

/**
 * Douglas-Peucker algorithm to simplify path
 * @param {Array<{x: number, y: number}>} points - Array of points
 * @param {number} tolerance - Tolerance threshold
 * @returns {Array<{x: number, y: number}>} Simplified points
 */
const douglasPeucker = (points, tolerance) => {
  if (points.length <= 2) {
    return points;
  }

  let maxDistance = 0;
  let maxIndex = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], start, end);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  if (maxDistance > tolerance) {
    // Recursively simplify
    const left = douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
    const right = douglasPeucker(points.slice(maxIndex), tolerance);

    // Combine results, removing duplicate point
    return [...left.slice(0, -1), ...right];
  } else {
    // All points are within tolerance
    return [start, end];
  }
};

/**
 * Convert simplified points back to SVG path data
 * @param {Array<{x: number, y: number, type: string}>} points - Simplified points
 * @param {boolean} closed - Whether path should be closed
 * @returns {string} SVG path data string
 */
const pointsToPathData = (points, closed = false) => {
  if (points.length === 0) {
    return '';
  }

  let pathData = '';
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (i === 0) {
      pathData += `M ${point.x} ${point.y}`;
    } else {
      pathData += ` L ${point.x} ${point.y}`;
    }
  }

  if (closed) {
    pathData += ' Z';
  }

  return pathData;
};

/**
 * Simplify SVG path data using Douglas-Peucker algorithm
 * @param {string} pathData - Original SVG path data
 * @param {number} tolerance - Tolerance threshold (default: 1.0)
 * @returns {string} Simplified SVG path data
 */
const simplifyPath = (pathData, tolerance = 1.0) => {
  if (!pathData || pathData.trim() === '') {
    return pathData;
  }

  // Check if path is closed
  const isClosed = /[Zz]\s*$/.test(pathData.trim());

  // Parse path into points
  const points = parsePathData(pathData);

  if (points.length <= 2) {
    return pathData;
  }

  // Apply Douglas-Peucker algorithm
  const simplifiedPoints = douglasPeucker(points, tolerance);

  // Convert back to path data
  return pointsToPathData(simplifiedPoints, isClosed);
};

/**
 * Simplify all paths in SVG string
 * @param {string} svg - SVG string
 * @param {number} tolerance - Tolerance threshold
 * @returns {string} Simplified SVG string
 */
const simplifySVGPaths = (svg, tolerance = 1.0) => {
  if (!svg || typeof svg !== 'string') {
    return svg;
  }

  // Match all path elements with their d attribute
  const pathRegex = /<path\s+[^>]*d="([^"]+)"[^>]*\/?>/gi;
  
  return svg.replace(pathRegex, (match, pathData) => {
    const simplified = simplifyPath(pathData, tolerance);
    return match.replace(`d="${pathData}"`, `d="${simplified}"`);
  });
};

export { parsePathData, pointsToPathData, simplifyPath, simplifySVGPaths };

