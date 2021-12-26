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

    const Trade = modelSchemasForInstruments.get(instrumentName);

    if (!Trade) {
      return {
        status: false,
        message: `No model trades for ${instrumentName}`,
      };
    }

    const validStartDate = moment(startDate).utc().startOf('day');
    const validEndDate = moment(endDate).utc().startOf('day');

    const endDateUnix = validEndDate.unix();

    const targetDatesUnix = [];
    const tmpDate = moment(validStartDate);

    while (1) {
      const tmpDateUnix = tmpDate.unix();
      targetDatesUnix.push(tmpDateUnix);

      tmpDate.add(1, 'days');

      if (tmpDateUnix === endDateUnix) {
        break;
      }
    }

    for await (const dateUnix of targetDatesUnix) {
      const startOfDayDate = moment.unix(dateUnix);
      const endOfDayDate = moment.unix(dateUnix + 86400);

      const periodTrades = await Trade
        .find({
          $and: [{
            time: { $gte: startOfDayDate },
          }, {
            time: { $lt: endOfDayDate },
          }],
        }, { _id: 0, data: 1, time: 1 })
        .sort({ time: 1 })
        .exec();

      sendPrivateData({
        socketId,

        data: {
          status: true,
          startOfDayUnix: dateUnix,
          result: periodTrades.map(trade => ([
            trade.data[0],
            trade.data[1],
            trade.time,
            trade.data[2],
          ])),
        },
      });
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
      result: [],
    };
  } catch (error) {
    log.warn(error.message);

    return {
      status: false,
      message: error.message,
    };
  }
};

module.exports = {
  getTrades,
};
