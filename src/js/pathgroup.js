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
 * Extract color from path element
 * @param {string} pathElement - Path element HTML string
 * @returns {string} Color string
 */
const extractPathColor = (pathElement) => {
  const fillMatch = pathElement.match(/fill="([^"]+)"/);
  const strokeMatch = pathElement.match(/stroke="([^"]+)"/);
  return fillMatch ? fillMatch[1] : (strokeMatch ? strokeMatch[1] : '#000000');
};

/**
 * Calculate bounding box center
 * @param {string} pathData - Path data string
 * @returns {{x: number, y: number}|null} Center point
 */
const getPathCenter = (pathData) => {
  const points = parsePathData(pathData);
  if (points.length === 0) {
    return null;
  }

  let sumX = 0;
  let sumY = 0;
  for (const point of points) {
    sumX += point.x;
    sumY += point.y;
  }

  return {
    x: sumX / points.length,
    y: sumY / points.length,
  };
};

/**
 * Group paths by color
 * @param {string} svg - SVG string
 * @returns {string} SVG with paths grouped by color
 */
const groupPathsByColor = (svg) => {
  if (!svg || typeof svg !== 'string') {
    return svg;
  }

  // Extract all path elements
  const pathRegex = /<path\s+([^>]*)\/?>/gi;
  const paths = [];
  let match;
  
  while ((match = pathRegex.exec(svg)) !== null) {
    const color = extractPathColor(match[0]);
    paths.push({
      html: match[0],
      color: color,
      index: match.index,
    });
  }

  if (paths.length === 0) {
    return svg;
  }

  // Group paths by color
  const pathsByColor = {};
  paths.forEach((path) => {
    if (!pathsByColor[path.color]) {
      pathsByColor[path.color] = [];
    }
    pathsByColor[path.color].push(path);
  });

  // Create grouped SVG
  const svgMatch = svg.match(/<svg([^>]*)>/);
  if (!svgMatch) {
    return svg;
  }

  let groupedSVG = `<svg${svgMatch[1]}>`;
  const svgEnd = svgMatch[0].length;

  // Remove old paths
  let result = svg;
  for (let i = paths.length - 1; i >= 0; i--) {
    const path = paths[i];
    result = result.substring(0, path.index) + result.substring(path.index + path.html.length);
  }

  // Add grouped paths
  for (const color in pathsByColor) {
    if (pathsByColor[color].length > 1) {
      // Group multiple paths with same color
      const groupId = `group-${color.replace(/[^a-zA-Z0-9]/g, '-')}`;
      groupedSVG += `<g id="${groupId}" fill="${color}" stroke="${color}">\n  `;
      pathsByColor[color].forEach((path) => {
        // Remove fill and stroke from individual paths (inherited from group)
        const cleanPath = path.html
          .replace(/\s+fill="[^"]*"/g, '')
          .replace(/\s+stroke="[^"]*"/g, '');
        groupedSVG += cleanPath + '\n  ';
      });
      groupedSVG += '</g>\n';
    } else {
      // Single path, keep as is
      groupedSVG += pathsByColor[color][0].html + '\n';
    }
  }

  // Combine with rest of SVG
  groupedSVG += result.substring(svgEnd);
  
  return groupedSVG;
};

/**
 * Group paths by spatial proximity
 * @param {string} svg - SVG string
 * @param {number} proximityThreshold - Proximity threshold in pixels
 * @returns {string} SVG with paths grouped by proximity
 */
const groupPathsByProximity = (svg, proximityThreshold = 50) => {
  if (!svg || typeof svg !== 'string') {
    return svg;
  }

  // Extract all path elements with their centers
  const pathRegex = /<path\s+[^>]*d="([^"]+)"[^>]*\/?>/gi;
  const paths = [];
  let match;
  
  while ((match = pathRegex.exec(svg)) !== null) {
    const center = getPathCenter(match[1]);
    if (center) {
      paths.push({
        html: match[0],
        pathData: match[1],
        center: center,
        index: match.index,
        group: -1,
      });
    }
  }

  if (paths.length === 0) {
    return svg;
  }

  // Group paths by proximity
  let currentGroup = 0;
  for (let i = 0; i < paths.length; i++) {
    if (paths[i].group === -1) {
      paths[i].group = currentGroup;
      // Find nearby paths
      for (let j = i + 1; j < paths.length; j++) {
        if (paths[j].group === -1) {
          const dx = paths[i].center.x - paths[j].center.x;
          const dy = paths[i].center.y - paths[j].center.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < proximityThreshold) {
            paths[j].group = currentGroup;
          }
        }
      }
      currentGroup++;
    }
  }

  // Create grouped SVG
  const svgMatch = svg.match(/<svg([^>]*)>/);
  if (!svgMatch) {
    return svg;
  }

  let groupedSVG = `<svg${svgMatch[1]}>`;
  const svgEnd = svgMatch[0].length;

  // Remove old paths
  let result = svg;
  for (let i = paths.length - 1; i >= 0; i--) {
    const path = paths[i];
    result = result.substring(0, path.index) + result.substring(path.index + path.html.length);
  }

  // Group paths
  const pathsByGroup = {};
  paths.forEach((path) => {
    if (!pathsByGroup[path.group]) {
      pathsByGroup[path.group] = [];
    }
    pathsByGroup[path.group].push(path);
  });

  // Add grouped paths
  for (const groupId in pathsByGroup) {
    const groupPaths = pathsByGroup[groupId];
    if (groupPaths.length > 1) {
      groupedSVG += `<g id="group-proximity-${groupId}">\n  `;
      groupPaths.forEach((path) => {
        groupedSVG += path.html + '\n  ';
      });
      groupedSVG += '</g>\n';
    } else {
      groupedSVG += groupPaths[0].html + '\n';
    }
  }

  // Combine with rest of SVG
  groupedSVG += result.substring(svgEnd);
  
  return groupedSVG;
};

/**
 * Group paths intelligently (by color and/or proximity)
 * @param {string} svg - SVG string
 * @param {Object} options - Grouping options
 * @param {boolean} options.byColor - Group by color
 * @param {boolean} options.byProximity - Group by spatial proximity
 * @param {number} options.proximityThreshold - Proximity threshold for spatial grouping
 * @returns {string} Grouped SVG
 */
const groupPaths = (svg, options = {}) => {
  const {
    byColor = true,
    byProximity = false,
    proximityThreshold = 50,
  } = options;

  let result = svg;

  if (byColor) {
    result = groupPathsByColor(result);
  }

  if (byProximity) {
    result = groupPathsByProximity(result, proximityThreshold);
  }

  return result;
};

export { groupPaths, groupPathsByColor, groupPathsByProximity };

