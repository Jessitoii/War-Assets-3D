require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  apiKey: process.env.API_KEY,
  storage: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    endpoint: process.env.R2_ENDPOINT,
    bucket: process.env.R2_BUCKET_NAME,
    cdnDomain: process.env.CDN_DOMAIN,
  },
};
