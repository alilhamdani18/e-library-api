const { auth, db } = require('../config/firebase');

// Middleware autentikasi
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Akses ditolak. Token tidak tersedia' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    
    next();
  } catch (error) {
    console.error('Error autentikasi:', error);
    return res.status(401).json({ 
      status: 'error', 
      message: 'Akses ditolak. Token tidak valid' 
    });
  }
};

// Middleware untuk memeriksa peran pustakawan
const isLibrarian = async (req, res, next) => {
  try {
    const userRef = db.collection('users').doc(req.user.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Pengguna tidak ditemukan' 
      });
    }
    
    const userData = userDoc.data();
    
    if (userData.role !== 'librarian') {
      return res.status(403).json({ 
        status: 'error', 
        message: 'Akses ditolak. Hanya pustakawan yang diizinkan' 
      });
    }
    
    next();
  } catch (error) {
    console.error('Error memeriksa peran:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: 'Terjadi kesalahan saat memeriksa peran pengguna' 
    });
  }
};

module.exports = {
  authenticate,
  isLibrarian
};