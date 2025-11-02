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
 * Count paths and nodes in SVG
 * @param {string} svg - SVG string
 * @returns {{pathCount: number, nodeCount: number, fileSize: number, colorCount: number}} Statistics
 */
const getSVGStats = (svg) => {
  if (!svg || typeof svg !== 'string') {
    return {
      pathCount: 0,
      nodeCount: 0,
      fileSize: 0,
      colorCount: 0,
    };
  }

  // Count paths
  const pathRegex = /<path\s+[^>]*d="([^"]+)"[^>]*\/?>/gi;
  let pathCount = 0;
  let nodeCount = 0;
  const colors = new Set();
  let match;

  while ((match = pathRegex.exec(svg)) !== null) {
    pathCount++;
    const pathData = match[1];
    const points = parsePathData(pathData);
    nodeCount += points.length;

    // Extract colors
    const fillMatch = match[0].match(/fill="([^"]+)"/);
    const strokeMatch = match[0].match(/stroke="([^"]+)"/);
    if (fillMatch) {
      colors.add(fillMatch[1]);
    }
    if (strokeMatch) {
      colors.add(strokeMatch[1]);
    }
  }

  return {
    pathCount,
    nodeCount,
    fileSize: svg.length,
    colorCount: colors.size,
  };
};

/**
 * Format statistics as readable string
 * @param {Object} stats - Statistics object
 * @returns {string} Formatted statistics string
 */
const formatStats = (stats) => {
  return `路径数: ${stats.pathCount} | 节点数: ${stats.nodeCount} | 颜色数: ${stats.colorCount} | 大小: ${(stats.fileSize / 1024).toFixed(2)} KB`;
};

export { getSVGStats, formatStats };

