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
 * Smooth a point using Gaussian smoothing
 * @param {Array<{x: number, y: number}>} points - Array of points
 * @param {number} index - Current point index
 * @param {number} radius - Smoothing radius
 * @returns {{x: number, y: number}} Smoothed point
 */
const smoothPoint = (points, index, radius) => {
  const n = points.length;
  if (n <= 2) {
    return points[index];
  }

  let sumX = 0;
  let sumY = 0;
  let weightSum = 0;

  for (let i = -radius; i <= radius; i++) {
    const idx = (index + i + n) % n;
    const weight = Math.exp(-(i * i) / (2 * radius * radius));
    sumX += points[idx].x * weight;
    sumY += points[idx].y * weight;
    weightSum += weight;
  }

  return {
    x: sumX / weightSum,
    y: sumY / weightSum,
  };
};

/**
 * Apply Catmull-Rom spline interpolation to smooth path
 * @param {Array<{x: number, y: number}>} points - Original points
 * @param {number} smoothness - Smoothness factor (0-1)
 * @returns {Array<{x: number, y: number}>} Smoothed points
 */
const catmullRomSmooth = (points, smoothness) => {
  if (points.length <= 2) {
    return points;
  }

  const smoothed = [];
  const tension = 1 - smoothness;

  for (let i = 0; i < points.length; i++) {
    const p0 = points[(i - 1 + points.length) % points.length];
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const p3 = points[(i + 2) % points.length];

    // Catmull-Rom spline coefficients
    const t = 0.5; // Midpoint
    const t2 = t * t;
    const t3 = t2 * t;

    const x =
      (2 * p1.x) +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3;
    const y =
      (2 * p1.y) +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3;

    // Blend with original point based on smoothness
    smoothed.push({
      x: p1.x * (1 - smoothness) + x * smoothness * 0.5,
      y: p1.y * (1 - smoothness) + y * smoothness * 0.5,
    });
  }

  return smoothed;
};

/**
 * Smooth SVG path data
 * @param {string} pathData - Original SVG path data
 * @param {number} smoothness - Smoothness level (0-1)
 * @returns {string} Smoothed SVG path data
 */
const smoothPath = (pathData, smoothness) => {
  if (!pathData || pathData.trim() === '' || smoothness <= 0) {
    return pathData;
  }

  // Parse path into points
  const points = parsePathData(pathData);
  if (points.length <= 2) {
    return pathData;
  }

  // Check if path is closed
  const isClosed = /[Zz]\s*$/.test(pathData.trim());

  // Apply smoothing
  let smoothedPoints;
  if (smoothness < 0.5) {
    // Use Gaussian smoothing for low smoothness
    const radius = Math.max(1, Math.floor(smoothness * 10));
    smoothedPoints = points.map((point, index) =>
      smoothPoint(points, index, radius),
    );
  } else {
    // Use Catmull-Rom spline for high smoothness
    smoothedPoints = catmullRomSmooth(points, smoothness);
  }

  // Convert back to path data
  return pointsToPathData(smoothedPoints, isClosed);
};

/**
 * Smooth all paths in SVG string
 * @param {string} svg - SVG string
 * @param {number} smoothness - Smoothness level (0-1)
 * @returns {string} Smoothed SVG string
 */
const smoothSVGPaths = (svg, smoothness) => {
  if (!svg || typeof svg !== 'string' || smoothness <= 0) {
    return svg;
  }

  // Match all path elements with their d attribute
  const pathRegex = /<path\s+[^>]*d="([^"]+)"[^>]*\/?>/gi;

  return svg.replace(pathRegex, (match, pathData) => {
    const smoothed = smoothPath(pathData, smoothness);
    return match.replace(`d="${pathData}"`, `d="${smoothed}"`);
  });
};

export { smoothPath, smoothSVGPaths };

