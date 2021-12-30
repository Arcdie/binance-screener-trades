const fs = require('fs');
const path = require('path');
const moment = require('moment');

const log = require('../../../libs/logger')(module);

const {
  modelSchemasForInstruments,
} = require('../../models/constants');

const {
  sendPrivateData,
} = require('../../../websocket/websocket-server');

const getTrades = async ({
  instrumentName,

  startDate,
  endDate,

  socketId,
}) => {
  try {
    if (!instrumentName) {
      return {
        status: false,
        message: 'No instrumentName',
      };
    }

    if (!startDate || !moment(startDate).isValid()) {
      return {
        status: false,
        message: 'No or invalid startDate',
      };
    }

    if (!endDate || !moment(endDate).isValid()) {
      return {
        status: false,
        message: 'No or invalid endDate',
      };
    }

    if (!socketId) {
      return {
        status: false,
        message: 'No socketId',
      };
    }

    const validStartDate = moment(startDate).utc().startOf('day');
    const validEndDate = moment(endDate).utc().startOf('day');

    const todayStartOfDayUnix = moment().utc().startOf('day').unix();

    const endDateUnix = validEndDate.unix();

    const targetDates = [];
    const tmpDate = moment(validStartDate);

    while (1) {
      const tmpDateUnix = tmpDate.unix();

      targetDates.push({
        dateUnix: tmpDateUnix,
        date: moment(tmpDate),
        day: moment(tmpDate).format('DD'),
        month: moment(tmpDate).format('MM'),
        year: moment(tmpDate).format('YYYY'),
      });

      tmpDate.add(1, 'days');

      if (tmpDateUnix === endDateUnix) {
        break;
      }
    }

    const pathToFilesFolder = path.join(__dirname, `../../../files/aggTrades/${instrumentName}`);

    for await (const targetDate of targetDates) {
      if (targetDate.dateUnix === todayStartOfDayUnix) {
        const Trade = modelSchemasForInstruments.get(instrumentName);

        if (!Trade) {
          sendPrivateData({
            socketId,

            data: {
              status: true,
              startOfDayUnix: targetDate.dateUnix,
              result: [],
            },
          });

          continue;
        }

        const match = {
          $and: [{
            time: { $gte: moment(targetDate.date) },
          }, {
            time: { $lt: moment(targetDate.date).add(1, 'days') },
          }],
        };

        const periodTrades = await Trade
          .find(match, { _id: 0, data: 1, time: 1 })
          .exec();

        sendPrivateData({
          socketId,

          data: {
            status: true,
            startOfDayUnix: targetDate.dateUnix,
            result: periodTrades.map(trade => ([
              trade.data[0],
              trade.data[1],
              trade.time,
              trade.data[2],
            ])),
          },
        });
      } else {
        const pathToFile = `${pathToFilesFolder}/${targetDate.day}-${targetDate.month}-${targetDate.year}.json`;
        const doesExistFile = await checkDoesExistFile(pathToFile);

        if (!doesExistFile) {
          sendPrivateData({
            socketId,

            data: {
              status: true,
              startOfDayUnix: targetDate.dateUnix,
              result: [],
            },
          });

          continue;
        }

        const fileData = await fs.promises.readFile(pathToFile, 'utf8');

        sendPrivateData({
          socketId,

          data: {
            status: true,
            startOfDayUnix: targetDate.dateUnix,
            result: JSON.parse(fileData),
          },
        });
      }
    }

    sendPrivateData({
      socketId,

      data: {
        status: true,
        isEnd: true,
      },
    });

    return {
      status: true,
    };
  } catch (error) {
    log.warn(error.message);

    return {
      status: false,
      message: error.message,
    };
  }
};

const checkDoesExistFile = async (pathToFile) => {
  return new Promise(resolve => {
    fs.exists(pathToFile, result => {
      resolve(result);
    });
  });
};

module.exports = {
  getTrades,
};
