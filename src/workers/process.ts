/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Mat } from '@techstark/opencv-js';
import { PDFDocument, degrees, rgb } from 'pdf-lib';

import { getOpenCv } from './opencv';
import { MiniData } from './types';

// Metric Measurements & Constants
const SCALE_HEIGHT_MM = 32.0;
const FLAP_HEIGHT_MM = 3.0;
const SPACING_MM = 5.0;
const BORDER_WIDTH_MM = 0.15;
const DILATION_PIXELS = 7;
const BLUR_SIZE_PIXELS = 25;

// pdf-lib uses points (1 mm = 2.83465 points)
const MM_TO_PT = 2.83465;
const A4_WIDTH = 210.0 * MM_TO_PT;
const A4_HEIGHT = 297.0 * MM_TO_PT;

const GREY_COLOUR = rgb(0.7, 0.7, 0.7);
const BLACK_COLOUR = rgb(0, 0, 0);
const WHITE_COLOUR = rgb(1, 1, 1);

interface ProcessedMini {
  readonly width: number;
  readonly height: number;
  readonly base64: string;
}

/**
 * Loads an image from a Data URL into an ImageBitmap (Worker-safe alternative to HTMLImageElement)
 */
async function loadImageInWorker(dataUrl: string): Promise<ImageBitmap> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return createImageBitmap(blob);
}

/**
 * Converts an OpenCV Mat back to a base64 PNG string using OffscreenCanvas
 */
async function matToBase64Worker(mat: Mat): Promise<string> {
  const { cv } = await getOpenCv();
  // Use OffscreenCanvas for Worker environments
  const canvas = new OffscreenCanvas(mat.cols, mat.rows);
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('OffscreenCanvas context not available');

  const imgData = ctx.createImageData(mat.cols, mat.rows);

  const rgbaMat = new cv.Mat();
  if (mat.channels() === 1) {
    cv.cvtColor(mat, rgbaMat, cv.COLOR_GRAY2RGBA);
  } else if (mat.channels() === 3) {
    cv.cvtColor(mat, rgbaMat, cv.COLOR_BGR2RGBA);
  } else {
    mat.copyTo(rgbaMat);
  }

  imgData.data.set(rgbaMat.data);
  ctx.putImageData(imgData, 0, 0);
  rgbaMat.delete();

  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // Return only the base64 payload for pdf-lib
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Processes a single miniature image
 */
export async function processImage(dataUrl: string): Promise<ProcessedMini | null> {
  const { cv } = await getOpenCv();

  const image = await loadImageInWorker(dataUrl);

  const canvas = new OffscreenCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(image, 0, 0);
  const imgData = ctx.getImageData(0, 0, image.width, image.height);

  const img = cv.matFromImageData(imgData);
  const h = img.rows;
  const w = img.cols;

  const floodMask = cv.Mat.zeros(h + 2, w + 2, cv.CV_8UC1);
  const tempImg = new cv.Mat();
  cv.cvtColor(img, tempImg, cv.COLOR_RGBA2RGB);

  const edgeThreshold = 245;
  const tolerance = new cv.Scalar(10, 10, 10, 0);
  const newVal = new cv.Scalar(255, 255, 255, 0);
  const rect = new cv.Rect();

  // Multi-seed border probe (Top & Bottom edges)
  for (let x = 0; x < w; x++) {
    for (const y of [0, h - 1]) {
      const pixel = tempImg.ucharPtr(y, x);
      if (pixel[0] >= edgeThreshold && pixel[1] >= edgeThreshold && pixel[2] >= edgeThreshold) {
        cv.floodFill(tempImg, floodMask, new cv.Point(x, y), newVal, rect, tolerance, tolerance, 4);
      }
    }
  }

  // Left & Right edges
  for (let y = 0; y < h; y++) {
    for (const x of [0, w - 1]) {
      const pixel = tempImg.ucharPtr(y, x);
      if (pixel[0] >= edgeThreshold && pixel[1] >= edgeThreshold && pixel[2] >= edgeThreshold) {
        cv.floodFill(tempImg, floodMask, new cv.Point(x, y), newVal, rect, tolerance, tolerance, 4);
      }
    }
  }

  const backgroundMask = floodMask.roi(new cv.Rect(1, 1, w, h));
  const figureMask = new cv.Mat();
  cv.threshold(backgroundMask, figureMask, 0, 255, cv.THRESH_BINARY_INV);

  const kernel = cv.Mat.ones(3, 3, cv.CV_8UC1);
  const dilatedMask = new cv.Mat();
  cv.dilate(figureMask, dilatedMask, kernel, new cv.Point(-1, -1), DILATION_PIXELS);

  const blurredMask = new cv.Mat();
  cv.GaussianBlur(dilatedMask, blurredMask, new cv.Size(BLUR_SIZE_PIXELS, BLUR_SIZE_PIXELS), 0);

  const rgbaChannels = new cv.MatVector();
  cv.split(img, rgbaChannels);
  rgbaChannels.set(3, blurredMask);
  cv.merge(rgbaChannels, img);

  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(blurredMask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  if (contours.size() === 0) {
    [
      img,
      tempImg,
      floodMask,
      backgroundMask,
      figureMask,
      kernel,
      dilatedMask,
      blurredMask,
      rgbaChannels,
      contours,
      hierarchy,
    ].forEach((m) => void m?.delete?.());
    return null;
  }

  // Combine bounding boxes of all detected contours
  let minX = w,
    minY = h,
    maxX = 0,
    maxY = 0;
  for (let i = 0; i < contours.size(); i++) {
    const r = cv.boundingRect(contours.get(i));
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.width);
    maxY = Math.max(maxY, r.y + r.height);
  }

  const cropRect = new cv.Rect(minX, minY, maxX - minX, maxY - minY);
  const cropped = img.roi(cropRect);

  const result = {
    width: cropped.cols,
    height: cropped.rows,
    base64: await matToBase64Worker(cropped),
  };

  [
    img,
    tempImg,
    floodMask,
    backgroundMask,
    figureMask,
    kernel,
    dilatedMask,
    blurredMask,
    rgbaChannels,
    contours,
    hierarchy,
    cropped,
  ].forEach((m) => void m?.delete?.());

  return result;
}

/**
 * Orchestrates the PDF generation from an array of front/back data URLs
 */
export async function generatePdf(minisData: MiniData[]): Promise<Uint8Array> {
  const minis: Array<{ front: ProcessedMini; back: ProcessedMini }> = [];
  let maxPixelHeight = 0;

  for (const data of minisData) {
    const fImg = await processImage(data.frontDataUrl);
    const bImg = await processImage(data.backDataUrl);

    if (fImg && bImg) {
      minis.push({ front: fImg, back: bImg });
      maxPixelHeight = Math.max(maxPixelHeight, fImg.height, bImg.height);
    }
  }

  if (minis.length === 0) {
    throw new Error('No miniatures were successfully processed.');
  }

  const pxToMm = SCALE_HEIGHT_MM / maxPixelHeight;
  const backdropH = (SCALE_HEIGHT_MM + SPACING_MM) * MM_TO_PT;
  const flapH = FLAP_HEIGHT_MM * MM_TO_PT;
  const totalAssemblyH = (backdropH + flapH) * 2;
  const spacingPt = SPACING_MM * MM_TO_PT;

  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

  let currX = spacingPt;
  let currY = A4_HEIGHT - spacingPt - totalAssemblyH;

  for (const mini of minis) {
    const frontImage = await pdfDoc.embedPng(mini.front.base64);
    const backImage = await pdfDoc.embedPng(mini.back.base64);

    const miniW = mini.front.width * pxToMm * MM_TO_PT;
    const miniH = mini.front.height * pxToMm * MM_TO_PT;
    const backW = mini.back.width * pxToMm * MM_TO_PT;
    const backH = mini.back.height * pxToMm * MM_TO_PT;
    const boxW = miniW + spacingPt;

    if (currX + boxW > A4_WIDTH - spacingPt) {
      currX = spacingPt;
      currY -= totalAssemblyH + spacingPt;
      if (currY < spacingPt) {
        page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
        currY = A4_HEIGHT - spacingPt - totalAssemblyH;
      }
    }

    const yBottomFlap = currY;
    const yFrontBox = yBottomFlap + flapH;
    const yBackBox = yFrontBox + backdropH;
    const yTopFlap = yBackBox + backdropH;

    // 1. Draw Backdrops
    const rectOptions = {
      width: boxW,
      height: backdropH,
      color: BLACK_COLOUR,
      borderColor: WHITE_COLOUR,
      borderWidth: BORDER_WIDTH_MM * MM_TO_PT,
      borderDashArray: [MM_TO_PT, MM_TO_PT],
    };
    page.drawRectangle({ ...rectOptions, x: currX, y: yFrontBox });
    page.drawRectangle({ ...rectOptions, x: currX, y: yBackBox });

    // 2. Draw Flaps
    page.drawRectangle({ x: currX, y: yBottomFlap, width: boxW, height: flapH, color: GREY_COLOUR });
    page.drawRectangle({ x: currX, y: yTopFlap, width: boxW, height: flapH, color: GREY_COLOUR });

    // 3. Place Miniatures
    const imgX = currX + (boxW - miniW) / 2;

    page.drawImage(frontImage, { x: imgX, y: yFrontBox, width: miniW, height: miniH });

    // Mirror at the fold line (rotated 180 degrees)
    page.drawImage(backImage, {
      x: currX + boxW / 2 + backW / 2,
      y: yTopFlap,
      width: backW,
      height: backH,
      rotate: degrees(180),
    });

    currX += boxW;
  }

  return pdfDoc.save();
}
