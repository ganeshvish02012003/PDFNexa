import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(
  process.cwd(),
  "uploads"
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(
      file.originalname
    );

    const uniqueName =
      `${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}${extension}`;

    cb(null, uniqueName);
  },
});

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
];

const fileFilter = (
  req,
  file,
  cb
) => {
  if (
    allowedMimeTypes.includes(
      file.mimetype
    )
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only JPG, JPEG and PNG images are allowed"
      ),
      false
    );
  }
};

const imageUpload = multer({
  storage,

  fileFilter,

  limits: {
    files: 30,

    fileSize:
      50 * 1024 * 1024,
  },
});

export default imageUpload;