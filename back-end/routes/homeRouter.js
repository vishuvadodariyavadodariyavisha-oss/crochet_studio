// routes/homeRoute.js

const express = require('express');
const router = express.Router();

const { getHomeData } = require('../controller/homeController');

// GET /api/home
router.get('/home', getHomeData);

module.exports = router;