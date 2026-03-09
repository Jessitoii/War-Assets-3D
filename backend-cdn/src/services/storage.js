const { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const config = require('../config');

const s3Client = new S3Client({
  region: 'auto',
  endpoint: config.storage.endpoint,
  credentials: {
    accessKeyId: config.storage.accessKeyId,
    secretAccessKey: config.storage.secretAccessKey,
  },
});

/**
 * Generates a SHA-256 checksum for the file buffer.
 */
function calculateChecksum(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Uploads a GLB file to R2 with versioning in path.
 * Path: models/{assetId}/{version}/{assetId}.glb
 */
async function uploadModel(assetId, version, buffer, originalName) {
  const checksum = calculateChecksum(buffer);
  const key = `models/${assetId}/${version}/${assetId}.glb`;

  const params = {
    Bucket: config.storage.bucket,
    Key: key,
    Body: buffer,
    ContentType: 'model/gltf-binary',
    Metadata: {
      'checksum-sha256': checksum,
      'original-name': originalName,
      'version': version,
    },
    // Production Practice: Set Cache-Control at the origin for the CDN to pick up
    CacheControl: 'public, max-age=31536000, immutable',
  };

  try {
    await s3Client.send(new PutObjectCommand(params));
    
    return {
      success: true,
      key,
      checksum,
      url: `${config.storage.cdnDomain}/${key}`,
    };
  } catch (error) {
    console.error('R2 Upload Error:', error);
    throw new Error('Failed to upload file to storage.');
  }
}

/**
 * Generates a signed URL for secure access if bucket is private.
 */
async function getSecureUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: config.storage.bucket,
    Key: key,
  });
  
  return await getSignedUrl(s3Client, command, { expiresIn });
}

async function listModels() {
  const params = {
    Bucket: config.storage.bucket,
    Prefix: 'models/',
  };

  try {
    const data = await s3Client.send(new ListObjectsV2Command(params));
    return data.Contents || [];
  } catch (error) {
    console.error('R2 Listing Error:', error);
    throw new Error('Failed to list assets.');
  }
}

module.exports = {
  uploadModel,
  listModels,
  getSecureUrl,
  calculateChecksum,
};
