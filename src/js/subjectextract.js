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
 * Calculate the distance between two colors in RGB space
 * @param {number} r1 - Red channel of first color
 * @param {number} g1 - Green channel of first color
 * @param {number} b1 - Blue channel of first color
 * @param {number} r2 - Red channel of second color
 * @param {number} g2 - Green channel of second color
 * @param {number} b2 - Blue channel of second color
 * @returns {number} Color distance
 */
const colorDistance = (r1, g1, b1, r2, g2, b2) => {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
};

/**
 * Extract subject from image by removing background
 * Uses edge detection and color-based segmentation
 * @param {ImageData} imageData - Input image data
 * @param {Object} options - Extraction options
 * @param {number} options.threshold - Color threshold for background removal (0-255)
 * @param {boolean} options.detectEdges - Whether to use edge detection
 * @param {boolean} options.keepCorners - Whether to keep corner pixels as subject
 * @returns {ImageData} Processed image data with transparent background
 */
const extractSubject = (imageData, options = {}) => {
  const {
    threshold = 30,
    detectEdges = true,
    keepCorners = true,
  } = options;

  const { width, height, data } = imageData;
  const result = new ImageData(width, height);
  const visited = new Uint8Array(width * height);
  const isBackground = new Uint8Array(width * height);

  // Sample corner pixels as background candidates
  const cornerSamples = [];
  if (keepCorners) {
    const sampleSize = Math.min(10, Math.floor(width * 0.1), Math.floor(height * 0.1));
    for (let y = 0; y < sampleSize; y++) {
      for (let x = 0; x < sampleSize; x++) {
        // Top-left corner
        const idx = (y * width + x) * 4;
        cornerSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
        // Top-right corner
        const idx2 = (y * width + (width - 1 - x)) * 4;
        cornerSamples.push([data[idx2], data[idx2 + 1], data[idx2 + 2]]);
        // Bottom-left corner
        const idx3 = ((height - 1 - y) * width + x) * 4;
        cornerSamples.push([data[idx3], data[idx3 + 1], data[idx3 + 2]]);
        // Bottom-right corner
        const idx4 = ((height - 1 - y) * width + (width - 1 - x)) * 4;
        cornerSamples.push([data[idx4], data[idx4 + 1], data[idx4 + 2]]);
      }
    }
  }

  // Calculate average background color from corners
  let avgBgR = 0;
  let avgBgG = 0;
  let avgBgB = 0;
  if (cornerSamples.length > 0) {
    cornerSamples.forEach(([r, g, b]) => {
      avgBgR += r;
      avgBgG += g;
      avgBgB += b;
    });
    avgBgR /= cornerSamples.length;
    avgBgG /= cornerSamples.length;
    avgBgB /= cornerSamples.length;
  }

  // First pass: identify background pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a < 128) {
        // Transparent or semi-transparent pixels are background
        isBackground[y * width + x] = 1;
        continue;
      }

      // Calculate distance from corner average
      const dist = colorDistance(r, g, b, avgBgR, avgBgG, avgBgB);
      
      // If color is similar to background, mark as background
      if (dist < threshold) {
        isBackground[y * width + x] = 1;
      }
    }
  }

  // Edge detection using Sobel operator
  if (detectEdges) {
    const sobelX = [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1],
    ];
    const sobelY = [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1],
    ];

    const edgeStrength = new Uint8Array(width * height);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0;
        let gy = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            gx += gray * sobelX[ky + 1][kx + 1];
            gy += gray * sobelY[ky + 1][kx + 1];
          }
        }

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        edgeStrength[y * width + x] = magnitude;
      }
    }

    // If pixel is on strong edge, keep it as subject
    const edgeThreshold = 30;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (edgeStrength[idx] > edgeThreshold) {
          isBackground[idx] = 0;
        }
      }
    }
  }

  // Flood fill from corners to remove connected background regions
  const floodFill = (startX, startY) => {
    const stack = [[startX, startY]];
    while (stack.length > 0) {
      const [x, y] = stack.pop();
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      const idx = y * width + x;
      if (visited[idx] || !isBackground[idx]) continue;

      visited[idx] = 1;
      isBackground[idx] = 1;

      stack.push([x + 1, y]);
      stack.push([x - 1, y]);
      stack.push([x, y + 1]);
      stack.push([x, y - 1]);
    }
  };

  // Flood fill from corner regions
  if (keepCorners) {
    const sampleSize = Math.min(20, Math.floor(width * 0.15), Math.floor(height * 0.15));
    for (let y = 0; y < sampleSize; y++) {
      for (let x = 0; x < sampleSize; x++) {
        floodFill(x, y);
        floodFill(width - 1 - x, y);
        floodFill(x, height - 1 - y);
        floodFill(width - 1 - x, height - 1 - y);
      }
    }
  }

  // Apply results: make background transparent
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    if (isBackground[i]) {
      // Make background transparent
      result.data[idx] = 0;
      result.data[idx + 1] = 0;
      result.data[idx + 2] = 0;
      result.data[idx + 3] = 0;
    } else {
      // Keep subject pixels
      result.data[idx] = data[idx];
      result.data[idx + 1] = data[idx + 1];
      result.data[idx + 2] = data[idx + 2];
      result.data[idx + 3] = data[idx + 3];
    }
  }

  return result;
};

export { extractSubject };

