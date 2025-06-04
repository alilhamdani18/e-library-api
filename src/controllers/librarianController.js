const bcrypt = require('bcryptjs');
const { db, userProfileBucket } = require('../config/firebase');
const { uploadFile, deleteFile } = require('../utils/storage');

// Initialize default librarian (run once)
const initializeDefaultLibrarian = async () => {
  try {
    const defaultEmail = process.env.DEFAULT_LIBRARIAN_EMAIL;
    const defaultPassword = process.env.DEFAULT_LIBRARIAN_PASSWORD;

    // Check if default librarian already exists
    const snapshot = await db.collection('librarians')
      .where('email', '==', defaultEmail)
      .get();

    if (snapshot.empty) {
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      
      const librarianData = {
        name: 'Default Librarian',
        email: defaultEmail,
        password: hashedPassword,
        phone: '',
        address: '',
        bio: '',
        profileImageUrl: null,
        role: 'librarian',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection('librarians').add(librarianData);
      console.log('Default librarian created successfully');
    }
  } catch (error) {
    console.error('Error initializing default librarian:', error);
  }
};

// Call initialization
initializeDefaultLibrarian();

// Get librarian profile
const getLibrarianProfile = async (req, res) => {
  try {
    const { librarianId } = req.params;
    const doc = await db.collection('librarians').doc(librarianId).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Librarian not found' });
    }

    const librarianData = doc.data();
    // Remove password from response
    delete librarianData.password;

    res.json({
      success: true,
      data: { id: doc.id, ...librarianData }
    });
  } catch (error) {
    console.error('Error getting librarian profile:', error);
    res.status(500).json({ error: 'Failed to get librarian profile' });
  }
};

// Update librarian profile
const updateLibrarianProfile = async (req, res) => {
  try {
    const { librarianId } = req.params;
    const { name, email, phone, address, bio } = req.body;

    const librarianRef = db.collection('librarians').doc(librarianId);
    const doc = await librarianRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Librarian not found' });
    }

    const currentData = doc.data();
    let profileImageUrl = currentData.profileImageUrl;

    // Upload new profile image if provided
    if (req.file) {
      // Delete old profile image if exists
      if (currentData.profileImageUrl) {
        await deleteFile(userProfileBucket, currentData.profileImageUrl);
      }
      profileImageUrl = await uploadFile(userProfileBucket, req.file, 'librarians');
    }

    const updateData = {
      name: name || currentData.name,
      email: email || currentData.email,
      phone: phone || currentData.phone,
      address: address || currentData.address,
      bio: bio || currentData.bio,
      profileImageUrl,
      updatedAt: new Date()
    };

    await librarianRef.update(updateData);

    // Remove password from response
    delete updateData.password;

    res.json({
      success: true,
      message: 'Librarian profile updated successfully',
      data: { id: librarianId, ...updateData }
    });
  } catch (error) {
    console.error('Error updating librarian profile:', error);
    res.status(500).json({ error: 'Failed to update librarian profile' });
  }
};

// Change librarian password
const changeLibrarianPassword = async (req, res) => {
  try {
    const { librarianId } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    const librarianRef = db.collection('librarians').doc(librarianId);
    const doc = await librarianRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Librarian not found' });
    }

    const librarianData = doc.data();

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, librarianData.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await librarianRef.update({
      password: hashedNewPassword,
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing librarian password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

// Get dashboard statistics (for librarian dashboard)
const getDashboardStats = async (req, res) => {
  try {
    // Get total books
    const booksSnapshot = await db.collection('books').get();
    const totalBooks = booksSnapshot.size;

    // Get available books
    let availableBooks = 0;
    booksSnapshot.forEach(doc => {
      const bookData = doc.data();
      availableBooks += bookData.availableStock || 0;
    });

    // Get total users
    const usersSnapshot = await db.collection('users').get();
    const totalUsers = usersSnapshot.size;

    // Get pending loans
    const pendingLoansSnapshot = await db.collection('loans')
      .where('status', '==', 'pending')
      .get();
    const pendingLoans = pendingLoansSnapshot.size;

    // Get active loans
    const activeLoansSnapshot = await db.collection('loans')
      .where('status', '==', 'approved')
      .get();
    const activeLoans = activeLoansSnapshot.size;

    // Get overdue loans
    const today = new Date();
    const overdueLoansList = [];
    activeLoansSnapshot.forEach(doc => {
      const loanData = doc.data();
      if (loanData.dueDate && loanData.dueDate.toDate() < today) {
        overdueLoansList.push(doc.id);
      }
    });

    res.json({
      success: true,
      data: {
        totalBooks,
        availableBooks,
        totalUsers,
        pendingLoans,
        activeLoans,
        overdueLoans: overdueLoansList.length
      }
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ error: 'Failed to get dashboard statistics' });
  }
};

module.exports = {
  getLibrarianProfile,
  updateLibrarianProfile,
  changeLibrarianPassword,
  getDashboardStats
};