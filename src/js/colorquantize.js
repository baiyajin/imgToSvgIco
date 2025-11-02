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
 * Quantize color to reduce color count
 * @param {string} color - RGB color string (e.g., "rgb(255,128,64)")
 * @param {number} levels - Number of quantization levels (2-256)
 * @returns {string} Quantized color
 */
const quantizeColor = (color, levels = 16) => {
  // Parse RGB color
  const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) {
    return color;
  }

  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);

  // Quantize each channel
  const step = 256 / levels;
  const quantizedR = Math.round(r / step) * step;
  const quantizedG = Math.round(g / step) * step;
  const quantizedB = Math.round(b / step) * step;

  return `rgb(${Math.min(255, Math.max(0, quantizedR))}, ${Math.min(255, Math.max(0, quantizedG))}, ${Math.min(255, Math.max(0, quantizedB))})`;
};

/**
 * Optimize color quantization in SVG
 * @param {string} svg - SVG string
 * @param {number} colorLevels - Number of color quantization levels
 * @returns {string} SVG with optimized colors
 */
const optimizeColorQuantization = (svg, colorLevels = 16) => {
  if (!svg || typeof svg !== 'string' || colorLevels < 2 || colorLevels > 256) {
    return svg;
  }

  // Match all fill and stroke colors
  const colorRegex = /(fill|stroke)="(rgb\([^)]+\)|#[0-9a-fA-F]{3,6})"/g;

  return svg.replace(colorRegex, (match, attribute, color) => {
    // Handle hex colors
    if (color.startsWith('#')) {
      // Convert hex to RGB
      const hex = color.substring(1);
      const r = parseInt(hex.length === 3 ? hex[0].repeat(2) : hex.substring(0, 2), 16);
      const g = parseInt(hex.length === 3 ? hex[1].repeat(2) : hex.substring(2, 4), 16);
      const b = parseInt(hex.length === 3 ? hex[2].repeat(2) : hex.substring(4, 6), 16);
      const quantized = quantizeColor(`rgb(${r},${g},${b})`, colorLevels);
      return `${attribute}="${quantized}"`;
    }

    // Handle RGB colors
    if (color.startsWith('rgb')) {
      const quantized = quantizeColor(color, colorLevels);
      return `${attribute}="${quantized}"`;
    }

    return match;
  });
};

/**
 * Group similar colors together to reduce color count
 * @param {string} svg - SVG string
 * @param {number} maxColors - Maximum number of colors to keep
 * @returns {string} SVG with reduced color count
 */
const reduceColorCount = (svg, maxColors = 16) => {
  if (!svg || typeof svg !== 'string' || maxColors < 2 || maxColors > 256) {
    return svg;
  }

  // Extract all unique colors
  const colorRegex = /(?:fill|stroke)="(rgb\([^)]+\)|#[0-9a-fA-F]{3,6})"/g;
  const colorMap = new Map();
  const colors = [];

  let match;
  while ((match = colorRegex.exec(svg)) !== null) {
    const color = match[1];
    if (!colorMap.has(color)) {
      colorMap.set(color, colors.length);
      colors.push(color);
    }
  }

  if (colors.length <= maxColors) {
    return svg; // Already within limit
  }

  // Calculate color similarity and group similar colors
  const colorGroups = [];
  const processed = new Set();

  for (let i = 0; i < colors.length; i++) {
    if (processed.has(i)) continue;

    const group = [i];
    processed.add(i);
    const color1 = colors[i];

    // Parse color1
    let r1, g1, b1;
    if (color1.startsWith('#')) {
      const hex = color1.substring(1);
      r1 = parseInt(hex.length === 3 ? hex[0].repeat(2) : hex.substring(0, 2), 16);
      g1 = parseInt(hex.length === 3 ? hex[1].repeat(2) : hex.substring(2, 4), 16);
      b1 = parseInt(hex.length === 3 ? hex[2].repeat(2) : hex.substring(4, 6), 16);
    } else if (color1.startsWith('rgb')) {
      const match = color1.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        r1 = parseInt(match[1]);
        g1 = parseInt(match[2]);
        b1 = parseInt(match[3]);
      } else {
        continue;
      }
    } else {
      continue;
    }

    // Find similar colors
    for (let j = i + 1; j < colors.length; j++) {
      if (processed.has(j)) continue;

      const color2 = colors[j];
      let r2, g2, b2;
      if (color2.startsWith('#')) {
        const hex = color2.substring(1);
        r2 = parseInt(hex.length === 3 ? hex[0].repeat(2) : hex.substring(0, 2), 16);
        g2 = parseInt(hex.length === 3 ? hex[1].repeat(2) : hex.substring(2, 4), 16);
        b2 = parseInt(hex.length === 3 ? hex[2].repeat(2) : hex.substring(4, 6), 16);
      } else if (color2.startsWith('rgb')) {
        const match = color2.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
          r2 = parseInt(match[1]);
          g2 = parseInt(match[2]);
          b2 = parseInt(match[3]);
        } else {
          continue;
        }
      } else {
        continue;
      }

      // Calculate color distance
      const distance = Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
      const threshold = 255 / maxColors * 2; // Adaptive threshold

      if (distance < threshold) {
        group.push(j);
        processed.add(j);
      }
    }

    colorGroups.push(group);
  }

  // Calculate average color for each group
  const representativeColors = new Map();
  colorGroups.forEach((group, groupIndex) => {
    if (group.length === 0) return;

    let sumR = 0, sumG = 0, sumB = 0;
    group.forEach((colorIndex) => {
      const color = colors[colorIndex];
      let r, g, b;
      if (color.startsWith('#')) {
        const hex = color.substring(1);
        r = parseInt(hex.length === 3 ? hex[0].repeat(2) : hex.substring(0, 2), 16);
        g = parseInt(hex.length === 3 ? hex[1].repeat(2) : hex.substring(2, 4), 16);
        b = parseInt(hex.length === 3 ? hex[2].repeat(2) : hex.substring(4, 6), 16);
      } else if (color.startsWith('rgb')) {
        const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
          r = parseInt(match[1]);
          g = parseInt(match[2]);
          b = parseInt(match[3]);
        } else {
          return;
        }
      } else {
        return;
      }

      sumR += r;
      sumG += g;
      sumB += b;
    });

    const avgR = Math.round(sumR / group.length);
    const avgG = Math.round(sumG / group.length);
    const avgB = Math.round(sumB / group.length);
    const avgColor = `rgb(${avgR},${avgG},${avgB})`;

    group.forEach((colorIndex) => {
      representativeColors.set(colors[colorIndex], avgColor);
    });
  });

  // Replace colors in SVG
  let result = svg;
  representativeColors.forEach((newColor, oldColor) => {
    const regex = new RegExp(`(fill|stroke)="${oldColor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g');
    result = result.replace(regex, (match, attribute) => {
      return `${attribute}="${newColor}"`;
    });
  });

  return result;
};

export { optimizeColorQuantization, reduceColorCount };

