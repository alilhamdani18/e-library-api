const { db, bookCoverBucket } = require('../config/firebase');
const { uploadFile, deleteFile } = require('../utils/storage');

// Add new book
const addBook = async (req, res) => {
  try {
    const { title, author, year, description, category, stock, pages } = req.body;
    let coverUrl = null;

    // Upload cover image if provided
    if (req.file) {
      coverUrl = await uploadFile(bookCoverBucket, req.file, 'covers');
    }

    const bookData = {
      title,
      author,
      year,
      description,
      category,
      stock: parseInt(stock),
      availableStock: parseInt(stock),
      pages,
      coverUrl,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await db.collection('books').add(bookData);
    
    res.status(201).json({
      success: true,
      message: 'Book added successfully',
      data: { id: docRef.id, ...bookData }
    });
  } catch (error) {
    console.error('Error adding book:', error);
    res.status(500).json({ error: 'Failed to add book' });
  }
};

// Get all books
const getAllBooks = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 10 } = req.query;
    let query = db.collection('books');

    // Filter by category
    if (category) {
      query = query.where('category', '==', category);
    }

    const snapshot = await query.get();
    let books = [];

    snapshot.forEach(doc => {
      const bookData = doc.data();
      
      // Search functionality
      if (search) {
        const searchTerm = search.toLowerCase();
        if (bookData.title.toLowerCase().includes(searchTerm) ||
            bookData.author.toLowerCase().includes(searchTerm)) {
          books.push({ id: doc.id, ...bookData });
        }
      } else {
        books.push({ id: doc.id, ...bookData });
      }
    });

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedBooks = books.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedBooks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalItems: books.length,
        totalPages: Math.ceil(books.length / limit)
      }
    });
  } catch (error) {
    console.error('Error getting books:', error);
    res.status(500).json({ error: 'Failed to get books' });
  }
};

// Get book by ID
const getBookById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('books').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json({
      success: true,
      data: { id: doc.id, ...doc.data() }
    });
  } catch (error) {
    console.error('Error getting book:', error);
    res.status(500).json({ error: 'Failed to get book' });
  }
};

// Update book
const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author, year, description, category, stock , pages} = req.body;

    const bookRef = db.collection('books').doc(id);
    const doc = await bookRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const currentData = doc.data();
    let coverUrl = currentData.coverUrl;

    // Upload new cover if provided
    if (req.file) {
      // Delete old cover if exists
      if (currentData.coverUrl) {
        await deleteFile(bookCoverBucket, currentData.coverUrl);
      }
      coverUrl = await uploadFile(bookCoverBucket, req.file, 'covers');
    }

    const updateData = {
      title: title || currentData.title,
      author: author || currentData.author,
      year: year || currentData.year,
      description: description || currentData.description,
      category: category || currentData.category,
      stock: stock ? parseInt(stock) : currentData.stock,
      pages: pages || currentData.pages,
      coverUrl,
      updatedAt: new Date()
    };

    // Update available stock if total stock changed
    if (stock) {
      const stockDifference = parseInt(stock) - currentData.stock;
      updateData.availableStock = currentData.availableStock + stockDifference;
    }

    await bookRef.update(updateData);

    res.json({
      success: true,
      message: 'Book updated successfully',
      data: { id, ...updateData }
    });
  } catch (error) {
    console.error('Error updating book:', error);
    res.status(500).json({ error: 'Failed to update book' });
  }
};

// Delete book
const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    const bookRef = db.collection('books').doc(id);
    const doc = await bookRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const bookData = doc.data();

    // Delete cover image if exists
    if (bookData.coverUrl) {
      await deleteFile(bookCoverBucket, bookData.coverUrl);
    }

    await bookRef.delete();

    res.json({
      success: true,
      message: 'Book deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ error: 'Failed to delete book' });
  }
};

// User functions for bookmarks and ratings
const addBookmark = async (req, res) => {
  try {
    const { userId, bookId } = req.body;

    // Cek dulu apakah bookmark sudah ada
    const existing = await db.collection('bookmarks')
      .where('userId', '==', userId)
      .where('bookId', '==', bookId)
      .limit(1)
      .get();

    if (!existing.empty) {
      return res.status(400).json({
        success: false,
        message: 'Bookmark for this book already exists'
      });
    }

    const bookmarkData = {
      userId,
      bookId,
      createdAt: new Date()
    };

    await db.collection('bookmarks').add(bookmarkData);

    res.status(201).json({
      success: true,
      message: 'Book bookmarked successfully'
    });
  } catch (error) {
    console.error('Error adding bookmark:', error);
    res.status(500).json({ error: 'Failed to add bookmark' });
  }
};

const removeBookmark = async (req, res) => {
  try {
    const { userId, bookId } = req.body;

    const snapshot = await db.collection('bookmarks')
      .where('userId', '==', userId)
      .where('bookId', '==', bookId)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }

    // Tunggu semua delete selesai, pastikan hanya hapus bookmark spesifik
    await Promise.all(snapshot.docs.map(doc => doc.ref.delete()));

    res.json({
      success: true,
      message: 'Bookmark removed successfully'
    });
  } catch (error) {
    console.error('Error removing bookmark:', error);
    res.status(500).json({ error: 'Failed to remove bookmark' });
  }
};

const getUserBookmarks = async (req, res) => {
  try {
    const { userId } = req.params;

    const snapshot = await db.collection('bookmarks')
      .where('userId', '==', userId)
      .get();

    const bookmarks = [];
    for (const doc of snapshot.docs) {
      const bookmarkData = doc.data();
      const bookDoc = await db.collection('books').doc(bookmarkData.bookId).get();

      if (bookDoc.exists) {
        bookmarks.push({
          bookmarkId: doc.id,  // Id dari dokumen bookmark, kalau perlu di hapus nanti
          book: { id: bookDoc.id, ...bookDoc.data() },
          createdAt: bookmarkData.createdAt
        });
      }
    }

    res.json({
      success: true,
      data: bookmarks
    });
  } catch (error) {
    console.error('Error getting bookmarks:', error);
    res.status(500).json({ error: 'Failed to get bookmarks' });
  }
};

// Add or create new rating (dengan validasi 1 rating per buku per user)
const addRating = async (req, res) => {
  try {
    const { userId, bookId, rating, review } = req.body;

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Cek apakah rating sudah ada
    const existingSnapshot = await db.collection('ratings')
      .where('userId', '==', userId)
      .where('bookId', '==', bookId)
      .limit(1)
      .get();

    if (!existingSnapshot.empty) {
      return res.status(400).json({
        success: false,
        message: 'User has already rated this book'
      });
    }

    const ratingData = {
      userId,
      bookId,
      rating: parseInt(rating),
      review: review || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('ratings').add(ratingData);

    res.status(201).json({
      success: true,
      message: 'Rating added successfully'
    });
  } catch (error) {
    console.error('Error adding rating:', error);
    res.status(500).json({ error: 'Failed to add rating' });
  }
};

// Update existing rating
const updateRating = async (req, res) => {
  try {
    const { userId, bookId } = req.params;
    const { rating, review } = req.body;

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const snapshot = await db.collection('ratings')
      .where('userId', '==', userId)
      .where('bookId', '==', bookId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'Rating not found' });
    }

    const ratingDoc = snapshot.docs[0];
    const updateData = {
      updatedAt: new Date()
    };

    if (rating !== undefined) updateData.rating = parseInt(rating);
    if (review !== undefined) updateData.review = review;

    await ratingDoc.ref.update(updateData);

    res.json({
      success: true,
      message: 'Rating updated successfully'
    });
  } catch (error) {
    console.error('Error updating rating:', error);
    res.status(500).json({ error: 'Failed to update rating' });
  }
};

// Delete rating
const deleteRating = async (req, res) => {
  try {
    const { userId, bookId } = req.params;

    const snapshot = await db.collection('ratings')
      .where('userId', '==', userId)
      .where('bookId', '==', bookId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'Rating not found' });
    }

    const ratingDoc = snapshot.docs[0];
    await ratingDoc.ref.delete();

    res.json({
      success: true,
      message: 'Rating deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting rating:', error);
    res.status(500).json({ error: 'Failed to delete rating' });
  }
};



const getUserRatings = async (req, res) => {
  try {
    const { userId } = req.params;

    const snapshot = await db.collection('ratings')
      .where('userId', '==', userId)
      .get();

    const ratings = [];
    for (const doc of snapshot.docs) {
      const ratingData = doc.data();
      const bookDoc = await db.collection('books').doc(ratingData.bookId).get();
      
      if (bookDoc.exists) {
        ratings.push({
          id: doc.id,
          book: { id: bookDoc.id, ...bookDoc.data() },
          rating: ratingData.rating,
          review: ratingData.review,
          createdAt: ratingData.createdAt
        });
      }
    }

    res.json({
      success: true,
      data: ratings
    });
  } catch (error) {
    console.error('Error getting ratings:', error);
    res.status(500).json({ error: 'Failed to get ratings' });
  }
};

module.exports = {
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
};