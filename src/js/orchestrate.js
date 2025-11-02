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

import {
  preProcessMainCanvas,
  preProcessInputImage,
  supportsOffscreenCanvas,
} from './preprocess.js';
import { colorRadio, svgOutput, previewModeSelect } from './domrefs.js';
import { convertToMonochromeSVG } from './monochrome.js';
import { convertToColorSVG, intervalID } from './color.js';
import { showToast, MONOCHROME, COLOR, filterInputs, POTRACE } from './ui.js';
import { i18n } from './i18n.js';
import { simplifySVGPaths } from './pathsimplify.js';
import { smoothSVGPaths } from './pathsmooth.js';
import { mergeSVGPaths } from './pathmerge.js';
import { removeSmallRegions } from './remove-small-regions.js';
import { extractSVGOutline } from './pathoutline.js';
import { groupPaths } from './pathgroup.js';
import { reduceColorCount } from './colorquantize.js';
import { applyPreviewMode } from './previewmode.js';
import { getSVGStats } from './stats.js';

import spinnerSVG from '/spinner.svg?raw';

const readableSize = (size) => {
  if (size === 0) return '0B';
  const i = Math.floor(Math.log(size) / Math.log(1024));
  return `${(size / Math.pow(1024, i)).toFixed(2) * 1} ${['B', 'KB', 'MB'][i]}`;
};

const displayResult = (svg, className) => {
  if (!svg) {
    return;
  }
  // Remove `width` and `height` attributes.
  svg = svg
    .replace(/\s+width="\d+(?:\.\d+)?"/, '')
    .replace(/\s+height="\d+(?:\.\d+)"/, '');
  
  // Apply preview mode if set
  const previewMode = previewModeSelect?.value || 'normal';
  if (previewMode !== 'normal') {
    svg = applyPreviewMode(svg, previewMode, 2);
  }
  
  svgOutput.classList.remove(COLOR);
  svgOutput.classList.remove(MONOCHROME);
  svgOutput.classList.add(className);
  svgOutput.innerHTML = svg;
  
  // Display statistics
  const stats = getSVGStats(svg);
  const statsDisplay = document.querySelector('.stats-display');
  if (statsDisplay) {
    statsDisplay.hidden = false;
    statsDisplay.innerHTML = `
      <div>${i18n.t('pathCount')}: ${stats.pathCount}</div>
      <div>${i18n.t('nodeCount')}: ${stats.nodeCount}</div>
      <div>${i18n.t('colorCount')}: ${stats.colorCount}</div>
      <div>${i18n.t('svgSize')}: ${readableSize(svg.length)}</div>
    `;
  }
  
  // Enable path editor if checked
  const pathEditorEnabledCheckbox = document.querySelector('.path-editor-enabled');
  if (pathEditorEnabledCheckbox?.checked) {
    setTimeout(async () => {
      const svgElement = svgOutput.closest('svg') || svgOutput;
      const { enablePathEditor } = await import('./patheditor.js');
      enablePathEditor(svgElement, (path, newPathData) => {
        // Path updated callback - update statistics
        const updatedSvg = svgElement.innerHTML;
        const updatedStats = getSVGStats(updatedSvg);
        if (statsDisplay) {
          statsDisplay.innerHTML = `
            <div>${i18n.t('pathCount')}: ${updatedStats.pathCount}</div>
            <div>${i18n.t('nodeCount')}: ${updatedStats.nodeCount}</div>
            <div>${i18n.t('colorCount')}: ${updatedStats.colorCount}</div>
            <div>${i18n.t('svgSize')}: ${readableSize(updatedSvg.length)}</div>
          `;
        }
      });
    }, 100);
  }
  
  showToast(`${i18n.t('svgSize')}: ${readableSize(svg.length)}`, 3000);
};

const startProcessing = async () => {
  svgOutput.innerHTML = '';
  svgOutput.classList.remove(COLOR, MONOCHROME);
  if (intervalID.current) {
    clearInterval(intervalID.current);
    intervalID.current = null;
  }
  const transform = svgOutput.getAttribute('transform');
  svgOutput.innerHTML = spinnerSVG;
  if (transform) {
    svgOutput.dataset.transform = transform;
    svgOutput.setAttribute('transform', '');
  }
  const imageData = supportsOffscreenCanvas
    ? await preProcessInputImage()
    : preProcessMainCanvas();
  if (colorRadio.checked) {
    let svg = await convertToColorSVG(imageData);
    // Apply path simplification if enabled
    const simplifyTolerance = Number(filterInputs[POTRACE.pathSimplify]?.value || 0);
    if (simplifyTolerance > 0) {
      svg = simplifySVGPaths(svg, simplifyTolerance);
    }
    // Apply path smoothing if enabled
    const smoothness = Number(filterInputs[POTRACE.pathSmooth]?.value || 0);
    if (smoothness > 0) {
      svg = smoothSVGPaths(svg, smoothness / 100);
    }
    // Apply path merging if enabled
    const pathMergeEnabledCheckbox = document.querySelector('.path-merge-enabled');
    const pathMergeEnabled = pathMergeEnabledCheckbox?.checked || false;
    if (pathMergeEnabled) {
      svg = mergeSVGPaths(svg);
    }
    // Remove small regions if enabled
    const removeSmallThreshold = Number(filterInputs[POTRACE.removeSmallRegions]?.value || 0);
    if (removeSmallThreshold > 0) {
      svg = removeSmallRegions(svg, removeSmallThreshold, 'dimension');
    }
    // Extract outline if enabled
    const outlineWidth = Number(filterInputs[POTRACE.pathOutline]?.value || 0);
    if (outlineWidth > 0) {
      svg = extractSVGOutline(svg, outlineWidth);
    }
    // Group paths if enabled
    const pathGroupEnabledCheckbox = document.querySelector('.path-group-enabled');
    const pathGroupEnabled = pathGroupEnabledCheckbox?.checked || false;
    if (pathGroupEnabled) {
      svg = groupPaths(svg, { byColor: true, byProximity: false });
    }
    // Optimize color quantization if enabled
    const colorQuantization = Number(filterInputs[POTRACE.colorQuantization]?.value || 0);
    if (colorQuantization > 0 && colorQuantization < 256) {
      svg = reduceColorCount(svg, colorQuantization);
    }
    if (transform) {
      svgOutput.setAttribute('transform', transform);
    }
    displayResult(svg, COLOR);
  } else {
    let svg = await convertToMonochromeSVG(imageData);
    // Apply path simplification if enabled
    const simplifyTolerance = Number(filterInputs[POTRACE.pathSimplify]?.value || 0);
    if (simplifyTolerance > 0) {
      svg = simplifySVGPaths(svg, simplifyTolerance);
    }
    // Apply path smoothing if enabled
    const smoothness = Number(filterInputs[POTRACE.pathSmooth]?.value || 0);
    if (smoothness > 0) {
      svg = smoothSVGPaths(svg, smoothness / 100);
    }
    // Apply path merging if enabled
    const pathMergeEnabledCheckbox = document.querySelector('.path-merge-enabled');
    const pathMergeEnabled = pathMergeEnabledCheckbox?.checked || false;
    if (pathMergeEnabled) {
      svg = mergeSVGPaths(svg);
    }
    // Remove small regions if enabled
    const removeSmallThreshold = Number(filterInputs[POTRACE.removeSmallRegions]?.value || 0);
    if (removeSmallThreshold > 0) {
      svg = removeSmallRegions(svg, removeSmallThreshold, 'dimension');
    }
    // Extract outline if enabled
    const outlineWidth = Number(filterInputs[POTRACE.pathOutline]?.value || 0);
    if (outlineWidth > 0) {
      svg = extractSVGOutline(svg, outlineWidth);
    }
    // Group paths if enabled
    const pathGroupEnabledCheckbox = document.querySelector('.path-group-enabled');
    const pathGroupEnabled = pathGroupEnabledCheckbox?.checked || false;
    if (pathGroupEnabled) {
      svg = groupPaths(svg, { byColor: true, byProximity: false });
    }
    // Optimize color quantization if enabled
    const colorQuantization = Number(filterInputs[POTRACE.colorQuantization]?.value || 0);
    if (colorQuantization > 0 && colorQuantization < 256) {
      svg = reduceColorCount(svg, colorQuantization);
    }
    if (transform) {
      svgOutput.setAttribute('transform', transform);
    }
    displayResult(svg, MONOCHROME);
  }
};

export { startProcessing };
