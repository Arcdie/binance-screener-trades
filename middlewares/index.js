const express = require('express');
const bodyParser = require('body-parser');

require('./utils/set-env');

const morgan = require('../libs/morgan');
const log = require('../libs/logger')(module);

require('../libs/redis');
require('../libs/mongodb');

module.exports = (async () => {
  await require('./utils/set-models')();

  const app = express();

  // bodyParser
  app.use(bodyParser.json({}));
  app.use(bodyParser.urlencoded({
    extended: false,
  }));

  app.use(morgan);

  app.use('/', require('../routes'));

  // Error handing
  app.use((req, res) => {
    res.sendStatus(404);
  });

  app.use((err, req, res, next) => {
    log.warn(err);

    if (req.method === 'GET') {
      res.sendStatus(500);
    } else {
      res.sendStatus(500);
    }
  });

  process.on('uncaughtException', (err) => {
    if (err.code === 'ECONNREFUSED') {
      return true;
    }

    log.error(err);
    process.exit(1);
  });

  return app;
});
