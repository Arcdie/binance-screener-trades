const mongoose = require('mongoose');

const { mongodbConf } = require('../config');

const log = require('./logger')(module);

mongoose.Promise = global.Promise;

mongoose.connect(mongodbConf.url, mongodbConf.options)
  .then(() => log.info('Connection to mongoDB is successful'))
  .catch(err => log.error(err));

module.exports = mongoose;
