const moment = require('moment');
const winston = require('winston');
const colors = require('colors/safe');

const {
  COLORS_FOR_LEVELS,
} = require('./constants');

const {
  app: { name },
} = require('../../config');

const {
  format: {
    combine,
    timestamp,
    printf,
  },

  transports,
} = winston;

const fileFormat = options => {
  return combine(
    timestamp(),
    printf(logObj => {
      return JSON.stringify({
        ...logObj,
        ...options,
      });
    }),
  );
};

const consoleFormat = options => {
  return combine(
    timestamp(),
    printf(data => {
      const level = data[Object.getOwnPropertySymbols(data)[0]];
      const colorfullLevel = colors[COLORS_FOR_LEVELS[level]](level);

      let returnStr = `${colorfullLevel}: ${data.message}`;

      if (level !== 'info') {
        returnStr += `\n${options.filePath}`;
      }

      return returnStr;
    }),
  );
};

class Logger {
  constructor(logModule) {
    this.filePath = logModule.id
      .split(name)[1];
      // .replace('.js', '');

    const options = {
      filePath: this.filePath,
    };

    this.winston = winston.createLogger({
      transports: [
        new transports.Console({
          level: 'debug',
          format: consoleFormat(options),
        }),

        new transports.File({
          level: 'error',
          name: 'error-log',
          filename: './logs/error.log',
          format: fileFormat(options),
        }),

        new transports.File({
          level: 'debug',
          name: 'debug-log',
          filename: './logs/debug.log',
          format: fileFormat(options),
        }),
      ],
    });
  }

  info(ctx) {
    this.winston.info({
      message: ctx,
      level: 'info',
    });
  }

  warn(ctx) {
    this.winston.debug({
      message: ctx,
      level: 'debug',
    });
  }

  error(ctx) {
    this.winston.error({
      message: ctx,
      level: 'error',
    });
  }
}

module.exports = logModule => new Logger(logModule);
