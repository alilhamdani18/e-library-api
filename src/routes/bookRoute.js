const express = require('express');
const multer = require('multer');
const {
  addBook,
  getAllBooks,
  getBookById,
  updateBook,
  deleteBook,
  addBookmark,
  removeBookmark,
  getUserBookmarks,
  addRating,
  updateRating,
  deleteRating,
  getUserRatings
} = require('../controllers/bookController');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Book management routes 
router.post('/', upload.single('cover'), addBook);
router.get('/', getAllBooks);
router.get('/:id', getBookById);
router.put('/:id', upload.single('cover'), updateBook);
router.delete('/:id', deleteBook);

// Bookmark routes (User)
router.post('/:userId/bookmarks', addBookmark);
router.delete('/:userId/bookmarks', removeBookmark);
router.get('/:userId/bookmarks', getUserBookmarks);

// Rating routes (User)
router.post('/:userId/ratings', addRating);
router.put('/:userId/:bookId/ratings', updateRating);
router.delete('/:userId/:bookId/ratings', deleteRating);
router.get('/:userId/ratings', getUserRatings);
;

module.exports = router;