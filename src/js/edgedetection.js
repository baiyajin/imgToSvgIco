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
 * Apply Sobel edge detection
 * @param {ImageData} imageData - Input image data
 * @param {Object} options - Edge detection options
 * @param {number} options.threshold - Edge threshold (0-255)
 * @returns {ImageData} Processed image data with edges highlighted
 */
const applySobelEdgeDetection = (imageData, options = {}) => {
  const { threshold = 50 } = options;
  const { width, height, data } = imageData;
  const result = new ImageData(width, height);

  // Sobel operators
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

  // Convert to grayscale first
  const grayData = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    grayData[i / 4] = gray;
  }

  // Apply Sobel operator
  const edgeData = new Uint8Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx));
          const gray = grayData[idx];
          gx += gray * sobelX[ky + 1][kx + 1];
          gy += gray * sobelY[ky + 1][kx + 1];
        }
      }

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      const idx = y * width + x;
      edgeData[idx] = magnitude > threshold ? 255 : 0;
    }
  }

  // Convert to output image data
  for (let i = 0; i < width * height; i++) {
    const value = edgeData[i];
    const idx = i * 4;
    result.data[idx] = value;
    result.data[idx + 1] = value;
    result.data[idx + 2] = value;
    result.data[idx + 3] = 255;
  }

  return result;
};

/**
 * Apply Canny edge detection (simplified version)
 * @param {ImageData} imageData - Input image data
 * @param {Object} options - Edge detection options
 * @param {number} options.lowThreshold - Low threshold for hysteresis
 * @param {number} options.highThreshold - High threshold for hysteresis
 * @returns {ImageData} Processed image data with edges highlighted
 */
const applyCannyEdgeDetection = (imageData, options = {}) => {
  const { lowThreshold = 50, highThreshold = 100 } = options;
  const { width, height, data } = imageData;
  const result = new ImageData(width, height);

  // Step 1: Convert to grayscale and apply Gaussian blur
  const grayData = new Float32Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    grayData[i / 4] = gray;
  }

  // Simple Gaussian blur (3x3 kernel)
  const blurred = new Float32Array(width * height);
  const gaussianKernel = [
    [1, 2, 1],
    [2, 4, 2],
    [1, 2, 1],
  ];
  const kernelSum = 16;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx));
          sum += grayData[idx] * gaussianKernel[ky + 1][kx + 1];
        }
      }
      blurred[y * width + x] = sum / kernelSum;
    }
  }

  // Step 2: Apply Sobel to get gradients
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

  const magnitude = new Float32Array(width * height);
  const direction = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx));
          const gray = blurred[idx];
          gx += gray * sobelX[ky + 1][kx + 1];
          gy += gray * sobelY[ky + 1][kx + 1];
        }
      }

      const mag = Math.sqrt(gx * gx + gy * gy);
      const dir = Math.atan2(gy, gx);
      magnitude[y * width + x] = mag;
      direction[y * width + x] = dir;
    }
  }

  // Step 3: Non-maximum suppression
  const suppressed = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const mag = magnitude[idx];
      const dir = direction[idx];

      // Determine neighboring pixels based on gradient direction
      let neighbor1 = 0;
      let neighbor2 = 0;

      const angle = (dir * 180 / Math.PI + 180) % 180;
      if ((angle >= 0 && angle < 22.5) || (angle >= 157.5 && angle < 180)) {
        // Horizontal
        neighbor1 = magnitude[y * width + (x - 1)];
        neighbor2 = magnitude[y * width + (x + 1)];
      } else if (angle >= 22.5 && angle < 67.5) {
        // Diagonal \
        neighbor1 = magnitude[(y - 1) * width + (x + 1)];
        neighbor2 = magnitude[(y + 1) * width + (x - 1)];
      } else if (angle >= 67.5 && angle < 112.5) {
        // Vertical
        neighbor1 = magnitude[(y - 1) * width + x];
        neighbor2 = magnitude[(y + 1) * width + x];
      } else {
        // Diagonal /
        neighbor1 = magnitude[(y - 1) * width + (x - 1)];
        neighbor2 = magnitude[(y + 1) * width + (x + 1)];
      }

      if (mag >= neighbor1 && mag >= neighbor2) {
        suppressed[idx] = mag;
      } else {
        suppressed[idx] = 0;
      }
    }
  }

  // Step 4: Hysteresis thresholding
  const edgeData = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    if (suppressed[i] >= highThreshold) {
      edgeData[i] = 255;
    } else if (suppressed[i] >= lowThreshold) {
      // Check if connected to strong edge
      const y = Math.floor(i / width);
      const x = i % width;
      let connected = false;
      for (let dy = -1; dy <= 1 && !connected; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            const nidx = ny * width + nx;
            if (edgeData[nidx] === 255 || suppressed[nidx] >= highThreshold) {
              connected = true;
              break;
            }
          }
        }
      }
      edgeData[i] = connected ? 255 : 0;
    } else {
      edgeData[i] = 0;
    }
  }

  // Convert to output image data
  for (let i = 0; i < width * height; i++) {
    const value = edgeData[i];
    const idx = i * 4;
    result.data[idx] = value;
    result.data[idx + 1] = value;
    result.data[idx + 2] = value;
    result.data[idx + 3] = 255;
  }

  return result;
};

/**
 * Apply edge detection based on mode
 * @param {ImageData} imageData - Input image data
 * @param {string} mode - 'sobel' or 'canny'
 * @param {Object} options - Edge detection options
 * @returns {ImageData} Processed image data
 */
const applyEdgeDetection = (imageData, mode = 'sobel', options = {}) => {
  if (mode === 'canny') {
    return applyCannyEdgeDetection(imageData, options);
  } else {
    return applySobelEdgeDetection(imageData, options);
  }
};

export { applyEdgeDetection, applySobelEdgeDetection, applyCannyEdgeDetection };

