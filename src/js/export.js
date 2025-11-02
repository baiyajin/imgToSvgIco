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

import { svgOutput } from './domrefs.js';
import { showToast } from './ui.js';
import { i18n } from './i18n.js';

/**
 * Convert SVG to PNG using Canvas
 * @param {string} svg - SVG string
 * @param {number} width - Output width
 * @param {number} height - Output height
 * @returns {Promise<Blob>} PNG blob
 */
const svgToPNG = async (svg, width = 1024, height = 1024) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert to PNG'));
        }
      }, 'image/png');
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG'));
    };

    img.src = url;
  });
};

/**
 * Export SVG as PNG
 * @param {string} svg - SVG string
 * @param {string} fileName - File name
 */
const exportAsPNG = async (svg, fileName = 'output.png') => {
  try {
    // Get SVG dimensions
    const match = svg.match(/viewBox="([^"]+)"/) || svg.match(/width="([^"]+)"\s+height="([^"]+)"/);
    let width = 1024;
    let height = 1024;

    if (match) {
      if (match[1] && match[1].includes(' ')) {
        const viewBox = match[1].split(/\s+/);
        width = parseFloat(viewBox[2]) || width;
        height = parseFloat(viewBox[3]) || height;
      } else if (match[2] && match[3]) {
        width = parseFloat(match[2]) || width;
        height = parseFloat(match[3]) || height;
      }
    }

    const blob = await svgToPNG(svg, width, height);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    showToast(i18n.t('exportedPNG') || 'Exported as PNG');
  } catch (err) {
    console.error(err);
    showToast(err.message);
  }
};

/**
 * Export SVG as PDF (simplified - using canvas approach)
 * @param {string} svg - SVG string
 * @param {string} fileName - File name
 */
const exportAsPDF = async (svg, fileName = 'output.pdf') => {
  try {
    // Note: Full PDF export would require a library like jsPDF
    // This is a simplified version that converts to image first
    showToast(i18n.t('pdfExportUnavailable') || 'PDF export requires additional library');
    // Fallback: suggest PNG export
    await exportAsPNG(svg, fileName.replace('.pdf', '.png'));
  } catch (err) {
    console.error(err);
    showToast(err.message);
  }
};

/**
 * Export current SVG output
 * @param {string} format - Export format: 'svg', 'png', 'pdf'
 */
const exportSVG = async (format = 'svg') => {
  const svg = svgOutput.innerHTML;
  if (!svg) {
    showToast(i18n.t('noSVGToExport') || 'No SVG to export');
    return;
  }

  // Wrap in SVG element if needed
  let fullSVG = svg;
  if (!svg.trim().startsWith('<svg')) {
    fullSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${svg}</svg>`;
  }

  const baseName = 'svgcode-export';

  switch (format) {
    case 'png':
      await exportAsPNG(fullSVG, `${baseName}.png`);
      break;
    case 'pdf':
      await exportAsPDF(fullSVG, `${baseName}.pdf`);
      break;
    case 'svg':
    default:
      // Export as SVG file
      const blob = new Blob([fullSVG], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}.svg`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(i18n.t('exportedSVG') || 'Exported as SVG');
      break;
  }
};

export { exportSVG, exportAsPNG, exportAsPDF };

