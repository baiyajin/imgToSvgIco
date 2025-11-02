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

import { parsePathData } from './pathsimplify.js';

/**
 * Calculate bounding box of path points
 * @param {Array<{x: number, y: number}>} points - Path points
 * @returns {{minX: number, minY: number, maxX: number, maxY: number, width: number, height: number}} Bounding box
 */
const getBoundingBox = (points) => {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

/**
 * Calculate approximate area of path using shoelace formula
 * @param {Array<{x: number, y: number}>} points - Path points
 * @returns {number} Approximate area
 */
const calculateArea = (points) => {
  if (points.length < 3) {
    return 0;
  }

  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return Math.abs(area / 2);
};

/**
 * Calculate path length
 * @param {Array<{x: number, y: number}>} points - Path points
 * @returns {number} Path length
 */
const calculatePathLength = (points) => {
  if (points.length < 2) {
    return 0;
  }

  let length = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    length += Math.sqrt(dx * dx + dy * dy);
  }

  // Close path if needed
  if (points.length > 2) {
    const dx = points[0].x - points[points.length - 1].x;
    const dy = points[0].y - points[points.length - 1].y;
    length += Math.sqrt(dx * dx + dy * dy);
  }

  return length;
};

/**
 * Remove small paths from SVG
 * @param {string} svg - SVG string
 * @param {number} threshold - Size threshold (in pixels squared or path segments)
 * @param {string} mode - 'area' or 'length' or 'dimension'
 * @returns {string} SVG with small paths removed
 */
const removeSmallRegions = (svg, threshold = 10, mode = 'area') => {
  if (!svg || typeof svg !== 'string' || threshold <= 0) {
    return svg;
  }

  // Match all path elements
  const pathRegex = /<path\s+[^>]*d="([^"]+)"[^>]*\/?>/gi;

  return svg.replace(pathRegex, (match, pathData) => {
    // Parse path data
    const points = parsePathData(pathData);
    
    if (points.length === 0) {
      return match; // Keep path if can't parse
    }

    let size = 0;
    
    switch (mode) {
      case 'area':
        // Calculate area
        size = calculateArea(points);
        break;
      case 'length':
        // Calculate path length
        size = calculatePathLength(points);
        break;
      case 'dimension':
      default:
        // Calculate bounding box dimensions
        const bbox = getBoundingBox(points);
        size = Math.min(bbox.width, bbox.height);
        break;
    }

    // Remove path if smaller than threshold
    if (size < threshold) {
      return ''; // Remove the path
    }

    return match; // Keep the path
  });
};

export { removeSmallRegions };

