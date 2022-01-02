const router = require('express').Router();

const fileControllers = require('../controllers/files');

router.get('/download-agg-trades', fileControllers.downloadAggTradesFolder);

module.exports = router;
