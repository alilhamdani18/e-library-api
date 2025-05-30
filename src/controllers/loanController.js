const { db } = require('../config/firebase');

// Request loan (User)
const requestLoan = async (req, res) => {
  try {
    const { userId, bookId, loanDuration } = req.body;

    // Check if book exists and is available
    const bookRef = db.collection('books').doc(bookId);
    const bookDoc = await bookRef.get();

    if (!bookDoc.exists) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const bookData = bookDoc.data();
    if (bookData.availableStock <= 0) {
      return res.status(400).json({ error: 'Book is not available for loan' });
    }

    // Check if user already has pending or active loan for this book
    const existingLoanSnapshot = await db.collection('loans')
      .where('userId', '==', userId)
      .where('bookId', '==', bookId)
      .where('status', 'in', ['pending', 'approved'])
      .get();

    if (!existingLoanSnapshot.empty) {
      return res.status(400).json({ error: 'You already have an active loan request for this book' });
    }

    const loanData = {
      userId,
      bookId,
      loanDuration: parseInt(loanDuration), // 7, 14, or 21 days
      status: 'pending',
      requestDate: new Date(),
      approvedDate: null,
      dueDate: null,
      returnDate: null,
      librarianId: null
    };

    const docRef = await db.collection('loans').add(loanData);

    res.status(201).json({
      success: true,
      message: 'Loan request submitted successfully',
      data: { id: docRef.id, ...loanData }
    });
  } catch (error) {
    console.error('Error requesting loan:', error);
    res.status(500).json({ error: 'Failed to request loan' });
  }
};

// Get all loans (Librarian)
const getAllLoans = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    let query = db.collection('loans');

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.orderBy('requestDate', 'desc').get();
    const loans = [];

    for (const doc of snapshot.docs) {
      const loanData = doc.data();
      
      // Get book and user details
      const bookDoc = await db.collection('books').doc(loanData.bookId).get();
      const userDoc = await db.collection('users').doc(loanData.userId).get();

      loans.push({
        id: doc.id,
        ...loanData,
        book: bookDoc.exists ? { id: bookDoc.id, ...bookDoc.data() } : null,
        user: userDoc.exists ? { id: userDoc.id, ...userDoc.data() } : null
      });
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedLoans = loans.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedLoans,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalItems: loans.length,
        totalPages: Math.ceil(loans.length / limit)
      }
    });
  } catch (error) {
    console.error('Error getting loans:', error);
    res.status(500).json({ error: 'Failed to get loans' });
  }
};

// Get user loans
const getUserLoans = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    let query = db.collection('loans').where('userId', '==', userId);
    
    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.orderBy('requestDate', 'desc').get();
    const loans = [];

    for (const doc of snapshot.docs) {
      const loanData = doc.data();
      const bookDoc = await db.collection('books').doc(loanData.bookId).get();

      loans.push({
        id: doc.id,
        ...loanData,
        book: bookDoc.exists ? { id: bookDoc.id, ...bookDoc.data() } : null
      });
    }

    res.json({
      success: true,
      data: loans
    });
  } catch (error) {
    console.error('Error getting user loans:', error);
    res.status(500).json({ error: 'Failed to get user loans' });
  }
};

// Approve loan (Librarian)
const approveLoan = async (req, res) => {
  try {
    const { id } = req.params;
    const { librarianId } = req.body;

    const loanRef = db.collection('loans').doc(id);
    const loanDoc = await loanRef.get();

    if (!loanDoc.exists) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loanData = loanDoc.data();

    if (loanData.status !== 'pending') {
      return res.status(400).json({ error: 'Loan is not pending approval' });
    }

    // Check book availability
    const bookRef = db.collection('books').doc(loanData.bookId);
    const bookDoc = await bookRef.get();
    const bookData = bookDoc.data();

    if (bookData.availableStock <= 0) {
      return res.status(400).json({ error: 'Book is no longer available' });
    }

    // Calculate due date
    const approvedDate = new Date();
    const dueDate = new Date(approvedDate);
    dueDate.setDate(dueDate.getDate() + loanData.loanDuration);

    // Update loan
    await loanRef.update({
      status: 'approved',
      approvedDate,
      dueDate,
      librarianId
    });

    // Update book stock
    await bookRef.update({
      availableStock: bookData.availableStock - 1
    });

    res.json({
      success: true,
      message: 'Loan approved successfully'
    });
  } catch (error) {
    console.error('Error approving loan:', error);
    res.status(500).json({ error: 'Failed to approve loan' });
  }
};

// Reject loan (Librarian)
const rejectLoan = async (req, res) => {
  try {
    const { id } = req.params;
    const { librarianId, reason } = req.body;

    const loanRef = db.collection('loans').doc(id);
    const loanDoc = await loanRef.get();

    if (!loanDoc.exists) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loanData = loanDoc.data();

    if (loanData.status !== 'pending') {
      return res.status(400).json({ error: 'Loan is not pending approval' });
    }

    await loanRef.update({
      status: 'rejected',
      rejectedDate: new Date(),
      rejectionReason: reason || '',
      librarianId
    });

    res.json({
      success: true,
      message: 'Loan rejected successfully'
    });
  } catch (error) {
    console.error('Error rejecting loan:', error);
    res.status(500).json({ error: 'Failed to reject loan' });
  }
};

// Return book (Librarian)
const returnBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { librarianId } = req.body;

    const loanRef = db.collection('loans').doc(id);
    const loanDoc = await loanRef.get();

    if (!loanDoc.exists) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loanData = loanDoc.data();

    if (loanData.status !== 'approved') {
      return res.status(400).json({ error: 'Book is not currently loaned' });
    }

    // Update loan
    await loanRef.update({
      status: 'returned',
      returnDate: new Date(),
      returnLibrarianId: librarianId
    });

    // Update book stock
    const bookRef = db.collection('books').doc(loanData.bookId);
    const bookDoc = await bookRef.get();
    const bookData = bookDoc.data();

    await bookRef.update({
      availableStock: bookData.availableStock + 1
    });

    res.json({
      success: true,
      message: 'Book returned successfully'
    });
  } catch (error) {
    console.error('Error returning book:', error);
    res.status(500).json({ error: 'Failed to return book' });
  }
};

module.exports = {
  requestLoan,
  getAllLoans,
  getUserLoans,
  approveLoan,
  rejectLoan,
  returnBook
};