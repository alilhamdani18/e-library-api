const bcrypt = require('bcryptjs');
const { db, userProfileBucket } = require('../config/firebase');
const { uploadFile, deleteFile } = require('../utils/storage');

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();

    const users = snapshot.docs.map(doc => {
      const userData = doc.data();
      delete userData.password; // Hilangkan password dari response
      return {
        id: doc.id,
        ...userData
      };
    });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error getting all users:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
};


// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const doc = await db.collection('users').doc(userId).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = doc.data();
    // Remove password from response
    delete userData.password;

    res.json({
      success: true,
      data: { id: doc.id, ...userData }
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
};

// Update user profile
const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, phone, address } = req.body;

    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentData = doc.data();
    let profileImageUrl = currentData.profileImageUrl;

    // Upload new profile image if provided
    if (req.file) {
      // Delete old profile image if exists
      if (currentData.profileImageUrl) {
        await deleteFile(userProfileBucket, currentData.profileImageUrl);
      }
      profileImageUrl = await uploadFile(userProfileBucket, req.file, 'users');
    }

    const updateData = {
      name: name || currentData.name,
      email: email || currentData.email,
      phone: phone || currentData.phone,
      address: address || currentData.address,
      profileImageUrl,
      updatedAt: new Date()
    };

    await userRef.update(updateData);

    // Remove password from response
    delete updateData.password;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { id: userId, ...updateData }
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Change user password
const changeUserPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = doc.data();

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userData.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await userRef.update({
      password: hashedNewPassword,
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

// Get user loan history
const getUserLoanHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    const snapshot = await db.collection('loans')
      .where('userId', '==', userId)
      .orderBy('requestDate', 'desc')
      .get();

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
    console.error('Error getting loan history:', error);
    res.status(500).json({ error: 'Failed to get loan history' });
  }
};

// Get user current loans (approved books)
const getUserCurrentLoans = async (req, res) => {
  try {
    const { userId } = req.params;

    const snapshot = await db.collection('loans')
      .where('userId', '==', userId)
      .where('status', '==', 'approved')
      .orderBy('approvedDate', 'desc')
      .get();

    const loans = [];
    for (const doc of snapshot.docs) {
      const loanData = doc.data();
      const bookDoc = await db.collection('books').doc(loanData.bookId).get();

      // Calculate days remaining
      const today = new Date();
      const dueDate = loanData.dueDate.toDate();
      const daysRemaining = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

      loans.push({
        id: doc.id,
        ...loanData,
        book: bookDoc.exists ? { id: bookDoc.id, ...bookDoc.data() } : null,
        daysRemaining: daysRemaining,
        isOverdue: daysRemaining < 0
      });
    }

    res.json({
      success: true,
      data: loans
    });
  } catch (error) {
    console.error('Error getting current loans:', error);
    res.status(500).json({ error: 'Failed to get current loans' });
  }
};

module.exports = {
  getAllUsers,
  getUserProfile,
  updateUserProfile,
  changeUserPassword,
  getUserLoanHistory,
  getUserCurrentLoans
};