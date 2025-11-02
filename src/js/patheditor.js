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
 * Parse SVG path data into points
 * @param {string} pathData - SVG path data string
 * @returns {Array<{x: number, y: number, type: string}>} Array of points
 */
const parsePathToPoints = (pathData) => {
  const points = parsePathData(pathData);
  return points.map((point, index) => ({
    x: point.x,
    y: point.y,
    type: point.type || 'L',
    index,
  }));
};

/**
 * Convert points back to SVG path data
 * @param {Array<{x: number, y: number, type: string}>} points - Array of points
 * @returns {string} SVG path data string
 */
const pointsToPathData = (points) => {
  if (!points || points.length === 0) {
    return '';
  }

  let pathData = '';
  points.forEach((point, index) => {
    if (index === 0) {
      pathData += `M ${point.x} ${point.y} `;
    } else {
      const command = point.type || 'L';
      pathData += `${command} ${point.x} ${point.y} `;
    }
  });

  return pathData.trim();
};

/**
 * Remove point from path
 * @param {Array<{x: number, y: number, type: string}>} points - Array of points
 * @param {number} index - Index of point to remove
 * @returns {Array<{x: number, y: number, type: string}>} Updated points array
 */
const removePoint = (points, index) => {
  if (index < 0 || index >= points.length || points.length <= 2) {
    return points; // Can't remove if less than 2 points
  }
  const newPoints = [...points];
  newPoints.splice(index, 1);
  // Update indices
  return newPoints.map((point, i) => ({ ...point, index: i }));
};

/**
 * Update point position
 * @param {Array<{x: number, y: number, type: string}>} points - Array of points
 * @param {number} index - Index of point to update
 * @param {number} x - New x coordinate
 * @param {number} y - New y coordinate
 * @returns {Array<{x: number, y: number, type: string}>} Updated points array
 */
const updatePoint = (points, index, x, y) => {
  if (index < 0 || index >= points.length) {
    return points;
  }
  const newPoints = [...points];
  newPoints[index] = { ...newPoints[index], x, y };
  return newPoints;
};

/**
 * Add point to path
 * @param {Array<{x: number, y: number, type: string}>} points - Array of points
 * @param {number} index - Index where to insert point
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {Array<{x: number, y: number, type: string}>} Updated points array
 */
const addPoint = (points, index, x, y) => {
  const newPoints = [...points];
  // Calculate midpoint between adjacent points
  if (index >= 0 && index < points.length) {
    const prevPoint = points[index];
    const nextPoint = points[(index + 1) % points.length];
    const midX = (prevPoint.x + nextPoint.x) / 2;
    const midY = (prevPoint.y + nextPoint.y) / 2;
    newPoints.splice(index + 1, 0, {
      x: x !== undefined ? x : midX,
      y: y !== undefined ? y : midY,
      type: 'L',
      index: index + 1,
    });
  } else {
    newPoints.push({
      x: x !== undefined ? x : 0,
      y: y !== undefined ? y : 0,
      type: 'L',
      index: newPoints.length,
    });
  }
  // Update indices
  return newPoints.map((point, i) => ({ ...point, index: i }));
};

/**
 * Enable path node editor mode
 * @param {SVGElement} svgElement - SVG element to edit
 * @param {Function} onUpdate - Callback when path is updated
 */
const enablePathEditor = (svgElement, onUpdate) => {
  if (!svgElement) {
    return;
  }

  const paths = svgElement.querySelectorAll('path');
  const editedPaths = new Map(); // Store original path data

  paths.forEach((path, pathIndex) => {
    const originalPathData = path.getAttribute('d');
    editedPaths.set(path, originalPathData);
    const points = parsePathToPoints(originalPathData);

    // Create overlay for editing
    const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    overlay.classList.add('path-editor-overlay');
    overlay.dataset.pathIndex = pathIndex;

    // Add node indicators
    points.forEach((point, pointIndex) => {
      const node = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      node.setAttribute('cx', point.x);
      node.setAttribute('cy', point.y);
      node.setAttribute('r', '5');
      node.setAttribute('fill', '#ff0000');
      node.setAttribute('stroke', '#ffffff');
      node.setAttribute('stroke-width', '2');
      node.classList.add('path-node');
      node.dataset.pathIndex = pathIndex;
      node.dataset.pointIndex = pointIndex;
      node.style.cursor = 'move';

      // Make node draggable
      let isDragging = false;
      let startX, startY;

      node.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        e.preventDefault();
      });

      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        // Update point position (convert screen coordinates to SVG coordinates)
        const svg = path.closest('svg');
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgPoint = pt.matrixTransform(svg.getScreenCTM().inverse());

        const updatedPoints = updatePoint(points, pointIndex, svgPoint.x, svgPoint.y);
        const newPathData = pointsToPathData(updatedPoints);
        path.setAttribute('d', newPathData);

        // Update node position
        node.setAttribute('cx', svgPoint.x);
        node.setAttribute('cy', svgPoint.y);

        // Update points array
        points[pointIndex] = updatedPoints[pointIndex];

        startX = e.clientX;
        startY = e.clientY;
      });

      document.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          if (onUpdate) {
            onUpdate(path, path.getAttribute('d'));
          }
        }
      });

      // Double-click to remove node
      node.addEventListener('dblclick', (e) => {
        e.preventDefault();
        const updatedPoints = removePoint(points, pointIndex);
        const newPathData = pointsToPathData(updatedPoints);
        path.setAttribute('d', newPathData);

        // Remove node from overlay
        node.remove();

        // Re-render nodes
        overlay.innerHTML = '';
        updatedPoints.forEach((point, idx) => {
          const newNode = node.cloneNode(true);
          newNode.setAttribute('cx', point.x);
          newNode.setAttribute('cy', point.y);
          newNode.dataset.pointIndex = idx;
          overlay.appendChild(newNode);
        });

        if (onUpdate) {
          onUpdate(path, newPathData);
        }
      });

      overlay.appendChild(node);
    });

    svgElement.appendChild(overlay);
  });

  // Cleanup function
  return () => {
    const overlays = svgElement.querySelectorAll('.path-editor-overlay');
    overlays.forEach((overlay) => overlay.remove());
  };
};

/**
 * Disable path node editor mode
 * @param {SVGElement} svgElement - SVG element
 */
const disablePathEditor = (svgElement) => {
  if (!svgElement) {
    return;
  }
  const overlays = svgElement.querySelectorAll('.path-editor-overlay');
  overlays.forEach((overlay) => overlay.remove());
};

export {
  parsePathToPoints,
  pointsToPathData,
  removePoint,
  updatePoint,
  addPoint,
  enablePathEditor,
  disablePathEditor,
};

