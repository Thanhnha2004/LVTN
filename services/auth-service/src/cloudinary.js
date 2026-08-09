const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

const ALLOWED_AVATAR_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "bds-platform/avatars",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      { width: 400, height: 400, crop: "fill", gravity: "face" },
    ],
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_AVATAR_SIZE_BYTES, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!ALLOWED_AVATAR_MIME_TYPES.has(file.mimetype)) {
      const error = new Error("Chỉ chấp nhận ảnh đại diện JPG, PNG hoặc WEBP");
      error.code = "INVALID_IMAGE_TYPE";
      return callback(error);
    }
    return callback(null, true);
  },
});

module.exports = { cloudinary, upload };
