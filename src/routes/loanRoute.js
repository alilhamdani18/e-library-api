const express = require('express');
const {
  requestLoan,
  getAllLoans,
  getUserLoans,
  approveLoan,
  rejectLoan,
  returnBook
} = require('../controllers/loanController');

const router = express.Router();

// Loan request routes
router.post('/', requestLoan); // User requests loan
router.get('/', getAllLoans); // Librarian views all loans
router.get('/user/:userId', getUserLoans); // Get loans for specific user

// Loan management routes (Librarian)
router.put('/:id/approve', approveLoan);
router.put('/:id/reject', rejectLoan);
router.put('/:id/return', returnBook);

module.exports = router;