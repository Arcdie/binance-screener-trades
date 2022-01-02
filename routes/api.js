const router = require('express').Router();

// router.use('/logs', require('./logs'));
router.use('/files', require('./files'));

module.exports = router;
