import express from "express";

import upload from "../middleware/uploadMiddleware.js";
import imageUpload from "../middleware/imageUploadMiddleware.js";

import {
  mergePDFController,
  getPDFInfoController,
  splitPDFController,
  pdfToImagesController,
  imagesToPDFController,
  compressPDFController,
  rotatePDFController,
  watermarkPDFController,
  protectPDFController,
  unlockPDFController,
  getPDFMetadataController,
  updatePDFMetadataController,
  organizePDFController,
  annotatePDFController,
  addPageNumbersController,
 } from "../controllers/pdfController.js";

const router = express.Router();

router.post(
  "/merge",
  upload.array("files", 20),
  mergePDFController
);

router.post(
  "/info",
  upload.single("file"),
  getPDFInfoController
);

router.post(
  "/split",
  upload.single("file"),
  splitPDFController
);

router.post(
  "/to-images",
  upload.single("file"),
  pdfToImagesController
);

router.post(
  "/images-to-pdf",
  imageUpload.array(
    "files",
    30
  ),
  imagesToPDFController
);

router.post(
  "/compress",
  upload.single("file"),
  compressPDFController
);

router.post(
  "/rotate",
  upload.single("file"),
  rotatePDFController
);

router.post(
  "/watermark",
  upload.fields([
    {
      name: "file",
      maxCount: 1,
    },
    {
      name: "watermarkImage",
      maxCount: 1,
    },
  ]),
  watermarkPDFController
);

router.post(
  "/protect",
  upload.single("file"),
  protectPDFController
);

router.post(
  "/unlock",
  upload.single("file"),
  unlockPDFController
);

router.post(
  "/metadata/read",
  upload.single("file"),
  getPDFMetadataController
);

router.post(
  "/metadata/update",
  upload.single("file"),
  updatePDFMetadataController
);

router.post(
  "/organize",
  upload.single("file"),
  organizePDFController
);

router.post(
  "/annotate",
  upload.single("file"),
  annotatePDFController
);

// router.post(
//   "/page-numbers",
//   upload.single("file"),
//   addPageNumbersController
// );

router.post(
  "/page-numbers",
  upload.single("file"),
  addPageNumbersController
);


export default router;