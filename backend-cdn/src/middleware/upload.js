const multer = require('multer');
const path = require('path');

// Configure memory storage because we will upload to R2 directly
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for GLB models
  },
  fileFilter: (req, file, cb) => {
    // 1. Validate Extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.glb') {
      return cb(new Error('Only .glb files are allowed!'), false);
    }

    // 2. Validate MIME Type
    // Note: Some browsers might send different types, but we prefer model/gltf-binary
    if (file.mimetype !== 'model/gltf-binary' && file.mimetype !== 'application/octet-stream') {
        // We allow octet-stream as fallback but log it
        console.warn(`Incoming MIME type for ${file.originalname}: ${file.mimetype}`);
    }

    cb(null, true);
  },
});

module.exports = upload;
