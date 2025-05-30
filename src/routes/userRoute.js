const express = require('express');
const multer = require('multer');
const {
  getAllUsers,
  getUserProfile,
  updateUserProfile,
  changeUserPassword,
  getUserLoanHistory,
  getUserCurrentLoans
} = require('../controllers/userController');

const router = express.Router();

// Configure multer for profile image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit for profile images
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

router.get('/', getAllUsers);


// User profile routes
router.get('/profile/:userId', getUserProfile);
router.put('/profile/:userId', upload.single('profileImage'), updateUserProfile);
router.put('/password/:userId', changeUserPassword);

// User loan routes
router.get('/loans/:userId', getUserLoanHistory);
router.get('/current-loans/:userId', getUserCurrentLoans);

module.exports = router;