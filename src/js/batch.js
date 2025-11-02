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

import { fileOpen } from 'browser-fs-access';
import { inputImage } from './domrefs.js';
import { startProcessing } from './orchestrate.js';
import { exportSVG } from './export.js';
import { showToast } from './ui.js';
import { i18n } from './i18n.js';

/**
 * Process a single image file
 * @param {File} file - Image file
 * @returns {Promise<string>} SVG string
 */
const processImage = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        inputImage.src = e.target.result;
        // Wait for image to load
        setTimeout(async () => {
          await startProcessing();
          // Get SVG output after processing
          const svgOutput = document.querySelector('.svg-output');
          const svg = svgOutput.innerHTML;
          resolve(svg);
        }, 1000);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Batch process multiple images
 * @param {FileList|File[]} files - Array of image files
 * @param {Object} options - Batch processing options
 * @param {boolean} options.autoExport - Auto export after processing
 * @returns {Promise<Array<{fileName: string, svg: string}>>} Array of processed SVGs
 */
const batchProcess = async (files, options = {}) => {
  const { autoExport = false } = options;
  const results = [];
  const fileArray = Array.from(files);

  showToast(i18n.t('processingBatch') || `Processing ${fileArray.length} files...`, Infinity);

  for (let i = 0; i < fileArray.length; i++) {
    const file = fileArray[i];
    try {
      showToast(i18n.t('processingFile') || `Processing ${i + 1}/${fileArray.length}: ${file.name}`, Infinity);
      
      const svg = await processImage(file);
      
      if (autoExport) {
        // Export SVG
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name.replace(/\.[^\.]+$/, '.svg');
        a.click();
        URL.revokeObjectURL(url);
      }

      results.push({
        fileName: file.name,
        svg: svg,
      });
    } catch (err) {
      console.error(`Failed to process ${file.name}:`, err);
      results.push({
        fileName: file.name,
        svg: null,
        error: err.message,
      });
    }
  }

  showToast(i18n.t('batchComplete') || `Completed: ${results.length} files processed`);
  return results;
};

/**
 * Handle batch file selection
 */
const handleBatchSelection = async () => {
  try {
    const files = await fileOpen({
      mimeTypes: ['image/*'],
      description: 'Image files',
      multiple: true,
    });

    if (files.length === 0) {
      return;
    }

    if (files.length === 1) {
      // Single file - use normal processing
      const file = files[0];
      const blobURL = URL.createObjectURL(file);
      inputImage.addEventListener(
        'load',
        () => {
          URL.revokeObjectURL(blobURL);
        },
        { once: true },
      );
      inputImage.src = blobURL;
      return;
    }

    // Multiple files - batch processing
    await batchProcess(files, { autoExport: true });
  } catch (err) {
    console.error(err.name, err.message);
    showToast(err.message);
  }
};

export { batchProcess, handleBatchSelection };

