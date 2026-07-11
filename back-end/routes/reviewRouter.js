const express = require('express');
const router = express.Router();
const reviewController = require('../controller/ReviewController');

router.post('/addReview', reviewController.addReview);
router.get('/getReviewsByProduct/:productId', reviewController.getReviewsByProduct);
router.delete('/deleteReview/:reviewId', reviewController.deleteReview);
router.patch('/updateStatus/:reviewId', reviewController.updateReviewStatus);
router.get('/', reviewController.getAllReviews);  // GET /api/review

module.exports = router;