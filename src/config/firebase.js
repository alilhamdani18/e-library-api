const admin = require('firebase-admin');
const { Firestore } = require('@google-cloud/firestore');
const { Storage } = require('@google-cloud/storage');
const path = require('path');
require('dotenv').config(); // pastikan dotenv dipanggil

// Resolve path dari .env
const serviceAccountPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH);
const serviceAccount = require(serviceAccountPath);

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
});

// Initialize Firestore
const db = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: serviceAccountPath
});

// Initialize Cloud Storage
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: serviceAccountPath
});

// Get bucket references
const bookCoverBucket = storage.bucket(process.env.BOOK_COVER_BUCKET);
const userProfileBucket = storage.bucket(process.env.USER_PROFILE_BUCKET);

module.exports = {
  admin,
  db,
  storage,
  bookCoverBucket,
  userProfileBucket
};
