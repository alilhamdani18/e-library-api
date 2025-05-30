const express = require('express');
const multer = require('multer');
const {
  getLibrarianProfile,
  updateLibrarianProfile,
  changeLibrarianPassword,
  getDashboardStats
} = require('../controllers/librarianController');

const router = express.Router();

// Configure multer for profile image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 2MB limit for profile images
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Librarian profile routes
router.get('/profile/:librarianId', getLibrarianProfile);
router.put('/profile/:librarianId', upload.single('profileImage'), updateLibrarianProfile);
router.put('/password/:librarianId', changeLibrarianPassword);

// Dashboard route
router.get('/dashboard/stats', getDashboardStats);

module.exports = router;