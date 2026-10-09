import fs from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import { execFile } from "child_process";
import { promisify } from "util";
import fontkit from "@pdf-lib/fontkit";

const execFileAsync = promisify(execFile);

export const mergePDFs = async (files) => {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const pdfBytes = await import("fs/promises").then((fs) =>
      fs.readFile(file.path),
    );

    const sourcePdf = await PDFDocument.load(pdfBytes);

    const pages = await mergedPdf.copyPages(
      sourcePdf,
      sourcePdf.getPageIndices(),
    );

    pages.forEach((page) => {
      mergedPdf.addPage(page);
    });
  }

  return await mergedPdf.save();
};

export const splitPDF = async (filePath, pageNumbers) => {
  const fs = await import("fs/promises");

  const pdfBytes = await fs.readFile(filePath);

  const sourcePdf = await PDFDocument.load(pdfBytes);

  const newPdf = await PDFDocument.create();

  const pages = await newPdf.copyPages(sourcePdf, pageNumbers);

  pages.forEach((page) => {
    newPdf.addPage(page);
  });

  return await newPdf.save();
};

export const convertPDFToImages = async (
  filePath,
  outputDir,
  format = "png",
) => {
  const fs = await import("fs/promises");
  const path = await import("path");

  await fs.mkdir(outputDir, {
    recursive: true,
  });

  // ==========================================================
  // NORMALIZE FORMAT
  // ==========================================================

  const selectedFormat = String(format).toLowerCase() === "jpg" ? "jpg" : "png";

  // ==========================================================
  // IMPORT pdf-to-img
  // ==========================================================

  const { pdf } = await import("pdf-to-img");

  // ==========================================================
  // LOAD PDF
  // ==========================================================

  const document = await pdf(filePath, {
    scale: 2,
  });

  const imagePaths = [];

  let pageNumber = 1;

  try {
    // ========================================================
    // CONVERT EACH PAGE
    // ========================================================

    for await (const image of document) {
      const fileName = `page-${pageNumber}.${selectedFormat}`;

      const outputPath = path.join(outputDir, fileName);

      await fs.writeFile(outputPath, image);

      imagePaths.push(outputPath);

      pageNumber++;
    }
  } finally {
    // ========================================================
    // CLEANUP
    // ========================================================

    if (document && typeof document.destroy === "function") {
      document.destroy();
    }
  }

  return imagePaths;
};

export const imagesToPDF = async (files, options = {}) => {
  const {
    pageSize = "A4",
    orientation = "portrait",
    margin = "small",
  } = options;

  const pdfDoc = await PDFDocument.create();

  const PAGE_SIZES = {
    A4: {
      width: 595.28,
      height: 841.89,
    },

    Letter: {
      width: 612,
      height: 792,
    },
  };

  const MARGINS = {
    none: 0,
    small: 24,
    large: 48,
  };

  const marginSize = MARGINS[margin] ?? MARGINS.small;

  for (const file of files) {
    const extension = path.extname(file.originalname).toLowerCase();

    let image;

    const imageBytes = await fs.readFile(file.path);

    if (extension === ".jpg" || extension === ".jpeg") {
      image = await pdfDoc.embedJpg(imageBytes);
    } else if (extension === ".png") {
      image = await pdfDoc.embedPng(imageBytes);
    } else {
      throw new Error(`Unsupported image format: ${file.originalname}`);
    }

    const imageWidth = image.width;
    const imageHeight = image.height;

    let pageWidth;
    let pageHeight;

    /*
      Original:
      Page follows image aspect ratio.
      Orientation is automatically determined
      from the image dimensions.
    */
    if (pageSize === "Original") {
      const dpi = 96;

      pageWidth = (imageWidth / dpi) * 72;

      pageHeight = (imageHeight / dpi) * 72;

      pageWidth += marginSize * 2;
      pageHeight += marginSize * 2;
    } else {
      pageWidth = PAGE_SIZES[pageSize].width;

      pageHeight = PAGE_SIZES[pageSize].height;

      if (orientation === "landscape") {
        [pageWidth, pageHeight] = [pageHeight, pageWidth];
      }
    }

    const availableWidth = pageWidth - marginSize * 2;

    const availableHeight = pageHeight - marginSize * 2;

    if (availableWidth <= 0 || availableHeight <= 0) {
      throw new Error("Margin is too large for the selected page size");
    }

    /*
      Keep image aspect ratio.
      Image is always completely visible.
    */
    const scale = Math.min(
      availableWidth / imageWidth,
      availableHeight / imageHeight,
    );

    const drawWidth = imageWidth * scale;

    const drawHeight = imageHeight * scale;

    const x = (pageWidth - drawWidth) / 2;

    const y = (pageHeight - drawHeight) / 2;

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    page.drawImage(image, {
      x,
      y,
      width: drawWidth,
      height: drawHeight,
    });
  }

  return await pdfDoc.save();
};

export const compressPDF = async (
  inputPath,
  outputPath,
  level = "recommended",
) => {
  const settings = {
    basic: "/printer",
    recommended: "/ebook",
    strong: "/screen",
  };

  const pdfSettings = settings[level];

  if (!pdfSettings) {
    throw new Error("Invalid compression level");
  }

  const args = [
    "-sDEVICE=pdfwrite",

    "-dCompatibilityLevel=1.4",

    `-dPDFSETTINGS=${pdfSettings}`,

    "-dNOPAUSE",

    "-dQUIET",

    "-dBATCH",

    `-sOutputFile=${outputPath}`,

    inputPath,
  ];

  await execFileAsync("gswin64c", args);

  const originalStats = await fs.stat(inputPath);

  const compressedStats = await fs.stat(outputPath);

  /*
    If compression made the file
    larger, keep the original.
  */

  if (compressedStats.size >= originalStats.size) {
    await fs.copyFile(inputPath, outputPath);
  }

  return outputPath;
};

export const rotatePDF = async (inputPath, outputPath, rotations) => {
  const pdfBytes = await fs.readFile(inputPath);

  const pdfDoc = await PDFDocument.load(pdfBytes);

  const pages = pdfDoc.getPages();

  if (!Array.isArray(rotations) || rotations.length !== pages.length) {
    throw new Error("Invalid page rotation data");
  }

  pages.forEach((page, index) => {
    const rotation = Number(rotations[index]) || 0;

    const normalizedRotation = ((rotation % 360) + 360) % 360;

    const currentRotation = page.getRotation().angle;

    const newRotation = (currentRotation + normalizedRotation) % 360;

    page.setRotation({
      type: "degrees",
      angle: newRotation,
    });
  });

  const outputBytes = await pdfDoc.save({
    useObjectStreams: true,
  });

  await fs.writeFile(outputPath, outputBytes);

  return outputPath;
};

export const addWatermarkToPDF = async (
  inputPath,
  outputPath,
  options = {},
) => {
  const {
    // WATERMARK TYPE
    // "text" | "image" | "both"

    type = "text",

    // TEXT OPTIONS

    text = "CONFIDENTIAL",

    opacity = 0.3,

    fontSize = 40,

    rotation = 0,

    fontFamily = "Helvetica-Bold",

    color = {
      r: 0.5,
      g: 0.5,
      b: 0.5,
    },

    // Text watermark position
    textPosition = "center",

    // IMAGE OPTIONS

    imageBytes = null,

    // Percentage of page size
    imageScale = 0.3,

    imageOpacity = 0.3,

    imageRotation = 0,

    // Image watermark position
    imagePosition = "center",

    // PAGE OPTIONS

    pages = "all",
  } = options;

  // READ PDF

  const pdfBytes = await fs.readFile(inputPath);

  const pdfDoc = await PDFDocument.load(pdfBytes);

  const pdfPages = pdfDoc.getPages();

  // FONT

  let selectedFont;

  switch (fontFamily) {
    case "Helvetica":
      selectedFont = StandardFonts.Helvetica;
      break;

    case "Helvetica-Bold":
      selectedFont = StandardFonts.HelveticaBold;
      break;

    case "Helvetica-Oblique":
      selectedFont = StandardFonts.HelveticaOblique;
      break;

    case "Times-Roman":
      selectedFont = StandardFonts.TimesRoman;
      break;

    case "Times-Bold":
      selectedFont = StandardFonts.TimesRomanBold;
      break;

    case "Courier":
      selectedFont = StandardFonts.Courier;
      break;

    case "Courier-Bold":
      selectedFont = StandardFonts.CourierBold;
      break;

    default:
      selectedFont = StandardFonts.HelveticaBold;
  }

  const font = await pdfDoc.embedFont(selectedFont);

  // SELECTED PAGES

  let selectedPages = [];

  if (pages === "all") {
    selectedPages = pdfPages.map((_, index) => index);
  } else {
    selectedPages = String(pages)
      .split(",")
      .map((page) => Number(page.trim()) - 1)
      .filter(
        (page) => Number.isInteger(page) && page >= 0 && page < pdfPages.length,
      );
  }

  // IMAGE WATERMARK

  let watermarkImage = null;

  if ((type === "image" || type === "both") && imageBytes) {
    const imageBuffer = Buffer.isBuffer(imageBytes)
      ? imageBytes
      : Buffer.from(imageBytes);

    // PNG DETECTION

    const isPNG =
      imageBuffer.length >= 8 &&
      imageBuffer.subarray(0, 8).toString("hex").startsWith("89504e470d0a1a0a");

    // EMBED IMAGE

    if (isPNG) {
      watermarkImage = await pdfDoc.embedPng(imageBuffer);
    } else {
      watermarkImage = await pdfDoc.embedJpg(imageBuffer);
    }
  }

  // DRAW WATERMARKS

  for (const pageIndex of selectedPages) {
    const page = pdfPages[pageIndex];

    const { width, height } = page.getSize();

    // TEXT WATERMARK

    if (type === "text" || type === "both") {
      const textWidth = font.widthOfTextAtSize(text, fontSize);

      const textHeight = fontSize;

      // IMPORTANT:
      // Text uses textPosition
      const textCoordinates = getWatermarkPosition(
        textPosition,
        width,
        height,
        textWidth,
        textHeight,
      );

      page.drawText(text, {
        x: textCoordinates.x,

        y: textCoordinates.y,

        size: fontSize,

        font,

        color: rgb(color.r, color.g, color.b),

        opacity,

        rotate: degrees(Number(rotation) || 0),
      });
    }

    // IMAGE WATERMARK

    if ((type === "image" || type === "both") && watermarkImage) {
      const imageWidth = watermarkImage.width;

      const imageHeight = watermarkImage.height;

      // IMAGE SCALE

      const safeImageScale = Math.max(
        0.01,
        Math.min(Number(imageScale) || 0.3, 1),
      );

      const maxWidth = width * safeImageScale;

      const maxHeight = height * safeImageScale;

      // MAINTAIN IMAGE ASPECT RATIO

      const scale = Math.min(maxWidth / imageWidth, maxHeight / imageHeight);

      const drawWidth = imageWidth * scale;

      const drawHeight = imageHeight * scale;

      // IMPORTANT:
      // Image uses imagePosition
      // Text position is NOT used here.
      const imageCoordinates = getWatermarkPosition(
        imagePosition,
        width,
        height,
        drawWidth,
        drawHeight,
      );

      page.drawImage(watermarkImage, {
        x: imageCoordinates.x,

        y: imageCoordinates.y,

        width: drawWidth,

        height: drawHeight,

        opacity: Math.max(0, Math.min(Number(imageOpacity) || 0.3, 1)),

        rotate: degrees(Number(imageRotation) || 0),
      });
    }
  }

  // SAVE PDF

  const outputBytes = await pdfDoc.save({
    useObjectStreams: true,
  });

  await fs.writeFile(outputPath, outputBytes);

  return outputPath;
};

const getWatermarkPosition = (
  position,
  pageWidth,
  pageHeight,
  itemWidth,
  itemHeight,
) => {
  const margin = 30;

  switch (position) {
    // TOP LEFT

    case "top-left":
      return {
        x: margin,

        y: pageHeight - itemHeight - margin,
      };

    // TOP CENTER

    case "top-center":
      return {
        x: (pageWidth - itemWidth) / 2,

        y: pageHeight - itemHeight - margin,
      };

    // TOP RIGHT

    case "top-right":
      return {
        x: pageWidth - itemWidth - margin,

        y: pageHeight - itemHeight - margin,
      };

    // CENTER

    case "center":
      return {
        x: (pageWidth - itemWidth) / 2,

        y: (pageHeight - itemHeight) / 2,
      };

    // BOTTOM LEFT

    case "bottom-left":
      return {
        x: margin,

        y: margin,
      };

    // BOTTOM CENTER

    case "bottom-center":
      return {
        x: (pageWidth - itemWidth) / 2,

        y: margin,
      };

    // BOTTOM RIGHT

    case "bottom-right":
      return {
        x: pageWidth - itemWidth - margin,

        y: margin,
      };

    // DEFAULT CENTER

    default:
      return {
        x: (pageWidth - itemWidth) / 2,

        y: (pageHeight - itemHeight) / 2,
      };
  }
};

export const protectPDF = async (inputPath, outputPath, options = {}) => {
  if (!inputPath) {
    throw new Error("Input PDF path is required");
  }

  if (!outputPath) {
    throw new Error("Output PDF path is required");
  }

  /*
   * =====================================================
   * OPTIONS
   * =====================================================
   *
   * Controller se object aa raha hai:
   *
   * {
   *   userPassword,
   *   ownerPassword,
   *   allowPrinting,
   *   allowCopying,
   *   allowModification
   * }
   *
   * =====================================================
   */

  let {
    userPassword,
    ownerPassword = "",
    allowPrinting = true,
    allowCopying = false,
    allowModification = false,
    allowAnnotation = false,
    allowFormFilling = false,
    allowAccessibility = false,
    allowAssembly = false,
    allowHighQualityPrinting = false,
  } = options;

  /*
   * =====================================================
   * PASSWORD NORMALIZATION
   * =====================================================
   */

  if (typeof userPassword === "object" && userPassword !== null) {
    userPassword =
      userPassword.password ||
      userPassword.value ||
      userPassword.userPassword ||
      "";
  }

  if (typeof ownerPassword === "object" && ownerPassword !== null) {
    ownerPassword =
      ownerPassword.password ||
      ownerPassword.value ||
      ownerPassword.ownerPassword ||
      "";
  }

  userPassword = String(userPassword ?? "");

  ownerPassword = String(ownerPassword ?? "");

  /*
   * =====================================================
   * USER PASSWORD VALIDATION
   * =====================================================
   */

  if (!userPassword) {
    throw new Error("User password is required");
  }

  /*
   * =====================================================
   * OWNER PASSWORD
   * =====================================================
   */

  if (!ownerPassword) {
    ownerPassword = `owner-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
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

    return String(value).trim().toLowerCase() === "true";
  };

  allowPrinting = toBoolean(allowPrinting, true);

  allowCopying = toBoolean(allowCopying, false);

  allowModification = toBoolean(allowModification, false);

  allowAnnotation = toBoolean(allowAnnotation, false);

  allowFormFilling = toBoolean(allowFormFilling, false);

  allowAccessibility = toBoolean(allowAccessibility, false);

  allowAssembly = toBoolean(allowAssembly, false);

  allowHighQualityPrinting = toBoolean(allowHighQualityPrinting, false);

  /*
   * =====================================================
   * PDF PERMISSION FLAGS
   * =====================================================
   *
   * PDF permission bits:
   *
   * Print                  = 4
   * Modify                 = 8
   * Copy                   = 16
   * Annotate               = 32
   * Fill forms             = 256
   * Accessibility          = 512
   * Assemble               = 1024
   * High quality printing  = 2048
   *
   * For Encryption Revision 3,
   * reserved bits are also required.
   *
   * Base value:
   *
   * 0xFFFFFFC0
   *
   * Then add the allowed permission bits.
   *
   * Ghostscript accepts negative values
   * to represent the unsigned 32-bit
   * permission field.
   *
   * =====================================================
   */

  let permissionFlags = 0;

  /*
   * Printing
   */

  if (allowPrinting) {
    permissionFlags |= 4;
  }

  /*
   * Modification
   */

  if (allowModification) {
    permissionFlags |= 8;
  }

  /*
   * Copying
   */

  if (allowCopying) {
    permissionFlags |= 16;
  }

  /*
   * Annotation
   */

  if (allowAnnotation) {
    permissionFlags |= 32;
  }

  /*
   * Form filling
   */

  if (allowFormFilling) {
    permissionFlags |= 256;
  }

  /*
   * Accessibility
   */

  if (allowAccessibility) {
    permissionFlags |= 512;
  }

  /*
   * Document assembly
   */

  if (allowAssembly) {
    permissionFlags |= 1024;
  }

  /*
   * High quality printing
   */

  if (allowHighQualityPrinting) {
    permissionFlags |= 2048;
  }

  /*
   * =====================================================
   * CREATE PDF PERMISSION MASK
   * =====================================================
   *
   * For Revision 3:
   *
   * Reserved bits must remain set.
   *
   * 0xFFFFFFC0 = -64
   *
   * Add the selected permission bits.
   *
   * =====================================================
   */

  const permissionValue = -64 + permissionFlags;

  /*
   * =====================================================
   * GHOSTSCRIPT ARGUMENTS
   * =====================================================
   */

  const args = [
    /*
     * Device
     */

    "-sDEVICE=pdfwrite",

    /*
     * PDF version
     */

    "-dCompatibilityLevel=1.7",

    /*
     * Encryption Revision 3
     */

    "-dEncryptionR=3",

    /*
     * 128-bit encryption
     */

    "-dKeyLength=128",

    /*
     * Owner password
     */

    `-sOwnerPassword=${ownerPassword}`,

    /*
     * User password
     */

    `-sUserPassword=${userPassword}`,

    /*
     * Permissions
     */

    `-dPermissions=${permissionValue}`,

    /*
     * Processing
     */

    "-dNOPAUSE",

    "-dQUIET",

    "-dBATCH",

    "-dSAFER",

    /*
     * Output
     */

    `-sOutputFile=${outputPath}`,

    /*
     * Input
     */

    inputPath,
  ];

  /*
   * =====================================================
   * DEBUG LOG
   * =====================================================
   *
   * Passwords intentionally NOT logged.
   */

  // console.log(
  //   "Protect PDF settings:",
  //   {
  //     encryptionR: 3,
  //     keyLength: 128,
  //     permissionValue,
  //     allowPrinting,
  //     allowCopying,
  //     allowModification,
  //     allowAnnotation,
  //     allowFormFilling,
  //     allowAccessibility,
  //     allowAssembly,
  //     allowHighQualityPrinting,
  //   },
  // );

  /*
   * =====================================================
   * RUN GHOSTSCRIPT
   * =====================================================
   */

  try {
    await execFileAsync("gswin64c", args);
  } catch (error) {
    console.error("Ghostscript Protect PDF Error:", {
      code: error?.code,
      stdout: error?.stdout,
      stderr: error?.stderr,
    });

    throw new Error(
      error?.stderr ||
        error?.stdout ||
        error?.message ||
        "Failed to protect PDF",
    );
  }

  /*
   * =====================================================
   * CHECK OUTPUT
   * =====================================================
   */

  try {
    await fs.access(outputPath);
  } catch {
    throw new Error("Protected PDF was not created");
  }

  /*
   * =====================================================
   * CHECK OUTPUT SIZE
   * =====================================================
   */

  const stats = await fs.stat(outputPath);

  if (stats.size === 0) {
    await fs.unlink(outputPath).catch(() => {});

    throw new Error("Protected PDF is empty");
  }

  /*
   * =====================================================
   * SUCCESS
   * =====================================================
   */

  return outputPath;
};

export const unlockPDF = async (inputPath, outputPath, password) => {
  /*
   * =====================================================
   * VALIDATION
   * =====================================================
   */

  if (!inputPath) {
    throw new Error("Input PDF path is required");
  }

  if (!outputPath) {
    throw new Error("Output PDF path is required");
  }

  if (password === undefined || password === null) {
    throw new Error("PDF password is required");
  }

  password = String(password);

  /*
   * =====================================================
   * CHECK INPUT FILE
   * =====================================================
   */

  try {
    await fs.access(inputPath);
  } catch {
    throw new Error("Input PDF file does not exist");
  }

  /*
   * =====================================================
   * QPDF ARGUMENTS
   * =====================================================
   *
   * --password
   * Password used to open encrypted PDF
   *
   * --decrypt
   * Removes encryption from output PDF
   *
   * --replace-input is NOT used because we want
   * to preserve the original uploaded file.
   */

  const args = [`--password=${password}`, "--decrypt", inputPath, outputPath];

  /*
   * =====================================================
   * RUN QPDF
   * =====================================================
   */

  try {
    console.log("Unlock PDF: processing encrypted PDF");

    await execFileAsync("qpdf", args, {
      windowsHide: true,
    });
  } catch (error) {
    console.error(
      "QPDF Unlock PDF Error:",
      error?.stderr || error?.stdout || error?.message,
    );

    const qpdfMessage = error?.stderr || error?.stdout || error?.message || "";

    /*
     * Wrong password
     */

    if (/password|incorrect|invalid|encrypted/i.test(qpdfMessage)) {
      throw new Error("Incorrect PDF password");
    }

    throw new Error(qpdfMessage || "Failed to unlock PDF");
  }

  /*
   * =====================================================
   * CHECK OUTPUT
   * =====================================================
   */

  try {
    await fs.access(outputPath);
  } catch {
    throw new Error("Unlocked PDF was not created");
  }

  /*
   * =====================================================
   * CHECK OUTPUT SIZE
   * =====================================================
   */

  const outputStats = await fs.stat(outputPath);

  if (outputStats.size === 0) {
    await fs.unlink(outputPath).catch(() => {});

    throw new Error("Unlocked PDF is empty");
  }

  return outputPath;
};

export const getPDFMetadata = async (inputPath) => {
  if (!inputPath) {
    throw new Error("Input PDF path is required");
  }

  const pdfBytes = await fs.readFile(inputPath);

  const pdfDoc = await PDFDocument.load(pdfBytes, {
    ignoreEncryption: false,
  });

  const creationDate = pdfDoc.getCreationDate();

  const modificationDate = pdfDoc.getModificationDate();

  return {
    title: pdfDoc.getTitle() || "",

    author: pdfDoc.getAuthor() || "",

    subject: pdfDoc.getSubject() || "",

    keywords: pdfDoc.getKeywords() || "",

    creator: pdfDoc.getCreator() || "",

    producer: pdfDoc.getProducer() || "",

    creationDate: creationDate ? creationDate.toISOString() : null,

    modificationDate: modificationDate ? modificationDate.toISOString() : null,
  };
};

export const updatePDFMetadata = async (
  inputPath,
  outputPath,
  metadata = {},
) => {
  if (!inputPath) {
    throw new Error("Input PDF path is required");
  }

  if (!outputPath) {
    throw new Error("Output PDF path is required");
  }

  const pdfBytes = await fs.readFile(inputPath);

  const pdfDoc = await PDFDocument.load(pdfBytes);

  /*
   * =================================================
   * METADATA
   * =================================================
   */

  if (metadata.title !== undefined) {
    pdfDoc.setTitle(String(metadata.title || ""));
  }

  if (metadata.author !== undefined) {
    pdfDoc.setAuthor(String(metadata.author || ""));
  }

  if (metadata.subject !== undefined) {
    pdfDoc.setSubject(String(metadata.subject || ""));
  }

  if (metadata.keywords !== undefined) {
    /*
     * pdf-lib expects an array
     * of keywords.
     */

    let keywords = [];

    if (Array.isArray(metadata.keywords)) {
      keywords = metadata.keywords
        .map((item) => String(item).trim())
        .filter(Boolean);
    } else {
      keywords = String(metadata.keywords || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    pdfDoc.setKeywords(keywords);
  }

  if (metadata.creator !== undefined) {
    pdfDoc.setCreator(String(metadata.creator || ""));
  }

  if (metadata.producer !== undefined) {
    pdfDoc.setProducer(String(metadata.producer || ""));
  }

  /*
   * =================================================
   * CREATION DATE
   * =================================================
   */

  if (metadata.creationDate) {
    const date = new Date(metadata.creationDate);

    if (!Number.isNaN(date.getTime())) {
      pdfDoc.setCreationDate(date);
    }
  }

  /*
   * =================================================
   * MODIFICATION DATE
   * =================================================
   */

  if (metadata.modificationDate) {
    const date = new Date(metadata.modificationDate);

    if (!Number.isNaN(date.getTime())) {
      pdfDoc.setModificationDate(date);
    }
  }

  /*
   * =================================================
   * SAVE
   * =================================================
   */

  const outputBytes = await pdfDoc.save({
    useObjectStreams: true,
  });

  await fs.writeFile(outputPath, outputBytes);

  /*
   * =================================================
   * CHECK OUTPUT
   * =================================================
   */

  try {
    await fs.access(outputPath);
  } catch {
    throw new Error("Updated PDF was not created");
  }

  return outputPath;
};

export const organizePDF = async (inputPath, outputPath, options = {}) => {
  if (!inputPath) {
    throw new Error("Input PDF path is required");
  }

  if (!outputPath) {
    throw new Error("Output PDF path is required");
  }

  const { pageOrder = [], rotations = {} } = options;

  // ==========================================================
  // READ PDF
  // ==========================================================

  const pdfBytes = await fs.readFile(inputPath);

  const sourcePdf = await PDFDocument.load(pdfBytes);

  const totalPages = sourcePdf.getPageCount();

  if (totalPages === 0) {
    throw new Error("PDF does not contain any pages");
  }

  // ==========================================================
  // PAGE ORDER VALIDATION
  // ==========================================================

  if (!Array.isArray(pageOrder)) {
    throw new Error("pageOrder must be an array");
  }

  if (pageOrder.length === 0) {
    throw new Error("At least one page must be selected");
  }

  // ==========================================================
  // NORMALIZE PAGE ORDER
  // ==========================================================

  const normalizedPageOrder = pageOrder.map((page) => {
    const pageNumber = Number(page);

    if (
      !Number.isInteger(pageNumber) ||
      pageNumber < 1 ||
      pageNumber > totalPages
    ) {
      throw new Error(`Invalid page number: ${page}`);
    }

    // Convert 1-based page number
    // to 0-based PDF index
    return pageNumber - 1;
  });

  // ==========================================================
  // NORMALIZE ROTATIONS
  // ==========================================================

  const normalizedRotations = {};

  if (rotations && typeof rotations === "object" && !Array.isArray(rotations)) {
    for (const [pageNumber, rotation] of Object.entries(rotations)) {
      const numericPage = Number(pageNumber);

      let numericRotation = Number(rotation);

      // Ignore invalid rotation values
      if (
        !Number.isInteger(numericPage) ||
        numericPage < 1 ||
        numericPage > totalPages
      ) {
        continue;
      }

      if (!Number.isFinite(numericRotation)) {
        numericRotation = 0;
      }

      // Rotation must be multiple of 90
      numericRotation = Math.round(numericRotation / 90) * 90;

      // Keep rotation between 0 and 359
      numericRotation = ((numericRotation % 360) + 360) % 360;

      normalizedRotations[numericPage] = numericRotation;
    }
  }

  // ==========================================================
  // CREATE NEW PDF
  // ==========================================================

  const organizedPdf = await PDFDocument.create();

  // ==========================================================
  // COPY PAGES
  // ==========================================================

  const copiedPages = await organizedPdf.copyPages(
    sourcePdf,
    normalizedPageOrder,
  );

  // ==========================================================
  // ADD PAGES + APPLY ROTATION
  // ==========================================================

  copiedPages.forEach((page, newIndex) => {
    /*
     * Original page index
     *
     * Example:
     *
     * pageOrder = [3, 1, 2]
     *
     * newIndex 0 => original page 3
     * newIndex 1 => original page 1
     * newIndex 2 => original page 2
     */

    const originalPageIndex = normalizedPageOrder[newIndex];

    const originalPage = sourcePdf.getPage(originalPageIndex);

    // ======================================================
    // ORIGINAL PDF ROTATION
    // ======================================================

    const originalRotation = originalPage.getRotation()?.angle || 0;

    // ======================================================
    // USER ROTATION
    // ======================================================

    const originalPageNumber = originalPageIndex + 1;

    const requestedRotation = normalizedRotations[originalPageNumber] || 0;

    // ======================================================
    // FINAL ROTATION
    // ======================================================

    let finalRotation = originalRotation + requestedRotation;

    finalRotation = ((finalRotation % 360) + 360) % 360;

    // ======================================================
    // APPLY ROTATION
    // ======================================================

    if (finalRotation !== 0) {
      page.setRotation(degrees(finalRotation));
    }

    // ======================================================
    // ADD PAGE
    // ======================================================

    organizedPdf.addPage(page);
  });

  // ==========================================================
  // SAVE PDF
  // ==========================================================

  const outputBytes = await organizedPdf.save({
    useObjectStreams: true,
  });

  await fs.writeFile(outputPath, outputBytes);

  // ==========================================================
  // CHECK OUTPUT
  // ==========================================================

  try {
    await fs.access(outputPath);
  } catch {
    throw new Error("Organized PDF was not created");
  }

  return outputPath;
};

export const annotatePDF = async (inputPath, outputPath, annotations = []) => {
  if (!inputPath) {
    throw new Error("Input PDF path is required");
  }

  if (!outputPath) {
    throw new Error("Output PDF path is required");
  }

  const pdfBytes = await fs.readFile(inputPath);

  const pdfDoc = await PDFDocument.load(pdfBytes);

  pdfDoc.registerFontkit(fontkit);

  const pages = pdfDoc.getPages();

  // ==========================================================
  // COLOR HELPER
  // ==========================================================

  const hexToRgb = (hex) => {
    let value = String(hex || "#000000")
      .replace("#", "")
      .trim();

    if (value.length === 3) {
      value = value
        .split("")
        .map((char) => char + char)
        .join("");
    }

    if (!/^[0-9a-fA-F]{6}$/.test(value)) {
      value = "000000";
    }

    const number = parseInt(value, 16);

    return {
      r: ((number >> 16) & 255) / 255,
      g: ((number >> 8) & 255) / 255,
      b: (number & 255) / 255,
    };
  };

  // ==========================================================
  // CLAMP HELPER
  // ==========================================================

  const clamp = (value, min = 0, max = 1) => {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return min;
    }

    return Math.max(min, Math.min(max, number));
  };

  // ==========================================================
  // SAFE NUMBER
  // ==========================================================

  const safeNumber = (value, fallback = 0) => {
    const number = Number(value);

    return Number.isFinite(number) ? number : fallback;
  };

  // ==========================================================
  // FONT CACHE
  // ==========================================================

  // const fontCache = new Map();

  // // ==========================================================
  // // GET PDF FONT
  // // ==========================================================

  // const getFont = async (
  //   fontFamily = "Helvetica",
  //   fontStyle = "normal"
  // ) => {
  //   const family = String(
  //     fontFamily || "Helvetica"
  //   ).toLowerCase();

  //   const style = String(
  //     fontStyle || "normal"
  //   ).toLowerCase();

  //   let fontName;

  //   // --------------------------------------------------------
  //   // HELVETICA
  //   // --------------------------------------------------------

  //   if (family === "helvetica") {
  //     if (
  //       style === "bolditalic" ||
  //       style === "bold-italic" ||
  //       style === "bold italic"
  //     ) {
  //       fontName =
  //         StandardFonts.HelveticaBoldOblique;
  //     } else if (style === "bold") {
  //       fontName =
  //         StandardFonts.HelveticaBold;
  //     } else if (
  //       style === "italic" ||
  //       style === "oblique"
  //     ) {
  //       fontName =
  //         StandardFonts.HelveticaOblique;
  //     } else {
  //       fontName =
  //         StandardFonts.Helvetica;
  //     }
  //   }

  //   // --------------------------------------------------------
  //   // TIMES
  //   // --------------------------------------------------------

  //   else if (
  //     family === "times" ||
  //     family === "timesroman" ||
  //     family === "times roman"
  //   ) {
  //     if (
  //       style === "bolditalic" ||
  //       style === "bold-italic" ||
  //       style === "bold italic"
  //     ) {
  //       fontName =
  //         StandardFonts.TimesRomanBoldItalic;
  //     } else if (style === "bold") {
  //       fontName =
  //         StandardFonts.TimesRomanBold;
  //     } else if (style === "italic") {
  //       fontName =
  //         StandardFonts.TimesRomanItalic;
  //     } else {
  //       fontName =
  //         StandardFonts.TimesRoman;
  //     }
  //   }

  //   // --------------------------------------------------------
  //   // COURIER
  //   // --------------------------------------------------------

  //   else if (family === "courier") {
  //     if (
  //       style === "bolditalic" ||
  //       style === "bold-italic" ||
  //       style === "bold italic"
  //     ) {
  //       fontName =
  //         StandardFonts.CourierBoldOblique;
  //     } else if (style === "bold") {
  //       fontName =
  //         StandardFonts.CourierBold;
  //     } else if (
  //       style === "italic" ||
  //       style === "oblique"
  //     ) {
  //       fontName =
  //         StandardFonts.CourierOblique;
  //     } else {
  //       fontName =
  //         StandardFonts.Courier;
  //     }
  //   }

  //   // --------------------------------------------------------
  //   // DEFAULT
  //   // --------------------------------------------------------

  //   else {
  //     fontName =
  //       StandardFonts.Helvetica;
  //   }

  //   // --------------------------------------------------------
  //   // CACHE
  //   // --------------------------------------------------------

  //   if (fontCache.has(fontName)) {
  //     return fontCache.get(fontName);
  //   }

  //   const font =
  //     await pdfDoc.embedFont(fontName);

  //   fontCache.set(
  //     fontName,
  //     font
  //   );

  //   return font;
  // };

  // ==========================================================
  // FONT CACHE
  // ==========================================================

  const fontCache = new Map();

  // ==========================================================
  // FONT DIRECTORY
  // ==========================================================

  const fontsDir = path.join(process.cwd(), "fonts");

  // ==========================================================
  // GET EMBEDDED TTF FONT
  // ==========================================================

  const getFont = async (
    fontFamily = "Roboto",
    fontStyle = "normal",
    fontBold = false,
    fontItalic = false,
  ) => {
    const family = String(fontFamily || "Roboto")
      .toLowerCase()
      .trim();

    // --------------------------------------------------------
    // DETERMINE STYLE
    // --------------------------------------------------------

    const isBold = fontBold || fontStyle.toLowerCase().includes("bold");

    const isItalic =
      fontItalic ||
      fontStyle.toLowerCase().includes("italic") ||
      fontStyle.toLowerCase().includes("oblique");

    // --------------------------------------------------------
    // CURRENTLY SUPPORTED FONT
    // --------------------------------------------------------

    let fontFile;

    if (family === "roboto") {
      if (isBold && isItalic) {
        fontFile = "Roboto-BoldItalic.ttf";
      } else if (isBold) {
        fontFile = "Roboto-Bold.ttf";
      } else if (isItalic) {
        fontFile = "Roboto-Italic.ttf";
      } else {
        fontFile = "Roboto-Regular.ttf";
      }
    }

    // --------------------------------------------------------
    // FALLBACK
    // --------------------------------------------------------
    else {
      console.warn(`Font "${fontFamily}" is not installed. Using Roboto.`);

      if (isBold && isItalic) {
        fontFile = "Roboto-BoldItalic.ttf";
      } else if (isBold) {
        fontFile = "Roboto-Bold.ttf";
      } else if (isItalic) {
        fontFile = "Roboto-Italic.ttf";
      } else {
        fontFile = "Roboto-Regular.ttf";
      }
    }

    // --------------------------------------------------------
    // FULL PATH
    // --------------------------------------------------------

    const fontPath = path.join(fontsDir, fontFile);

    // --------------------------------------------------------
    // CACHE KEY
    // --------------------------------------------------------

    const cacheKey = fontFile;

    // --------------------------------------------------------
    // RETURN CACHED FONT
    // --------------------------------------------------------

    if (fontCache.has(cacheKey)) {
      return fontCache.get(cacheKey);
    }

    // --------------------------------------------------------
    // CHECK FONT FILE
    // --------------------------------------------------------

    try {
      await fs.access(fontPath);
    } catch {
      throw new Error(`Font file not found: ${fontPath}`);
    }

    // --------------------------------------------------------
    // READ TTF
    // --------------------------------------------------------

    const fontBytes = await fs.readFile(fontPath);

    // --------------------------------------------------------
    // EMBED TTF
    // --------------------------------------------------------

    const font = await pdfDoc.embedFont(fontBytes, {
      subset: true,
    });

    // --------------------------------------------------------
    // CACHE
    // --------------------------------------------------------

    fontCache.set(cacheKey, font);

    return font;
  };

  // ==========================================================
  // DRAW UNDERLINE
  // ==========================================================

  const drawUnderline = ({
    page,
    x,
    y,
    width,
    fontSize,
    color,
    thickness = 1,
  }) => {
    const underlineY = y - Math.max(1, fontSize * 0.12);

    page.drawLine({
      start: {
        x,
        y: underlineY,
      },

      end: {
        x: x + width,
        y: underlineY,
      },

      thickness,

      color,
    });
  };

  // ==========================================================
  // DRAW MULTILINE TEXT
  // ==========================================================

  const drawTextAnnotation = async (
    page,
    annotation,
    width,
    height,
    pdfColor,
  ) => {
    const text = String(annotation.text || "");

    if (!text.trim()) {
      return;
    }

    // --------------------------------------------------------
    // FONT
    // --------------------------------------------------------

    // const font =
    //   await getFont(
    //     annotation.fontFamily ||
    //       "Helvetica",
    //     annotation.fontStyle ||
    //       "normal"
    //   );

    const font = await getFont(
      annotation.fontFamily || "Roboto",
      annotation.fontStyle || "normal",
      Boolean(annotation.fontBold),
      Boolean(annotation.fontItalic),
    );

    // --------------------------------------------------------
    // FONT SIZE
    // --------------------------------------------------------

    const fontSize = Math.max(
      6,
      Math.min(200, safeNumber(annotation.fontSize, 18)),
    );

    // --------------------------------------------------------
    // POSITION
    // --------------------------------------------------------

    const x = clamp(annotation.x) * width;

    /*
     * Frontend uses TOP based coordinates.
     *
     * PDF uses BOTTOM based coordinates.
     */

    const topY = clamp(annotation.y) * height;

    // --------------------------------------------------------
    // LINE HEIGHT
    // --------------------------------------------------------

    const lineHeight = Math.max(
      fontSize * 1.2,
      safeNumber(annotation.lineHeight, fontSize * 1.2),
    );

    // --------------------------------------------------------
    // ALIGNMENT
    // --------------------------------------------------------

    const align = String(
      annotation.align || annotation.textAlign || "left",
    ).toLowerCase();

    // --------------------------------------------------------
    // UNDERLINE
    // --------------------------------------------------------

    const underline = Boolean(annotation.underline);

    // --------------------------------------------------------
    // SPLIT LINES
    // --------------------------------------------------------

    const lines = text.split(/\r?\n/);

    // --------------------------------------------------------
    // DRAW EACH LINE
    // --------------------------------------------------------

    lines.forEach((line, index) => {
      const lineText = line || " ";

      const textWidth = font.widthOfTextAtSize(lineText, fontSize);

      let drawX = x;

      // ----------------------------------------------------
      // CENTER
      // ----------------------------------------------------

      if (align === "center") {
        const containerWidth = safeNumber(annotation.textBoxWidth, 0) * width;

        if (containerWidth > 0) {
          drawX = x + (containerWidth - textWidth) / 2;
        } else {
          drawX = x - textWidth / 2;
        }
      }

      // ----------------------------------------------------
      // RIGHT
      // ----------------------------------------------------
      else if (align === "right") {
        const containerWidth = safeNumber(annotation.textBoxWidth, 0) * width;

        if (containerWidth > 0) {
          drawX = x + containerWidth - textWidth;
        } else {
          drawX = x - textWidth;
        }
      }

      // ----------------------------------------------------
      // Y POSITION
      // ----------------------------------------------------

      const drawY = height - topY - fontSize - index * lineHeight;

      // ----------------------------------------------------
      // DRAW TEXT
      // ----------------------------------------------------

      page.drawText(lineText, {
        x: drawX,
        y: drawY,
        size: fontSize,
        font,
        color: pdfColor,
      });

      // ----------------------------------------------------
      // UNDERLINE
      // ----------------------------------------------------

      if (underline) {
        drawUnderline({
          page,
          x: drawX,
          y: drawY,
          width: textWidth,
          fontSize,
          color: pdfColor,
          thickness: Math.max(0.5, fontSize * 0.05),
        });
      }
    });
  };

  // ==========================================================
  // PAGE ANNOTATIONS
  // ==========================================================

  for (const pageData of annotations) {
    const pageNumber = Number(pageData?.pageNumber);

    // --------------------------------------------------------
    // INVALID PAGE
    // --------------------------------------------------------

    if (
      !Number.isInteger(pageNumber) ||
      pageNumber < 1 ||
      pageNumber > pages.length
    ) {
      continue;
    }

    const page = pages[pageNumber - 1];

    const { width, height } = page.getSize();

    const pageAnnotations = Array.isArray(pageData.annotations)
      ? pageData.annotations
      : [];

    // ========================================================
    // EACH ANNOTATION
    // ========================================================

    for (const annotation of pageAnnotations) {
      if (!annotation) {
        continue;
      }

      const type = annotation.type;

      // ------------------------------------------------------
      // COLOR
      // ------------------------------------------------------

      const rgbColor = hexToRgb(annotation.color);

      const pdfColor = rgb(rgbColor.r, rgbColor.g, rgbColor.b);

      // ------------------------------------------------------
      // LINE WIDTH
      // ------------------------------------------------------

      const lineWidth = Math.max(0.5, safeNumber(annotation.lineWidth, 2));

      // ======================================================
      // TEXT
      // ======================================================

      if (type === "text") {
        await drawTextAnnotation(page, annotation, width, height, pdfColor);

        continue;
      }

      // ======================================================
      // HIGHLIGHT
      // ======================================================

      if (type === "highlight") {
        const x = clamp(annotation.x) * width;

        const yTop = clamp(annotation.y) * height;

        const annotationWidth = clamp(annotation.width) * width;

        const annotationHeight = clamp(annotation.height) * height;

        const y = height - yTop - annotationHeight;

        page.drawRectangle({
          x,
          y,

          width: Math.max(0, annotationWidth),

          height: Math.max(0, annotationHeight),

          color: pdfColor,

          opacity: safeNumber(annotation.opacity, 0.3),

          borderOpacity: 0,
        });

        continue;
      }

      // ======================================================
      // RECTANGLE
      // ======================================================

      if (type === "rectangle") {
        const x = clamp(annotation.x) * width;

        const yTop = clamp(annotation.y) * height;

        const annotationWidth = clamp(annotation.width) * width;

        const annotationHeight = clamp(annotation.height) * height;

        const y = height - yTop - annotationHeight;

        page.drawRectangle({
          x,
          y,

          width: Math.max(0, annotationWidth),

          height: Math.max(0, annotationHeight),

          borderColor: pdfColor,

          borderWidth: lineWidth,
        });

        continue;
      }

      // ======================================================
      // CIRCLE
      // ======================================================

      if (type === "circle") {
        const x = clamp(annotation.x) * width;

        const yTop = clamp(annotation.y) * height;

        const annotationWidth = clamp(annotation.width) * width;

        const annotationHeight = clamp(annotation.height) * height;

        const centerX = x + annotationWidth / 2;

        const centerY = height - yTop - annotationHeight / 2;

        page.drawEllipse({
          x: centerX,
          y: centerY,

          xScale: Math.abs(annotationWidth / 2),

          yScale: Math.abs(annotationHeight / 2),

          borderColor: pdfColor,

          borderWidth: lineWidth,
        });

        continue;
      }

      // ======================================================
      // LINE
      // ======================================================

      if (type === "line") {
        const x1 = clamp(annotation.x) * width;

        const y1 = height - clamp(annotation.y) * height;

        const x2 = clamp(annotation.x2) * width;

        const y2 = height - clamp(annotation.y2) * height;

        page.drawLine({
          start: {
            x: x1,
            y: y1,
          },

          end: {
            x: x2,
            y: y2,
          },

          thickness: lineWidth,

          color: pdfColor,
        });

        continue;
      }

      // ======================================================
      // FREEHAND DRAWING
      // ======================================================

      if (type === "draw") {
        const points = Array.isArray(annotation.points)
          ? annotation.points
          : [];

        if (points.length < 2) {
          continue;
        }

        for (let i = 1; i < points.length; i++) {
          const previous = points[i - 1];

          const current = points[i];

          const x1 = clamp(previous.x) * width;

          const y1 = height - clamp(previous.y) * height;

          const x2 = clamp(current.x) * width;

          const y2 = height - clamp(current.y) * height;

          page.drawLine({
            start: {
              x: x1,
              y: y1,
            },

            end: {
              x: x2,
              y: y2,
            },

            thickness: lineWidth,

            color: pdfColor,
          });
        }

        continue;
      }
    }
  }

  // ==========================================================
  // SAVE PDF
  // ==========================================================

  const outputBytes = await pdfDoc.save({
    useObjectStreams: true,
  });

  await fs.writeFile(outputPath, outputBytes);

  // ==========================================================
  // VERIFY OUTPUT
  // ==========================================================

  try {
    await fs.access(outputPath);
  } catch {
    throw new Error("Annotated PDF was not created");
  }

  return outputPath;
};

// export const addPageNumbersToPDF = async (
//   inputPath,
//   outputPath,
//   options = {}
// ) => {
//   if (!inputPath) {
//     throw new Error("Input PDF path is required");
//   }

//   if (!outputPath) {
//     throw new Error("Output PDF path is required");
//   }

//   // ==========================================================
//   // LOAD PDF
//   // ==========================================================

//   const pdfBytes = await fs.readFile(inputPath);

//   const pdfDoc = await PDFDocument.load(pdfBytes);

//   const pages = pdfDoc.getPages();

//   if (!pages.length) {
//     throw new Error("PDF contains no pages");
//   }

//   // ==========================================================
//   // OPTIONS
//   // ==========================================================

//   const position = String(
//     options.position || "bottom-center"
//   ).toLowerCase();

//   const startNumber = Math.max(
//     0,
//     Number(options.startNumber) || 1
//   );

//   const fontSize = Math.max(
//     6,
//     Math.min(
//       100,
//       Number(options.fontSize) || 12
//     )
//   );

//   const margin = Math.max(
//     0,
//     Math.min(
//       100,
//       Number(options.margin) || 24
//     )
//   );

//   const prefix =
//     options.prefix !== undefined
//       ? String(options.prefix)
//       : "";

//   const suffix =
//     options.suffix !== undefined
//       ? String(options.suffix)
//       : "";

//   const format = String(
//     options.format || "number"
//   ).toLowerCase();

//   // ==========================================================
//   // COLOR
//   // ==========================================================

//   const hexToRgb = (hex) => {
//     let value = String(
//       hex || "#000000"
//     )
//       .replace("#", "")
//       .trim();

//     // #fff -> #ffffff
//     if (value.length === 3) {
//       value = value
//         .split("")
//         .map((char) => char + char)
//         .join("");
//     }

//     // Invalid color -> black
//     if (!/^[0-9a-fA-F]{6}$/.test(value)) {
//       value = "000000";
//     }

//     const number = parseInt(
//       value,
//       16
//     );

//     return {
//       r: ((number >> 16) & 255) / 255,
//       g: ((number >> 8) & 255) / 255,
//       b: (number & 255) / 255,
//     };
//   };

//   const colorValue = hexToRgb(
//     options.color || "#000000"
//   );

//   const textColor = rgb(
//     colorValue.r,
//     colorValue.g,
//     colorValue.b
//   );

//   // ==========================================================
//   // FONT
//   // ==========================================================

//   let font;

//   const fontFamily = String(
//     options.fontFamily || "Helvetica"
//   ).toLowerCase();

//   if (
//     fontFamily === "times" ||
//     fontFamily === "times-roman" ||
//     fontFamily === "timesroman"
//   ) {
//     font = await pdfDoc.embedFont(
//       StandardFonts.TimesRoman
//     );
//   } else if (
//     fontFamily === "courier"
//   ) {
//     font = await pdfDoc.embedFont(
//       StandardFonts.Courier
//     );
//   } else if (
//     fontFamily === "helvetica-bold" ||
//     fontFamily === "bold"
//   ) {
//     font = await pdfDoc.embedFont(
//       StandardFonts.HelveticaBold
//     );
//   } else {
//     font = await pdfDoc.embedFont(
//       StandardFonts.Helvetica
//     );
//   }

//   // ==========================================================
//   // SELECTED PAGES
//   //
//   // Supports:
//   // "all"
//   // "1,2,5"
//   // "1-3,5,7-10"
//   // [1,2,3]
//   // ==========================================================

//   let selectedPages = [];

//   const pagesOption =
//     options.pages !== undefined
//       ? options.pages
//       : "all";

//   // ----------------------------------------------------------
//   // ARRAY
//   // ----------------------------------------------------------

//   if (Array.isArray(pagesOption)) {
//     selectedPages = pagesOption
//       .map((value) => Number(value))
//       .filter(
//         (pageNumber) =>
//           Number.isInteger(pageNumber) &&
//           pageNumber >= 1 &&
//           pageNumber <= pages.length
//       )
//       .map(
//         (pageNumber) => pageNumber - 1
//       );
//   }

//   // ----------------------------------------------------------
//   // ALL
//   // ----------------------------------------------------------

//   else if (
//     String(pagesOption)
//       .toLowerCase()
//       .trim() === "all"
//   ) {
//     selectedPages = pages.map(
//       (_, index) => index
//     );
//   }

//   // ----------------------------------------------------------
//   // STRING
//   // ----------------------------------------------------------

//   else {
//     const pageString = String(
//       pagesOption
//     ).trim();

//     if (!pageString) {
//       selectedPages = pages.map(
//         (_, index) => index
//       );
//     } else {
//       const pageSet = new Set();

//       const parts = pageString
//         .split(",")
//         .map((item) => item.trim())
//         .filter(Boolean);

//       for (const part of parts) {
//         // Range: 1-5
//         if (part.includes("-")) {
//           const rangeParts = part
//             .split("-")
//             .map((value) =>
//               Number(value.trim())
//             );

//           if (rangeParts.length !== 2) {
//             continue;
//           }

//           const start = Math.min(
//             rangeParts[0],
//             rangeParts[1]
//           );

//           const end = Math.max(
//             rangeParts[0],
//             rangeParts[1]
//           );

//           if (
//             !Number.isInteger(start) ||
//             !Number.isInteger(end)
//           ) {
//             continue;
//           }

//           for (
//             let pageNumber = start;
//             pageNumber <= end;
//             pageNumber++
//           ) {
//             if (
//               pageNumber >= 1 &&
//               pageNumber <= pages.length
//             ) {
//               pageSet.add(
//                 pageNumber - 1
//               );
//             }
//           }
//         }

//         // Single page: 5
//         else {
//           const pageNumber =
//             Number(part);

//           if (
//             Number.isInteger(pageNumber) &&
//             pageNumber >= 1 &&
//             pageNumber <= pages.length
//           ) {
//             pageSet.add(
//               pageNumber - 1
//             );
//           }
//         }
//       }

//       selectedPages = [
//         ...pageSet,
//       ].sort(
//         (a, b) => a - b
//       );
//     }
//   }

//   // ==========================================================
//   // VALIDATE SELECTED PAGES
//   // ==========================================================

//   if (!selectedPages.length) {
//     throw new Error(
//       "No valid pages were selected"
//     );
//   }

//   // ==========================================================
//   // FORMAT PAGE NUMBER
//   // ==========================================================

//   const createPageText = (
//     pageNumber
//   ) => {
//     let numberText = "";

//     /*
//       Frontend format IDs:

//       number
//       page-number
//       number-total
//       page-number-total
//     */

//     if (
//       format === "page-number" ||
//       format === "page"
//     ) {
//       numberText = `Page ${pageNumber}`;
//     }

//     else if (
//       format === "number-total" ||
//       format === "number-of-total"
//     ) {
//       numberText = `${pageNumber} / ${pages.length}`;
//     }

//     else if (
//       format === "page-number-total" ||
//       format === "page-of-total"
//     ) {
//       numberText =
//         `Page ${pageNumber} of ${pages.length}`;
//     }

//     else {
//       numberText = String(
//         pageNumber
//       );
//     }

//     return `${prefix}${numberText}${suffix}`;
//   };

//   // ==========================================================
//   // DRAW PAGE NUMBERS
//   // ==========================================================

//   selectedPages.forEach(
//     (pageIndex, selectedIndex) => {
//       const page =
//         pages[pageIndex];

//       const {
//         width,
//         height,
//       } = page.getSize();

//       /*
//         IMPORTANT:

//         Numbering is based on the SELECTED PAGE ORDER,
//         not the original PDF page index.

//         Example:

//         Selected pages: 5,7,9
//         Start number: 1

//         Result:

//         PDF page 5 -> 1
//         PDF page 7 -> 2
//         PDF page 9 -> 3

//         This matches your frontend preview.
//       */

//       const actualPageNumber =
//         startNumber +
//         selectedIndex;

//       const text =
//         createPageText(
//           actualPageNumber
//         );

//       const textWidth =
//         font.widthOfTextAtSize(
//           text,
//           fontSize
//         );

//       /*
//         Approximate text height.
//         PDF-lib uses the baseline for y.
//       */

//       const textHeight =
//         fontSize;

//       // ======================================================
//       // HORIZONTAL POSITION
//       // ======================================================

//       let x;

//       if (
//         position.includes("left")
//       ) {
//         x = margin;
//       }

//       else if (
//         position.includes("right")
//       ) {
//         x =
//           width -
//           margin -
//           textWidth;
//       }

//       else {
//         x =
//           (width -
//             textWidth) /
//           2;
//       }

//       // Prevent text from going outside page
//       x = Math.max(
//         0,
//         Math.min(
//           x,
//           width - textWidth
//         )
//       );

//       // ======================================================
//       // VERTICAL POSITION
//       // ======================================================

//       let y;

//       if (
//         position.startsWith("top")
//       ) {
//         y =
//           height -
//           margin -
//           textHeight;
//       }

//       else {
//         y = margin;
//       }

//       // Prevent text from going outside page
//       y = Math.max(
//         0,
//         Math.min(
//           y,
//           height - textHeight
//         )
//       );

//       // ======================================================
//       // DRAW
//       // ======================================================

//       page.drawText(
//         text,
//         {
//           x,
//           y,
//           size: fontSize,
//           font,
//           color: textColor,
//         }
//       );
//     }
//   );

//   // ==========================================================
//   // SAVE
//   // ==========================================================

//   const outputBytes =
//     await pdfDoc.save({
//       useObjectStreams: true,
//     });

//   await fs.writeFile(
//     outputPath,
//     outputBytes
//   );

//   // ==========================================================
//   // VERIFY
//   // ==========================================================

//   try {
//     await fs.access(
//       outputPath
//     );
//   } catch {
//     throw new Error(
//       "Page numbered PDF was not created"
//     );
//   }

//   return outputPath;
// };

// export const addPageNumbersToPDF = async (
//   inputPath,
//   outputPath,
//   options = {}
// ) => {
//   if (!inputPath) {
//     throw new Error("Input PDF path is required");
//   }

//   if (!outputPath) {
//     throw new Error("Output PDF path is required");
//   }

//   // ==========================================================
//   // LOAD PDF
//   // ==========================================================

//   const pdfBytes = await fs.readFile(inputPath);

//   const pdfDoc = await PDFDocument.load(pdfBytes);

//   const pages = pdfDoc.getPages();

//   if (!pages.length) {
//     throw new Error("PDF contains no pages");
//   }

//   // ==========================================================
//   // OPTIONS
//   // ==========================================================

//   const position = String(
//     options.position || "bottom-center"
//   ).toLowerCase();

//   const startNumber = Math.max(
//     0,
//     Number(options.startNumber) || 1
//   );

//   const fontSize = Math.max(
//     6,
//     Math.min(
//       100,
//       Number(options.fontSize) || 12
//     )
//   );

//   const margin = Math.max(
//     0,
//     Math.min(
//       100,
//       Number(options.margin) || 24
//     )
//   );

//   const prefix =
//     options.prefix !== undefined
//       ? String(options.prefix)
//       : "";

//   const suffix =
//     options.suffix !== undefined
//       ? String(options.suffix)
//       : "";

//   const format = String(
//     options.format || "number"
//   ).toLowerCase();

//   // ==========================================================
//   // COLOR
//   // ==========================================================

//   const hexToRgb = (hex) => {
//     let value = String(
//       hex || "#000000"
//     )
//       .replace("#", "")
//       .trim();

//     if (value.length === 3) {
//       value = value
//         .split("")
//         .map((char) => char + char)
//         .join("");
//     }

//     if (!/^[0-9a-fA-F]{6}$/.test(value)) {
//       value = "000000";
//     }

//     const number = parseInt(
//       value,
//       16
//     );

//     return {
//       r: ((number >> 16) & 255) / 255,
//       g: ((number >> 8) & 255) / 255,
//       b: (number & 255) / 255,
//     };
//   };

//   const colorValue = hexToRgb(
//     options.color || "#000000"
//   );

//   const textColor = rgb(
//     colorValue.r,
//     colorValue.g,
//     colorValue.b
//   );

//   // ==========================================================
//   // FONT
//   // ==========================================================

//   let font;

//   const fontFamily = String(
//     options.fontFamily || "Helvetica"
//   ).toLowerCase();

//   if (
//     fontFamily === "times" ||
//     fontFamily === "times-roman" ||
//     fontFamily === "timesroman"
//   ) {
//     font = await pdfDoc.embedFont(
//       StandardFonts.TimesRoman
//     );
//   } else if (
//     fontFamily === "courier"
//   ) {
//     font = await pdfDoc.embedFont(
//       StandardFonts.Courier
//     );
//   } else if (
//     fontFamily === "helvetica-bold" ||
//     fontFamily === "bold"
//   ) {
//     font = await pdfDoc.embedFont(
//       StandardFonts.HelveticaBold
//     );
//   } else {
//     font = await pdfDoc.embedFont(
//       StandardFonts.Helvetica
//     );
//   }

//   // ==========================================================
//   // SELECTED PAGES
//   // ==========================================================

//   let selectedPages = [];

//   const pagesOption =
//     options.pages !== undefined
//       ? options.pages
//       : "all";

//   // ----------------------------------------------------------
//   // ARRAY
//   // ----------------------------------------------------------

//   if (Array.isArray(pagesOption)) {
//     selectedPages = pagesOption
//       .map((value) => Number(value))
//       .filter(
//         (pageNumber) =>
//           Number.isInteger(pageNumber) &&
//           pageNumber >= 1 &&
//           pageNumber <= pages.length
//       )
//       .map(
//         (pageNumber) => pageNumber - 1
//       );
//   }

//   // ----------------------------------------------------------
//   // ALL
//   // ----------------------------------------------------------

//   else if (
//     String(pagesOption)
//       .toLowerCase()
//       .trim() === "all"
//   ) {
//     selectedPages = pages.map(
//       (_, index) => index
//     );
//   }

//   // ----------------------------------------------------------
//   // STRING
//   // ----------------------------------------------------------

//   else {
//     const pageString =
//       String(pagesOption).trim();

//     if (!pageString) {
//       selectedPages = pages.map(
//         (_, index) => index
//       );
//     } else {
//       const pageSet = new Set();

//       const parts = pageString
//         .split(",")
//         .map((item) => item.trim())
//         .filter(Boolean);

//       for (const part of parts) {
//         // ----------------------------------------------------
//         // RANGE
//         // ----------------------------------------------------

//         if (part.includes("-")) {
//           const rangeParts = part
//             .split("-")
//             .map((value) =>
//               Number(value.trim())
//             );

//           if (rangeParts.length !== 2) {
//             continue;
//           }

//           const start = Math.min(
//             rangeParts[0],
//             rangeParts[1]
//           );

//           const end = Math.max(
//             rangeParts[0],
//             rangeParts[1]
//           );

//           if (
//             !Number.isInteger(start) ||
//             !Number.isInteger(end)
//           ) {
//             continue;
//           }

//           for (
//             let pageNumber = start;
//             pageNumber <= end;
//             pageNumber++
//           ) {
//             if (
//               pageNumber >= 1 &&
//               pageNumber <= pages.length
//             ) {
//               pageSet.add(
//                 pageNumber - 1
//               );
//             }
//           }
//         }

//         // ----------------------------------------------------
//         // SINGLE PAGE
//         // ----------------------------------------------------

//         else {
//           const pageNumber =
//             Number(part);

//           if (
//             Number.isInteger(pageNumber) &&
//             pageNumber >= 1 &&
//             pageNumber <= pages.length
//           ) {
//             pageSet.add(
//               pageNumber - 1
//             );
//           }
//         }
//       }

//       selectedPages = [
//         ...pageSet,
//       ].sort(
//         (a, b) => a - b
//       );
//     }
//   }

//   // ==========================================================
//   // VALIDATE
//   // ==========================================================

//   if (!selectedPages.length) {
//     throw new Error(
//       "No valid pages were selected"
//     );
//   }

//   // ==========================================================
//   // FORMAT PAGE NUMBER
//   // ==========================================================

//   const createPageText = (
//     pageNumber
//   ) => {
//     let numberText = "";

//     if (
//       format === "page-number" ||
//       format === "page"
//     ) {
//       numberText =
//         `Page ${pageNumber}`;
//     }

//     else if (
//       format === "number-total" ||
//       format === "number-of-total"
//     ) {
//       numberText =
//         `${pageNumber} / ${pages.length}`;
//     }

//     else if (
//       format === "page-number-total" ||
//       format === "page-of-total"
//     ) {
//       numberText =
//         `Page ${pageNumber} of ${pages.length}`;
//     }

//     else {
//       numberText =
//         String(pageNumber);
//     }

//     return `${prefix}${numberText}${suffix}`;
//   };

//   // ==========================================================
//   // ROTATION-AWARE POSITIONING
//   // ==========================================================

//   const getRotationAngle = (page) => {
//     try {
//       const rotation =
//         page.getRotation();

//       let angle =
//         Number(rotation?.angle) || 0;

//       angle =
//         ((angle % 360) + 360) % 360;

//       // PDF rotation normally uses:
//       // 0, 90, 180, 270

//       if (
//         angle === 90 ||
//         angle === 180 ||
//         angle === 270
//       ) {
//         return angle;
//       }

//       return 0;
//     } catch {
//       return 0;
//     }
//   };

//   // ==========================================================
//   // DRAW PAGE NUMBERS
//   // ==========================================================

//   selectedPages.forEach(
//     (pageIndex, selectedIndex) => {
//       const page =
//         pages[pageIndex];

//       const {
//         width,
//         height,
//       } = page.getSize();

//       const rotation =
//         getRotationAngle(page);

//       const actualPageNumber =
//         startNumber +
//         selectedIndex;

//       const text =
//         createPageText(
//           actualPageNumber
//         );

//       const textWidth =
//         font.widthOfTextAtSize(
//           text,
//           fontSize
//         );

//       const textHeight =
//         fontSize;

//       // ======================================================
//       // VISUAL PAGE DIMENSIONS
//       //
//       // For 90 / 270 degree rotated pages,
//       // displayed width and height are swapped.
//       // ======================================================

//       let visualWidth = width;
//       let visualHeight = height;

//       if (
//         rotation === 90 ||
//         rotation === 270
//       ) {
//         visualWidth = height;
//         visualHeight = width;
//       }

//       // ======================================================
//       // VISUAL X POSITION
//       // ======================================================

//       let visualX;

//       if (
//         position.includes("left")
//       ) {
//         visualX = margin;
//       }

//       else if (
//         position.includes("right")
//       ) {
//         visualX =
//           visualWidth -
//           margin -
//           textWidth;
//       }

//       else {
//         visualX =
//           (visualWidth -
//             textWidth) /
//           2;
//       }

//       // ======================================================
//       // VISUAL Y POSITION
//       // ======================================================

//       let visualY;

//       if (
//         position.startsWith("top")
//       ) {
//         visualY =
//           visualHeight -
//           margin -
//           textHeight;
//       }

//       else {
//         visualY =
//           margin;
//       }

//       // ======================================================
//       // ROTATION TRANSFORMATION
//       //
//       // Convert visual coordinates into
//       // PDF's unrotated coordinate system.
//       // ======================================================

//       let x;
//       let y;

//       if (rotation === 0) {
//         // Normal portrait/landscape PDF
//         x = visualX;
//         y = visualY;
//       }

//       else if (rotation === 90) {
//         /*
//           Clockwise 90°

//           Visual:
//               ↑
//               |
//           PDF coordinate system is rotated.

//           Mapping:
//               x = visualY
//               y = height - visualX
//         */

//         x = visualY;
//         y = height - visualX;
//       }

//       else if (rotation === 180) {
//         /*
//           180°
//         */

//         x =
//           width -
//           visualX -
//           textWidth;

//         y =
//           height -
//           visualY -
//           textHeight;
//       }

//       else if (rotation === 270) {
//         /*
//           270° / counter-clockwise 90°
//         */

//         x =
//           width -
//           visualY -
//           textHeight;

//         y = visualX;
//       }

//       // ======================================================
//       // SAFETY
//       // ======================================================

//       x = Math.max(
//         0,
//         Math.min(
//           x,
//           width - textWidth
//         )
//       );

//       y = Math.max(
//         0,
//         Math.min(
//           y,
//           height - textHeight
//         )
//       );

//       // ======================================================
//       // DRAW
//       // ======================================================

//       page.drawText(
//         text,
//         {
//           x,
//           y,
//           size: fontSize,
//           font,
//           color: textColor,
//         }
//       );
//     }
//   );

//   // ==========================================================
//   // SAVE
//   // ==========================================================

//   const outputBytes =
//     await pdfDoc.save({
//       useObjectStreams: true,
//     });

//   await fs.writeFile(
//     outputPath,
//     outputBytes
//   );

//   // ==========================================================
//   // VERIFY
//   // ==========================================================

//   try {
//     await fs.access(
//       outputPath
//     );
//   } catch {
//     throw new Error(
//       "Page numbered PDF was not created"
//     );
//   }

//   return outputPath;
// };



export const addPageNumbersToPDF = async (
  inputPath,
  outputPath,
  options = {}
) => {
  if (!inputPath) {
    throw new Error(
      "Input PDF path is required"
    );
  }

  if (!outputPath) {
    throw new Error(
      "Output PDF path is required"
    );
  }

  // ==========================================================
  // LOAD PDF
  // ==========================================================

  const pdfBytes = await fs.readFile(
    inputPath
  );

  const pdfDoc =
    await PDFDocument.load(pdfBytes);

  const pages = pdfDoc.getPages();

  const totalPages = pages.length;

  if (!totalPages) {
    throw new Error(
      "PDF does not contain any pages."
    );
  }

  // ==========================================================
  // OPTIONS
  // ==========================================================

  const position =
    options.position ||
    "bottom-center";

  const pageRange =
    typeof options.pageRange === "string"
      ? options.pageRange.trim()
      : "";

  let startNumber = Number(
    options.startNumber
  );

  if (
    !Number.isFinite(startNumber) ||
    startNumber < 1
  ) {
    startNumber = 1;
  }

  startNumber = Math.floor(startNumber);

  let fontSize = Number(
    options.fontSize
  );

  if (!Number.isFinite(fontSize)) {
    fontSize = 12;
  }

  fontSize = Math.min(
    Math.max(fontSize, 6),
    100
  );

  let margin = Number(
    options.margin
  );

  if (!Number.isFinite(margin)) {
    margin = 30;
  }

  margin = Math.min(
    Math.max(margin, 0),
    500
  );

  const prefix =
    typeof options.prefix === "string"
      ? options.prefix
      : "";

  const suffix =
    typeof options.suffix === "string"
      ? options.suffix
      : "";

  const format =
    options.format || "number";

  const color =
    options.color || "#000000";

  const fontFamily =
    options.fontFamily ||
    "Helvetica";

  // ==========================================================
  // PAGE RANGE
  // ==========================================================

  const targetPages = parsePageRange(
    pageRange,
    totalPages
  );

  if (!targetPages.length) {
    throw new Error(
      "No valid pages were selected."
    );
  }

  // ==========================================================
  // FONT
  // ==========================================================

  let font;

  switch (fontFamily) {
    case "Times-Roman":
    case "Times":
      font =
        await pdfDoc.embedFont(
          StandardFonts.TimesRoman
        );
      break;

    case "Courier":
      font =
        await pdfDoc.embedFont(
          StandardFonts.Courier
        );
      break;

    case "Helvetica":
    default:
      font =
        await pdfDoc.embedFont(
          StandardFonts.Helvetica
        );
      break;
  }

  // ==========================================================
  // COLOR
  // ==========================================================

  const textColor =
    parseHexColor(color);

  // ==========================================================
  // ADD PAGE NUMBERS
  // ==========================================================

  targetPages.forEach(
    (pageNumber, targetIndex) => {
      const page =
        pages[pageNumber - 1];

      if (!page) {
        return;
      }

      // Number shown on this page.
      //
      // Example:
      // selected pages = 2,4,5
      // startNumber = 10
      //
      // Page 2 => 10
      // Page 4 => 11
      // Page 5 => 12
      const displayNumber =
        startNumber + targetIndex;

      const text =
        formatPageNumber(
          format,
          displayNumber,
          totalPages,
          prefix,
          suffix
        );

      const {
        width,
        height,
      } = page.getSize();

      const textWidth =
        font.widthOfTextAtSize(
          text,
          fontSize
        );

      const textHeight =
        font.heightAtSize(
          fontSize
        );

      let x;
      let y;

      // ======================================================
      // POSITION
      // ======================================================

      switch (position) {
        case "top-left":
          x = margin;
          y =
            height -
            margin -
            textHeight;
          break;

        case "top-center":
          x =
            (width - textWidth) / 2;

          y =
            height -
            margin -
            textHeight;
          break;

        case "top-right":
          x =
            width -
            margin -
            textWidth;

          y =
            height -
            margin -
            textHeight;
          break;

        case "bottom-left":
          x = margin;
          y = margin;
          break;

        case "bottom-right":
          x =
            width -
            margin -
            textWidth;

          y = margin;
          break;

        case "bottom-center":
        default:
          x =
            (width - textWidth) / 2;

          y = margin;
          break;
      }

      // ======================================================
      // DRAW
      // ======================================================

      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font,
        color: textColor,
      });
    }
  );

  // ==========================================================
  // SAVE PDF
  // ==========================================================

  const outputBytes =
    await pdfDoc.save();

  await fs.writeFile(
    outputPath,
    outputBytes
  );

  return {
    totalPages,
    numberedPages: targetPages,
    outputPath,
  };
};

// ============================================================
// PAGE RANGE PARSER
// ============================================================

const parsePageRange = (
  input,
  totalPages
) => {
  // Empty = all pages
  if (!input) {
    return Array.from(
      {
        length: totalPages,
      },
      (_, index) => index + 1
    );
  }

  const pages = new Set();

  const parts = input
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  for (const part of parts) {
    // --------------------------------------------------------
    // Single page
    // --------------------------------------------------------

    if (/^\d+$/.test(part)) {
      const pageNumber =
        Number(part);

      if (
        pageNumber >= 1 &&
        pageNumber <= totalPages
      ) {
        pages.add(pageNumber);
      }

      continue;
    }

    // --------------------------------------------------------
    // Range
    // --------------------------------------------------------

    const match = part.match(
      /^(\d+)\s*-\s*(\d+)$/
    );

    if (!match) {
      continue;
    }

    let start =
      Number(match[1]);

    let end =
      Number(match[2]);

    if (start > end) {
      [start, end] = [
        end,
        start,
      ];
    }

    start = Math.max(
      1,
      Math.min(
        totalPages,
        start
      )
    );

    end = Math.max(
      1,
      Math.min(
        totalPages,
        end
      )
    );

    for (
      let page = start;
      page <= end;
      page++
    ) {
      pages.add(page);
    }
  }

  return Array.from(pages).sort(
    (a, b) => a - b
  );
};

// ============================================================
// FORMAT PAGE NUMBER
// ============================================================

const formatPageNumber = (
  format,
  pageNumber,
  totalPages,
  prefix,
  suffix
) => {
  let text;

  switch (format) {
    case "page-number":
      text = `Page ${pageNumber}`;
      break;

    case "number-total":
      text = `${pageNumber} / ${totalPages}`;
      break;

    case "page-number-total":
      text = `Page ${pageNumber} / ${totalPages}`;
      break;

    case "number":
    default:
      text = `${pageNumber}`;
      break;
  }

  return `${prefix}${text}${suffix}`;
};

// ============================================================
// HEX COLOR
// ============================================================

const parseHexColor = (hex) => {
  if (
    typeof hex !== "string"
  ) {
    return rgb(0, 0, 0);
  }

  let value =
    hex.trim().replace(
      /^#/,
      ""
    );

  // Support short hex:
  // #000 -> #000000
  if (value.length === 3) {
    value = value
      .split("")
      .map((char) => char + char)
      .join("");
  }

  if (
    !/^[0-9a-fA-F]{6}$/.test(
      value
    )
  ) {
    return rgb(0, 0, 0);
  }

  const red =
    parseInt(
      value.slice(0, 2),
      16
    ) / 255;

  const green =
    parseInt(
      value.slice(2, 4),
      16
    ) / 255;

  const blue =
    parseInt(
      value.slice(4, 6),
      16
    ) / 255;

  return rgb(
    red,
    green,
    blue
  );
};