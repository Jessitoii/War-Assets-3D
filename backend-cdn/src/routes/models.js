const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect, rateLimitMiddleware } = require('../middleware/auth');
const storageService = require('../services/storage');

/**
 * @route POST /api/models/upload
 * @desc Upload a 3D model to R2
 */
router.post('/upload', protect, rateLimitMiddleware, upload.single('model'), async (req, res) => {
  try {
    const { assetId, version } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!assetId || !version) {
      return res.status(400).json({ error: 'assetId and version are required' });
    }

    // Semantic versioning check recommended for production
    if (!/^\d+\.\d+\.\d+$/.test(version)) {
        return res.status(400).json({ error: 'Version must be in semver format (e.g. 1.0.0)' });
    }

    const result = await storageService.uploadModel(
      assetId,
      version,
      req.file.buffer,
      req.file.originalname
    );

    res.status(201).json({
      message: 'Model uploaded successfully',
      data: result,
    });
  } catch (error) {
    console.error('Upload Route Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/models
 * @desc List all models in storage
 */
router.get('/', async (req, res) => {
  try {
    const models = await storageService.listModels();
    res.json(models);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/models/secure-url/:key
 * @desc Get a temporary signed URL for a specific asset
 */
router.get('/secure-url/*key', async (req, res) => {
    try {
        const key = req.params.key; // Gets full path after secure-url/
        const url = await storageService.getSecureUrl(key);
        res.json({ url });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
