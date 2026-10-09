import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

import { PDFDocument, degrees } from "pdf-lib";
import { ZipArchive } from "archiver";
import { fileURLToPath } from "url";

import {
  mergePDFs,
  splitPDF,
  convertPDFToImages,
  imagesToPDF,
  compressPDF,
  rotatePDF,
  addWatermarkToPDF,
  protectPDF,
  unlockPDF,
  getPDFMetadata,
  updatePDFMetadata,
  organizePDF,
  annotatePDF,
  addPageNumbersToPDF,
} from "../services/pdfService.js";

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);


const hexToRgb = (hex) => {
  const cleanHex = String(hex || "")
    .replace("#", "")
    .trim();

  if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
    return {
      r: 0.5,
      g: 0.5,
      b: 0.5,
    };
  }

  const r = parseInt(cleanHex.substring(0, 2), 16);

  const g = parseInt(cleanHex.substring(2, 4), 16);

  const b = parseInt(cleanHex.substring(4, 6), 16);

  return {
    r: r / 255,
    g: g / 255,
    b: b / 255,
  };
};

export const mergePDFController = async (req, res) => {
  try {
    if (!req.files || req.files.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least 2 PDF files",
      });
    }

    const mergedPdf = await mergePDFs(req.files);

    const outputDir = path.join(process.cwd(), "outputs");

    await fs.mkdir(outputDir, {
      recursive: true,
    });

    const fileName = `merged-${Date.now()}.pdf`;

    const outputPath = path.join(outputDir, fileName);

    await fs.writeFile(outputPath, mergedPdf);

    // Delete uploaded temporary files
    for (const file of req.files) {
      await fs.unlink(file.path).catch(() => {});
    }

    res.download(outputPath, "merged.pdf", async (error) => {
      if (error) {
        console.error("Download error:", error);
      }

      // Delete generated PDF after download
      await fs.unlink(outputPath).catch(() => {});
    });
  } catch (error) {
    console.error("Merge PDF Error:", error);

    // Cleanup uploaded files if processing fails
    if (req.files) {
      for (const file of req.files) {
        await fs.unlink(file.path).catch(() => {});
      }
    }

    res.status(500).json({
      success: false,
      message: "Failed to merge PDF files",
      error: error.message,
    });
  }
};

export const getPDFInfoController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a PDF file",
      });
    }

    const pdfBytes = await fs.readFile(req.file.path);

    const pdfDoc = await PDFDocument.load(pdfBytes);

    const totalPages = pdfDoc.getPageCount();

    await fs.unlink(req.file.path).catch(() => {});

    res.json({
      success: true,
      totalPages,
    });
  } catch (error) {
    console.error("PDF Info Error:", error);

    if (req.file) {
      const fs = await import("fs/promises");
      await fs.unlink(req.file.path).catch(() => {});
    }

    res.status(500).json({
      success: false,
      message: "Unable to read PDF",
    });
  }
};

export const splitPDFController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a PDF file",
      });
    }

    const { pages } = req.body;

    if (!pages) {
      await fs.unlink(req.file.path).catch(() => {});

      return res.status(400).json({
        success: false,
        message: "Please provide page numbers",
      });
    }

    const pdfBytes = await fs.readFile(req.file.path);

    const sourcePdf = await PDFDocument.load(pdfBytes);

    const totalPages = sourcePdf.getPageCount();

    const pageNumbers = pages
      .split(",")
      .map((page) => Number(page.trim()) - 1)
      .filter(
        (page) => Number.isInteger(page) && page >= 0 && page < totalPages,
      );

    if (pageNumbers.length === 0) {
      await fs.unlink(req.file.path).catch(() => {});

      return res.status(400).json({
        success: false,
        message: "Invalid page numbers",
      });
    }

    const splitPdf = await splitPDF(req.file.path, pageNumbers);

    const outputDir = path.join(process.cwd(), "outputs");

    await fs.mkdir(outputDir, {
      recursive: true,
    });

    const fileName = `split-${Date.now()}.pdf`;

    const outputPath = path.join(outputDir, fileName);

    await fs.writeFile(outputPath, splitPdf);

    await fs.unlink(req.file.path).catch(() => {});

    res.download(outputPath, "split.pdf", async () => {
      await fs.unlink(outputPath).catch(() => {});
    });
  } catch (error) {
    console.error("Split PDF Error:", error);

    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    res.status(500).json({
      success: false,
      message: "Failed to split PDF",
      error: error.message,
    });
  }
};

export const pdfToImagesController = async (req, res) => {
  let outputDir = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a PDF file",
      });
    }

    const filePath = req.file.path;

    const jobId = `pdf-images-${Date.now()}-${Math.round(Math.random() * 1e9)}`;

    outputDir = path.join(process.cwd(), "outputs", jobId);

    await fs.mkdir(outputDir, {
      recursive: true,
    });

    const imagePaths = await convertPDFToImages(filePath, outputDir, "png");

    if (imagePaths.length === 0) {
      throw new Error("No pages found in PDF");
    }

    const zipPath = path.join(process.cwd(), "outputs", `${jobId}.zip`);

    await new Promise((resolve, reject) => {
      const output = fsSync.createWriteStream(zipPath);

      const archive = new ZipArchive({
        zlib: {
          level: 9,
        },
      });

      output.on("close", resolve);

      output.on("error", reject);

      archive.on("error", reject);

      archive.pipe(output);

      imagePaths.forEach((imagePath) => {
        archive.file(imagePath, {
          name: path.basename(imagePath),
        });
      });

      archive.finalize();
    });

    await fs.unlink(filePath).catch(() => {});

    res.download(zipPath, "pdf-images.zip", async () => {
      await fs.rm(outputDir, {
        recursive: true,
        force: true,
      });

      await fs.unlink(zipPath).catch(() => {});
    });
  } catch (error) {
    console.error("PDF To Images Error:", error);

    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    if (outputDir) {
      await fs.rm(outputDir, {
        recursive: true,
        force: true,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to convert PDF to images",
      error: error.message,
    });
  }
};

export const imagesToPDFController = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one image",
      });
    }

    if (req.files.length > 30) {
      return res.status(400).json({
        success: false,
        message: "Maximum 30 images are allowed",
      });
    }

    const {
      pageSize = "A4",
      orientation = "portrait",
      margin = "small",
    } = req.body;

    const allowedPageSizes = ["A4", "Letter", "Original"];

    const allowedOrientations = ["portrait", "landscape"];

    const allowedMargins = ["none", "small", "large"];

    if (!allowedPageSizes.includes(pageSize)) {
      return res.status(400).json({
        success: false,
        message: "Invalid page size",
      });
    }

    if (!allowedOrientations.includes(orientation)) {
      return res.status(400).json({
        success: false,
        message: "Invalid orientation",
      });
    }

    if (!allowedMargins.includes(margin)) {
      return res.status(400).json({
        success: false,
        message: "Invalid margin",
      });
    }

    /*
      Extra backend validation.
      Never trust only frontend validation.
    */
    for (const file of req.files) {
      const validMimeTypes = ["image/jpeg", "image/png"];

      if (!validMimeTypes.includes(file.mimetype)) {
        throw new Error(`Invalid image type: ${file.originalname}`);
      }
    }

    const pdfBytes = await imagesToPDF(req.files, {
      pageSize,
      orientation,
      margin,
    });

    const outputDir = path.join(process.cwd(), "outputs");

    await fs.mkdir(outputDir, {
      recursive: true,
    });

    const fileName = `images-${Date.now()}.pdf`;

    const outputPath = path.join(outputDir, fileName);

    await fs.writeFile(outputPath, pdfBytes);

    /*
      Delete uploaded images
    */
    for (const file of req.files) {
      await fs.unlink(file.path).catch(() => {});
    }

    res.download(outputPath, "images-to-pdf.pdf", async (error) => {
      if (error) {
        console.error("PDF download error:", error);
      }

      await fs.unlink(outputPath).catch(() => {});
    });
  } catch (error) {
    console.error("Images To PDF Error:", error);

    /*
      Cleanup uploaded images
    */
    if (req.files) {
      for (const file of req.files) {
        await fs.unlink(file.path).catch(() => {});
      }
    }

    res.status(500).json({
      success: false,
      message: "Failed to create PDF from images",
      error: error.message,
    });
  }
};

export const compressPDFController = async (req, res) => {
  let outputPath = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a PDF file",
      });
    }

    const { level = "recommended" } = req.body;

    const allowedLevels = ["basic", "recommended", "strong"];

    if (!allowedLevels.includes(level)) {
      await fs.unlink(req.file.path).catch(() => {});

      return res.status(400).json({
        success: false,
        message: "Invalid compression level",
      });
    }

    const outputDir = path.join(process.cwd(), "outputs");

    await fs.mkdir(outputDir, {
      recursive: true,
    });

    const fileName = `compressed-${Date.now()}.pdf`;

    outputPath = path.join(outputDir, fileName);

    await compressPDF(req.file.path, outputPath, level);

    const originalStats = await fs.stat(req.file.path);

    const compressedStats = await fs.stat(outputPath);

    const originalSize = originalStats.size;

    const compressedSize = compressedStats.size;

    const savedBytes = Math.max(0, originalSize - compressedSize);

    const compressionPercentage =
      originalSize > 0
        ? ((savedBytes / originalSize) * 100).toFixed(2)
        : "0.00";

    await fs.unlink(req.file.path).catch(() => {});

    res.download(outputPath, "compressed.pdf", async (error) => {
      if (error) {
        console.error("Compression download error:", error);
      }

      await fs.unlink(outputPath).catch(() => {});
    });
  } catch (error) {
    console.error("Compress PDF Error:", error);

    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    if (outputPath) {
      await fs.unlink(outputPath).catch(() => {});
    }

    res.status(500).json({
      success: false,
      message: "Failed to compress PDF",
      error: error.message,
    });
  }
};

export const rotatePDFController = async (req, res) => {
  let outputPath = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a PDF file",
      });
    }

    let rotations;

    try {
      rotations =
        typeof req.body.rotations === "string"
          ? JSON.parse(req.body.rotations)
          : req.body.rotations;
    } catch {
      await fs.unlink(req.file.path).catch(() => {});

      return res.status(400).json({
        success: false,
        message: "Invalid rotation data",
      });
    }

    if (!Array.isArray(rotations)) {
      await fs.unlink(req.file.path).catch(() => {});

      return res.status(400).json({
        success: false,
        message: "Rotations must be an array",
      });
    }

    const pdfBytes = await fs.readFile(req.file.path);

    const pdfDoc = await PDFDocument.load(pdfBytes);

    const totalPages = pdfDoc.getPageCount();

    if (rotations.length !== totalPages) {
      await fs.unlink(req.file.path).catch(() => {});

      return res.status(400).json({
        success: false,
        message: "Rotation data does not match PDF pages",
      });
    }

    const validRotations = rotations.every((value) => {
      const number = Number(value);

      return Number.isFinite(number) && number % 90 === 0;
    });

    if (!validRotations) {
      await fs.unlink(req.file.path).catch(() => {});

      return res.status(400).json({
        success: false,
        message: "Rotation must be a multiple of 90 degrees",
      });
    }

    const outputDir = path.join(process.cwd(), "outputs");

    await fs.mkdir(outputDir, {
      recursive: true,
    });

    const fileName = `rotated-${Date.now()}.pdf`;

    outputPath = path.join(outputDir, fileName);

    await rotatePDF(req.file.path, outputPath, rotations);

    await fs.unlink(req.file.path).catch(() => {});

    res.download(outputPath, "rotated.pdf", async (error) => {
      if (error) {
        console.error("Rotate PDF download error:", error);
      }

      await fs.unlink(outputPath).catch(() => {});
    });
  } catch (error) {
    console.error("Rotate PDF Error:", error);

    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    if (outputPath) {
      await fs.unlink(outputPath).catch(() => {});
    }

    res.status(500).json({
      success: false,
      message: "Failed to rotate PDF",
      error: error.message,
    });
  }
};

export const watermarkPDFController = async (req, res) => {
  let outputPath = null;

  try {
    /*
     * =====================================================
     * PDF FILE
     * =====================================================
     */

    const pdfFile = req.files?.file?.[0];

    /*
     * =====================================================
     * WATERMARK IMAGE
     * =====================================================
     */

    const watermarkFile = req.files?.watermarkImage?.[0];

    /*
     * =====================================================
     * CHECK PDF
     * =====================================================
     */

    if (!pdfFile) {
      return res.status(400).json({
        success: false,
        message: "Please upload a PDF file",
      });
    }

    /*
     * =====================================================
     * REQUEST BODY
     * =====================================================
     */

    const {
      type = "text",

      // -------------------------
      // TEXT
      // -------------------------

      text = "CONFIDENTIAL",

      opacity = 0.3,

      fontSize = 40,

      rotation = 0,

      fontFamily = "Helvetica-Bold",

      color = "#777777",

      textPosition = "center",

      // -------------------------
      // IMAGE
      // -------------------------

      imagePosition = "center",

      imageScale = 0.3,

      imageOpacity = 0.3,

      imageRotation = 0,

      // -------------------------
      // PAGES
      // -------------------------

      pages = "all",
    } = req.body;

    /*
     * =====================================================
     * VALIDATE WATERMARK TYPE
     * =====================================================
     *
     * Supported:
     *
     * text
     * image
     * both
     *
     */

    const allowedTypes = ["text", "image", "both"];

    if (!allowedTypes.includes(type)) {
      await fs.unlink(pdfFile.path).catch(() => {});

      if (watermarkFile) {
        await fs.unlink(watermarkFile.path).catch(() => {});
      }

      return res.status(400).json({
        success: false,
        message: "Invalid watermark type. Use text, image or both.",
      });
    }

    /*
     * =====================================================
     * IMAGE REQUIRED FOR IMAGE / BOTH
     * =====================================================
     */

    if ((type === "image" || type === "both") && !watermarkFile) {
      await fs.unlink(pdfFile.path).catch(() => {});

      return res.status(400).json({
        success: false,
        message: "Please upload a watermark image",
      });
    }

    /*
     * =====================================================
     * TEXT REQUIRED FOR TEXT / BOTH
     * =====================================================
     */

    if ((type === "text" || type === "both") && !String(text).trim()) {
      await fs.unlink(pdfFile.path).catch(() => {});

      if (watermarkFile) {
        await fs.unlink(watermarkFile.path).catch(() => {});
      }

      return res.status(400).json({
        success: false,
        message: "Watermark text cannot be empty",
      });
    }

    /*
     * =====================================================
     * VALIDATE TEXT OPACITY
     * =====================================================
     */

    const numericOpacity = Number(opacity);

    if (
      !Number.isFinite(numericOpacity) ||
      numericOpacity < 0 ||
      numericOpacity > 1
    ) {
      await fs.unlink(pdfFile.path).catch(() => {});

      if (watermarkFile) {
        await fs.unlink(watermarkFile.path).catch(() => {});
      }

      return res.status(400).json({
        success: false,
        message: "Text opacity must be between 0 and 1",
      });
    }

    /*
     * =====================================================
     * VALIDATE FONT SIZE
     * =====================================================
     */

    const numericFontSize = Number(fontSize);

    if (!Number.isFinite(numericFontSize) || numericFontSize <= 0) {
      await fs.unlink(pdfFile.path).catch(() => {});

      if (watermarkFile) {
        await fs.unlink(watermarkFile.path).catch(() => {});
      }

      return res.status(400).json({
        success: false,
        message: "Font size must be greater than 0",
      });
    }

    /*
     * =====================================================
     * VALIDATE TEXT ROTATION
     * =====================================================
     */

    const numericRotation = Number(rotation);

    if (!Number.isFinite(numericRotation)) {
      await fs.unlink(pdfFile.path).catch(() => {});

      if (watermarkFile) {
        await fs.unlink(watermarkFile.path).catch(() => {});
      }

      return res.status(400).json({
        success: false,
        message: "Invalid text rotation",
      });
    }

    /*
     * =====================================================
     * VALIDATE IMAGE OPACITY
     * =====================================================
     */

    const numericImageOpacity = Number(imageOpacity);

    if (
      !Number.isFinite(numericImageOpacity) ||
      numericImageOpacity < 0 ||
      numericImageOpacity > 1
    ) {
      await fs.unlink(pdfFile.path).catch(() => {});

      if (watermarkFile) {
        await fs.unlink(watermarkFile.path).catch(() => {});
      }

      return res.status(400).json({
        success: false,
        message: "Image opacity must be between 0 and 1",
      });
    }

    /*
     * =====================================================
     * VALIDATE IMAGE SCALE
     * =====================================================
     */

    const numericScale = Number(imageScale);

    if (
      !Number.isFinite(numericScale) ||
      numericScale <= 0 ||
      numericScale > 1
    ) {
      await fs.unlink(pdfFile.path).catch(() => {});

      if (watermarkFile) {
        await fs.unlink(watermarkFile.path).catch(() => {});
      }

      return res.status(400).json({
        success: false,
        message: "Image scale must be between 0 and 1",
      });
    }

    /*
     * =====================================================
     * VALIDATE IMAGE ROTATION
     * =====================================================
     */

    const numericImageRotation = Number(imageRotation);

    if (!Number.isFinite(numericImageRotation)) {
      await fs.unlink(pdfFile.path).catch(() => {});

      if (watermarkFile) {
        await fs.unlink(watermarkFile.path).catch(() => {});
      }

      return res.status(400).json({
        success: false,
        message: "Invalid image rotation",
      });
    }

    /*
     * =====================================================
     * CONVERT HEX COLOR TO RGB
     * =====================================================
     *
     * pdf-lib rgb() needs:
     *
     * {
     *   r: 0 - 1,
     *   g: 0 - 1,
     *   b: 0 - 1
     * }
     *
     */

    const hexToRgb = (hex) => {
      if (typeof hex !== "string") {
        return {
          r: 0.4667,
          g: 0.4667,
          b: 0.4667,
        };
      }

      let cleanHex = hex.trim().replace("#", "");

      /*
       * Support #RGB
       */

      if (cleanHex.length === 3) {
        cleanHex = cleanHex
          .split("")
          .map((char) => char + char)
          .join("");
      }

      /*
       * Invalid color
       */

      if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
        return {
          r: 0.4667,
          g: 0.4667,
          b: 0.4667,
        };
      }

      const r = parseInt(cleanHex.substring(0, 2), 16) / 255;

      const g = parseInt(cleanHex.substring(2, 4), 16) / 255;

      const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

      return {
        r,
        g,
        b,
      };
    };

    const rgbColor = hexToRgb(color);

    /*
     * =====================================================
     * READ WATERMARK IMAGE
     * =====================================================
     */

    let imageBytes = null;

    if ((type === "image" || type === "both") && watermarkFile) {
      imageBytes = await fs.readFile(watermarkFile.path);
    }

    /*
     * =====================================================
     * OUTPUT DIRECTORY
     * =====================================================
     */

    const outputDir = path.join(process.cwd(), "outputs");

    await fs.mkdir(outputDir, {
      recursive: true,
    });

    /*
     * =====================================================
     * OUTPUT FILE NAME
     * =====================================================
     */

    const fileName = `watermarked-${Date.now()}.pdf`;

    outputPath = path.join(outputDir, fileName);

    /*
     * =====================================================
     * ADD WATERMARK
     * =====================================================
     */

    await addWatermarkToPDF(pdfFile.path, outputPath, {
      /*
       * Watermark type
       *
       * text
       * image
       * both
       */

      type,

      /*
       * =====================
       * TEXT
       * =====================
       */

      text: String(text),

      opacity: numericOpacity,

      fontSize: numericFontSize,

      rotation: numericRotation,

      fontFamily,

      color: rgbColor,

      textPosition,

      /*
       * =====================
       * IMAGE
       * =====================
       */

      imageBytes,

      imagePosition,

      imageScale: numericScale,

      imageOpacity: numericImageOpacity,

      imageRotation: numericImageRotation,

      /*
       * =====================
       * PAGES
       * =====================
       */

      pages,
    });

    /*
     * =====================================================
     * DELETE UPLOADED PDF
     * =====================================================
     */

    await fs.unlink(pdfFile.path).catch(() => {});

    /*
     * =====================================================
     * DELETE UPLOADED IMAGE
     * =====================================================
     */

    if (watermarkFile) {
      await fs.unlink(watermarkFile.path).catch(() => {});
    }

    /*
     * =====================================================
     * DOWNLOAD PDF
     * =====================================================
     */

    return res.download(outputPath, "watermarked.pdf", async (error) => {
      if (error) {
        console.error("Watermark download error:", error);
      }

      await fs.unlink(outputPath).catch(() => {});
    });
  } catch (error) {
    /*
     * =====================================================
     * ERROR
     * =====================================================
     */

    console.error("Watermark PDF Error:", error);

    /*
     * =====================================================
     * CLEANUP PDF
     * =====================================================
     */

    if (req.files?.file?.[0]) {
      await fs.unlink(req.files.file[0].path).catch(() => {});
    }

    /*
     * =====================================================
     * CLEANUP IMAGE
     * =====================================================
     */

    if (req.files?.watermarkImage?.[0]) {
      await fs.unlink(req.files.watermarkImage[0].path).catch(() => {});
    }

    /*
     * =====================================================
     * CLEANUP OUTPUT
     * =====================================================
     */

    if (outputPath) {
      await fs.unlink(outputPath).catch(() => {});
    }

    /*
     * =====================================================
     * RESPONSE
     * =====================================================
     */

    return res.status(500).json({
      success: false,

      message: "Failed to add watermark",

      error: error.message,
    });
  }
};

export const protectPDFController = async (req, res) => {
  let outputPath = null;

  try {
    /*
     * =====================================================
     * PDF FILE
     * =====================================================
     */

    const pdfFile = req.file;

    if (!pdfFile) {
      return res.status(400).json({
        success: false,
        message: "Please upload a PDF file",
      });
    }

    /*
     * =====================================================
     * REQUEST BODY
     * =====================================================
     */

    const {
      userPassword,
      ownerPassword = "",
      allowPrinting = "true",
      allowCopying = "false",
      allowModification = "false",
    } = req.body;

    const normalizedUserPassword =
      typeof userPassword === "object"
        ? userPassword?.password || userPassword?.value || ""
        : String(userPassword ?? "");

    const normalizedOwnerPassword =
      typeof ownerPassword === "object"
        ? ownerPassword?.password || ownerPassword?.value || ""
        : String(ownerPassword ?? "");

    /*
     * =====================================================
     * USER PASSWORD
     * =====================================================
     */

    if (!normalizedUserPassword) {
      await fs.unlink(pdfFile.path).catch(() => {});

      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    if (normalizedUserPassword.length < 4) {
      await fs.unlink(pdfFile.path).catch(() => {});

      return res.status(400).json({
        success: false,
        message: "Password must be at least 4 characters",
      });
    }

    /*
     * =====================================================
     * BOOLEAN HELPER
     * =====================================================
     */

    const toBoolean = (value, defaultValue = false) => {
      if (value === undefined || value === null) {
        return defaultValue;
      }

      if (typeof value === "boolean") {
        return value;
      }

      return String(value).toLowerCase() === "true";
    };

    const printing = toBoolean(allowPrinting, true);

    const copying = toBoolean(allowCopying, false);

    const modification = toBoolean(allowModification, false);

    /*
     * =====================================================
     * OUTPUT DIRECTORY
     * =====================================================
     */

    const outputDir = path.join(process.cwd(), "outputs");

    await fs.mkdir(outputDir, {
      recursive: true,
    });

    /*
     * =====================================================
     * OUTPUT FILE
     * =====================================================
     */

    const fileName = `protected-${Date.now()}.pdf`;

    outputPath = path.join(outputDir, fileName);

    /*
     * =====================================================
     * PROTECT PDF
     * =====================================================
     */

    await protectPDF(pdfFile.path, outputPath, {
      userPassword: normalizedUserPassword,

      ownerPassword: normalizedOwnerPassword,

      allowPrinting: printing,

      allowCopying: copying,

      allowModification: modification,
    });

    /*
     * =====================================================
     * DELETE INPUT
     * =====================================================
     */

    await fs.unlink(pdfFile.path).catch(() => {});

    /*
     * =====================================================
     * DOWNLOAD
     * =====================================================
     */

    return res.download(outputPath, "protected.pdf", async (error) => {
      if (error) {
        console.error("Protected PDF download error:", error);

        // If client disconnected, don't try
        // to send another response.
        if (!res.headersSent) {
          return res.status(500).json({
            success: false,
            message: "Failed to download protected PDF",
          });
        }
      }

      // Delete output after download attempt
      await fs.unlink(outputPath).catch(() => {});
    });
  } catch (error) {
    console.error("Protect PDF Error:", error);

    /*
     * =====================================================
     * CLEANUP INPUT
     * =====================================================
     */

    if (req.files?.file?.[0]) {
      await fs.unlink(req.files.file[0].path).catch(() => {});
    }

    /*
     * =====================================================
     * CLEANUP OUTPUT
     * =====================================================
     */

    if (outputPath) {
      await fs.unlink(outputPath).catch(() => {});
    }

    return res.status(500).json({
      success: false,
      message: "Failed to protect PDF",
      error: error.message,
    });
  }
};

export const unlockPDFController = async (req, res) => {
  let outputPath = null;

  try {
    /*
     * =====================================================
     * PDF FILE
     * =====================================================
     */

    const pdfFile = req.file;

    if (!pdfFile) {
      return res.status(400).json({
        success: false,
        message: "Please upload a PDF file",
      });
    }

    /*
     * =====================================================
     * PASSWORD
     * =====================================================
     */

    const { password } = req.body;

    if (
      password === undefined ||
      password === null ||
      String(password).length === 0
    ) {
      await fs.unlink(pdfFile.path).catch(() => {});

      return res.status(400).json({
        success: false,
        message: "PDF password is required",
      });
    }

    /*
     * =====================================================
     * OUTPUT DIRECTORY
     * =====================================================
     */

    const outputDir = path.join(process.cwd(), "outputs");

    await fs.mkdir(outputDir, {
      recursive: true,
    });

    /*
     * =====================================================
     * OUTPUT FILE
     * =====================================================
     */

    const fileName = `unlocked-${Date.now()}.pdf`;

    outputPath = path.join(outputDir, fileName);

    /*
     * =====================================================
     * UNLOCK PDF
     * =====================================================
     */

    await unlockPDF(pdfFile.path, outputPath, String(password));

    /*
     * =====================================================
     * DELETE UPLOADED PDF
     * =====================================================
     */

    await fs.unlink(pdfFile.path).catch(() => {});

    /*
     * =====================================================
     * DOWNLOAD
     * =====================================================
     */

    return res.download(outputPath, "unlocked.pdf", async (error) => {
      if (error) {
        console.error("Unlocked PDF download error:", error);

        /*
         * Client disconnected.
         * Do not send another response.
         */
      }

      /*
       * Delete output after
       * download attempt.
       */

      await fs.unlink(outputPath).catch(() => {});
    });
  } catch (error) {
    console.error("Unlock PDF Error:", error);

    /*
     * =====================================================
     * CLEANUP INPUT
     * =====================================================
     */

    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    /*
     * =====================================================
     * CLEANUP OUTPUT
     * =====================================================
     */

    if (outputPath) {
      await fs.unlink(outputPath).catch(() => {});
    }

    /*
     * =====================================================
     * ERROR RESPONSE
     * =====================================================
     */

    const message = error?.message || "Failed to unlock PDF";

    /*
     * Wrong password
     */

    if (message === "Incorrect PDF password") {
      return res.status(400).json({
        success: false,
        message: "Incorrect PDF password",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to unlock PDF",
      error: message,
    });
  }
};

export const getPDFMetadataController = async (req, res) => {
  try {
    /*
     * PDF
     */

    const pdfFile = req.file;

    if (!pdfFile) {
      return res.status(400).json({
        success: false,
        message: "Please upload a PDF file",
      });
    }

    /*
     * Read metadata
     */

    const metadata = await getPDFMetadata(pdfFile.path);

    /*
     * Delete upload
     */

    await fs.unlink(pdfFile.path).catch(() => {});

    /*
     * Response
     */

    return res.status(200).json({
      success: true,
      message: "PDF metadata loaded successfully",
      metadata,
    });
  } catch (error) {
    console.error("Get PDF Metadata Error:", error);

    /*
     * Cleanup
     */

    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    return res.status(500).json({
      success: false,
      message: "Failed to read PDF metadata",
      error: error.message,
    });
  }
};

export const updatePDFMetadataController = async (req, res) => {
  let outputPath = null;

  try {
    /*
     * =================================================
     * PDF
     * =================================================
     */

    const pdfFile = req.file;

    if (!pdfFile) {
      return res.status(400).json({
        success: false,
        message: "Please upload a PDF file",
      });
    }

    /*
     * =================================================
     * REQUEST BODY
     * =================================================
     */

    const {
      title = "",
      author = "",
      subject = "",
      keywords = "",
      creator = "",
      producer = "",
      creationDate = "",
      modificationDate = "",
    } = req.body;

    /*
     * =================================================
     * OUTPUT DIRECTORY
     * =================================================
     */

    const outputDir = path.join(process.cwd(), "outputs");

    await fs.mkdir(outputDir, {
      recursive: true,
    });

    /*
     * =================================================
     * OUTPUT FILE
     * =================================================
     */

    const fileName = `metadata-updated-${Date.now()}.pdf`;

    outputPath = path.join(outputDir, fileName);

    /*
     * =================================================
     * UPDATE METADATA
     * =================================================
     */

    await updatePDFMetadata(pdfFile.path, outputPath, {
      title,
      author,
      subject,
      keywords,
      creator,
      producer,
      creationDate,
      modificationDate,
    });

    /*
     * =================================================
     * DELETE INPUT
     * =================================================
     */

    await fs.unlink(pdfFile.path).catch(() => {});

    /*
     * =================================================
     * DOWNLOAD
     * =================================================
     */

    return res.download(outputPath, "metadata-updated.pdf", async (error) => {
      if (error) {
        console.error("Metadata PDF download error:", error);
      }

      await fs.unlink(outputPath).catch(() => {});
    });
  } catch (error) {
    console.error("Update PDF Metadata Error:", error);

    /*
     * Cleanup input
     */

    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    /*
     * Cleanup output
     */

    if (outputPath) {
      await fs.unlink(outputPath).catch(() => {});
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update PDF metadata",
      error: error.message,
    });
  }
};

export const organizePDFController = async (
  req,
  res
) => {
  let outputPath = null;

  try {
    /*
     * =====================================================
     * PDF FILE
     * =====================================================
     */

    const pdfFile = req.file;

    if (!pdfFile) {
      return res.status(400).json({
        success: false,
        message:
          "Please upload a PDF file",
      });
    }

    /*
     * =====================================================
     * PAGE ORDER
     * =====================================================
     */

    let pageOrder =
      req.body.pageOrder;

    if (
      typeof pageOrder === "string"
    ) {
      try {
        pageOrder =
          JSON.parse(pageOrder);
      } catch {
        await fs
          .unlink(pdfFile.path)
          .catch(() => {});

        return res.status(400).json({
          success: false,
          message:
            "Invalid page order",
        });
      }
    }

    /*
     * =====================================================
     * ROTATIONS
     * =====================================================
     */

    let rotations =
      req.body.rotations || {};

    if (
      typeof rotations === "string"
    ) {
      try {
        rotations =
          JSON.parse(rotations);
      } catch {
        await fs
          .unlink(pdfFile.path)
          .catch(() => {});

        return res.status(400).json({
          success: false,
          message:
            "Invalid rotation data",
        });
      }
    }

    /*
     * =====================================================
     * VALIDATE PAGE ORDER
     * =====================================================
     */

    if (
      !Array.isArray(pageOrder) ||
      pageOrder.length === 0
    ) {
      await fs
        .unlink(pdfFile.path)
        .catch(() => {});

      return res.status(400).json({
        success: false,
        message:
          "At least one page must be selected",
      });
    }

    /*
     * =====================================================
     * READ PDF TO GET PAGE COUNT
     * =====================================================
     */

    const pdfBytes =
      await fs.readFile(
        pdfFile.path
      );

    const pdfDoc =
      await PDFDocument.load(
        pdfBytes
      );

    const totalPages =
      pdfDoc.getPageCount();

    /*
     * =====================================================
     * VALIDATE PAGE NUMBERS
     * =====================================================
     */

    const validPageOrder =
      pageOrder.every((page) => {
        const pageNumber =
          Number(page);

        return (
          Number.isInteger(
            pageNumber
          ) &&
          pageNumber >= 1 &&
          pageNumber <= totalPages
        );
      });

    if (!validPageOrder) {
      await fs
        .unlink(pdfFile.path)
        .catch(() => {});

      return res.status(400).json({
        success: false,
        message:
          "Invalid page order",
      });
    }

    /*
     * =====================================================
     * VALIDATE ROTATIONS
     * =====================================================
     */

    if (
      typeof rotations !==
        "object" ||
      Array.isArray(rotations) ||
      rotations === null
    ) {
      await fs
        .unlink(pdfFile.path)
        .catch(() => {});

      return res.status(400).json({
        success: false,
        message:
          "Invalid rotation data",
      });
    }

    for (
      const [pageNumber, rotation]
      of Object.entries(rotations)
    ) {
      const numericPage =
        Number(pageNumber);

      const numericRotation =
        Number(rotation);

      if (
        !Number.isInteger(
          numericPage
        ) ||
        numericPage < 1 ||
        numericPage > totalPages
      ) {
        await fs
          .unlink(pdfFile.path)
          .catch(() => {});

        return res.status(400).json({
          success: false,
          message:
            "Invalid rotation page number",
        });
      }

      if (
        !Number.isFinite(
          numericRotation
        ) ||
        numericRotation % 90 !== 0
      ) {
        await fs
          .unlink(pdfFile.path)
          .catch(() => {});

        return res.status(400).json({
          success: false,
          message:
            "Rotation must be a multiple of 90 degrees",
        });
      }
    }

    /*
     * =====================================================
     * OUTPUT DIRECTORY
     * =====================================================
     */

    const outputDir =
      path.join(
        process.cwd(),
        "outputs"
      );

    await fs.mkdir(
      outputDir,
      {
        recursive: true,
      }
    );

    /*
     * =====================================================
     * OUTPUT FILE
     * =====================================================
     */

    const fileName =
      `organized-${Date.now()}.pdf`;

    outputPath =
      path.join(
        outputDir,
        fileName
      );

    /*
     * =====================================================
     * ORGANIZE PDF
     * =====================================================
     */

    await organizePDF(
      pdfFile.path,
      outputPath,
      {
        pageOrder,
        rotations,
      }
    );

    /*
     * =====================================================
     * DELETE INPUT
     * =====================================================
     */

    await fs
      .unlink(pdfFile.path)
      .catch(() => {});

    /*
     * =====================================================
     * DOWNLOAD
     * =====================================================
 */

    return res.download(
      outputPath,
      "organized.pdf",
      async (error) => {
        if (error) {
          console.error(
            "Organized PDF download error:",
            error
          );
        }

        await fs
          .unlink(outputPath)
          .catch(() => {});
      }
    );

  } catch (error) {

    console.error(
      "Organize PDF Error:",
      error
    );

    /*
     * =====================================================
     * CLEANUP INPUT
     * =====================================================
     */

    if (req.file?.path) {
      await fs
        .unlink(
          req.file.path
        )
        .catch(() => {});
    }

    /*
     * =====================================================
     * CLEANUP OUTPUT
     * =====================================================
     */

    if (outputPath) {
      await fs
        .unlink(outputPath)
        .catch(() => {});
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to organize PDF",
      error:
        error.message,
    });
  }
};

export const annotatePDFController = async (req, res) => {
  let outputPath = null;

  try {
    // ============================================================
    // PDF FILE
    // ============================================================

    const pdfFile = req.file;

    if (!pdfFile) {
      return res.status(400).json({
        success: false,
        message: "Please upload a PDF file",
      });
    }

    // ============================================================
    // ANNOTATIONS
    // ============================================================

    let annotations = req.body.annotations;

    if (typeof annotations === "string") {
      try {
        annotations = JSON.parse(annotations);
      } catch (error) {
        await fs.unlink(pdfFile.path).catch(() => {});

        return res.status(400).json({
          success: false,
          message: "Invalid annotation data",
        });
      }
    }

    if (!Array.isArray(annotations)) {
      await fs.unlink(pdfFile.path).catch(() => {});

      return res.status(400).json({
        success: false,
        message: "Annotations must be an array",
      });
    }

    // ============================================================
    // OUTPUT DIRECTORY
    // ============================================================

    const outputDir = path.join(
      process.cwd(),
      "outputs"
    );

    await fs.mkdir(outputDir, {
      recursive: true,
    });

    // ============================================================
    // OUTPUT FILE
    // ============================================================

    const fileName = `annotated-${Date.now()}.pdf`;

    outputPath = path.join(
      outputDir,
      fileName
    );

    // ============================================================
    // ANNOTATE PDF
    // ============================================================

    await annotatePDF(
      pdfFile.path,
      outputPath,
      annotations
    );

    // ============================================================
    // DELETE UPLOADED INPUT FILE
    // ============================================================

    await fs
      .unlink(pdfFile.path)
      .catch(() => {});

    // ============================================================
    // VERIFY OUTPUT FILE
    // ============================================================

    try {
      await fs.access(outputPath);
    } catch {
      throw new Error(
        "Annotated PDF was not created"
      );
    }

    // ============================================================
    // DOWNLOAD
    // ============================================================

    return res.download(
      outputPath,
      "annotated.pdf",
      async (error) => {
        if (error) {
          console.error(
            "Annotated PDF download error:",
            error
          );
        }

        // Delete generated PDF after download
        await fs
          .unlink(outputPath)
          .catch(() => {});
      }
    );
  } catch (error) {
    console.error(
      "Annotate PDF Controller Error:",
      error
    );

    // ============================================================
    // CLEANUP INPUT
    // ============================================================

    if (req.file?.path) {
      await fs
        .unlink(req.file.path)
        .catch(() => {});
    }

    // ============================================================
    // CLEANUP OUTPUT
    // ============================================================

    if (outputPath) {
      await fs
        .unlink(outputPath)
        .catch(() => {});
    }

    // ============================================================
    // RESPONSE
    // ============================================================

    return res.status(500).json({
      success: false,
      message: "Failed to annotate PDF",
      error: error.message,
    });
  }
};

// export const addPageNumbersController = async (
//   req,
//   res
// ) => {
//   let outputPath = null;

//   try {
//     // ==========================================================
//     // PDF FILE
//     // ==========================================================

//     const pdfFile = req.file;

//     if (!pdfFile) {
//       return res.status(400).json({
//         success: false,
//         message: "Please upload a PDF file",
//       });
//     }

//     // ==========================================================
//     // OUTPUT DIRECTORY
//     // ==========================================================

//     const outputDir = path.join(
//       process.cwd(),
//       "outputs"
//     );

//     await fs.mkdir(
//       outputDir,
//       {
//         recursive: true,
//       }
//     );

//     // ==========================================================
//     // OUTPUT FILE
//     // ==========================================================

//     const fileName =
//       `numbered-${Date.now()}.pdf`;

//     outputPath = path.join(
//       outputDir,
//       fileName
//     );

//     // ==========================================================
//     // PAGE RANGE
//     // ==========================================================

//     let pageRange =
//       req.body.pageRange;

//     /*
//       Frontend sends:

//       formData.append(
//         "pageRange",
//         JSON.stringify(pageNumbers)
//       );

//       Example:

//       "[1,2,3,5]"
//     */

//     if (
//       typeof pageRange === "string"
//     ) {
//       try {
//         pageRange =
//           JSON.parse(pageRange);
//       } catch {
//         /*
//           If JSON parsing fails,
//           keep it as string.

//           This also allows:
//           "1-3,5"
//         */
//       }
//     }

//     // ==========================================================
//     // VALIDATE PAGE RANGE
//     // ==========================================================

//     if (
//       !Array.isArray(pageRange) &&
//       typeof pageRange !== "string"
//     ) {
//       pageRange = "all";
//     }

//     if (
//       Array.isArray(pageRange) &&
//       pageRange.length === 0
//     ) {
//       await fs
//         .unlink(pdfFile.path)
//         .catch(() => {});

//       return res.status(400).json({
//         success: false,
//         message:
//           "Please select at least one page",
//       });
//     }

//     // ==========================================================
//     // OPTIONS
//     // ==========================================================

//     const startNumber = Math.max(
//       0,
//       Number(
//         req.body.startNumber
//       ) || 1
//     );

//     const position =
//       String(
//         req.body.position ||
//           "bottom-center"
//       ).toLowerCase();

//     const format =
//       String(
//         req.body.format ||
//           "number"
//       ).toLowerCase();

//     const fontSize = Math.max(
//       6,
//       Math.min(
//         100,
//         Number(
//           req.body.fontSize
//         ) || 12
//       )
//     );

//     const color =
//       String(
//         req.body.color ||
//           "#000000"
//       );

//     const prefix =
//       req.body.prefix !== undefined
//         ? String(req.body.prefix)
//         : "";

//     const suffix =
//       req.body.suffix !== undefined
//         ? String(req.body.suffix)
//         : "";

//     const margin = Math.max(
//       0,
//       Math.min(
//         100,
//         Number(
//           req.body.margin
//         ) || 24
//       )
//     );

//     // ==========================================================
//     // ADD PAGE NUMBERS
//     // ==========================================================

//     await addPageNumbersToPDF(
//       pdfFile.path,
//       outputPath,
//       {
//         pages: pageRange,
//         startNumber,
//         position,
//         format,
//         fontSize,
//         color,
//         prefix,
//         suffix,
//         margin,
//       }
//     );

//     // ==========================================================
//     // DELETE INPUT FILE
//     // ==========================================================

//     await fs
//       .unlink(pdfFile.path)
//       .catch(() => {});

//     // ==========================================================
//     // VERIFY OUTPUT
//     // ==========================================================

//     try {
//       await fs.access(
//         outputPath
//       );
//     } catch {
//       throw new Error(
//         "Page numbered PDF was not created"
//       );
//     }

//     // ==========================================================
//     // DOWNLOAD
//     // ==========================================================

//     return res.download(
//       outputPath,
//       "numbered.pdf",
//       async (error) => {
//         if (error) {
//           console.error(
//             "Page Numbers Download Error:",
//             error
//           );
//         }

//         // Delete generated PDF
//         await fs
//           .unlink(outputPath)
//           .catch(() => {});
//       }
//     );
//   } catch (error) {
//     console.error(
//       "Add Page Numbers Controller Error:",
//       error
//     );

//     // ==========================================================
//     // CLEANUP INPUT
//     // ==========================================================

//     if (req.file?.path) {
//       await fs
//         .unlink(req.file.path)
//         .catch(() => {});
//     }

//     // ==========================================================
//     // CLEANUP OUTPUT
//     // ==========================================================

//     if (outputPath) {
//       await fs
//         .unlink(outputPath)
//         .catch(() => {});
//     }

//     // ==========================================================
//     // RESPONSE
//     // ==========================================================

//     return res.status(500).json({
//       success: false,
//       message:
//         "Failed to add page numbers to PDF",
//       error: error.message,
//     });
//   }
// };


export const addPageNumbersController =
  async (req, res) => {
    let inputPath = null;
    let outputPath = null;

    try {
      // ======================================================
      // CHECK FILE
      // ======================================================

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message:
            "PDF file is required.",
        });
      }

      inputPath =
        req.file.path;

      // ======================================================
      // OUTPUT DIRECTORY
      // ======================================================

      const outputDir = path.join(
        __dirname,
        "../outputs"
      );

      await fs.mkdir(
        outputDir,
        {
          recursive: true,
        }
      );

      // ======================================================
      // OUTPUT FILE
      // ======================================================

      const outputFileName =
        `page-numbered-${Date.now()}.pdf`;

      outputPath = path.join(
        outputDir,
        outputFileName
      );

      // ======================================================
      // OPTIONS
      // ======================================================

      const {
        pageRange = "",
        startNumber = "1",
        position = "bottom-center",
        fontSize = "12",
        margin = "30",
        prefix = "",
        suffix = "",
        format = "number",
        color = "#000000",
        fontFamily = "Helvetica",
      } = req.body;

      // ======================================================
      // VALIDATE POSITION
      // ======================================================

      const allowedPositions = [
        "top-left",
        "top-center",
        "top-right",
        "bottom-left",
        "bottom-center",
        "bottom-right",
      ];

      if (
        !allowedPositions.includes(
          position
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid page number position.",
        });
      }

      // ======================================================
      // VALIDATE FORMAT
      // ======================================================

      const allowedFormats = [
        "number",
        "page-number",
        "number-total",
        "page-number-total",
      ];

      if (
        !allowedFormats.includes(
          format
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid page number format.",
        });
      }

      // ======================================================
      // VALIDATE FONT
      // ======================================================

      const allowedFonts = [
        "Helvetica",
        "Times-Roman",
        "Times",
        "Courier",
      ];

      if (
        !allowedFonts.includes(
          fontFamily
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid font family.",
        });
      }

      // ======================================================
      // PROCESS
      // ======================================================

      const result =
        await addPageNumbersToPDF(
          inputPath,
          outputPath,
          {
            pageRange,
            startNumber:
              Number(startNumber),
            position,
            fontSize:
              Number(fontSize),
            margin:
              Number(margin),
            prefix,
            suffix,
            format,
            color,
            fontFamily,
          }
        );

      // ======================================================
      // DELETE INPUT TEMP FILE
      // ======================================================

      try {
        await fs.unlink(
          inputPath
        );
      } catch (cleanupError) {
        console.warn(
          "Input cleanup warning:",
          cleanupError.message
        );
      }

      inputPath = null;

      // ======================================================
      // SEND PDF
      // ======================================================

      return res.download(
        outputPath,
        "page-numbered.pdf",
        async (downloadError) => {
          // ==================================================
          // DELETE OUTPUT AFTER DOWNLOAD
          // ==================================================

          try {
            await fs.unlink(
              outputPath
            );
          } catch (cleanupError) {
            console.warn(
              "Output cleanup warning:",
              cleanupError.message
            );
          }

          outputPath = null;

          if (downloadError) {
            console.error(
              "PDF download error:",
              downloadError
            );

            if (!res.headersSent) {
              return res.status(500).json({
                success: false,
                message:
                  "Failed to download processed PDF.",
              });
            }
          }
        }
      );
    } catch (error) {
      console.error(
        "Add Page Numbers Controller Error:",
        error
      );

      // ======================================================
      // CLEANUP INPUT
      // ======================================================

      if (inputPath) {
        try {
          await fs.unlink(
            inputPath
          );
        } catch {
          // Ignore cleanup errors
        }
      }

      // ======================================================
      // CLEANUP OUTPUT
      // ======================================================

      if (outputPath) {
        try {
          await fs.unlink(
            outputPath
          );
        } catch {
          // Ignore cleanup errors
        }
      }

      // ======================================================
      // RESPONSE
      // ======================================================

      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message:
            error.message ||
            "Failed to add page numbers to PDF.",
        });
      }
    }
  };
