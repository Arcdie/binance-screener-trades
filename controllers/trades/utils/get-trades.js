const moment = require('moment');
const mongoose = require('mongoose');

const log = require('../../../libs/logger')(module);

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
      let TargetTradeModel;

      if (dateUnix === todayStartOfDayUnix) {
        const collectionKey = `${instrumentName.toLowerCase()}-trades`;
        TargetTradeModel = mongoose.connection.db.collection(collectionKey);
      } else {
        const collectionKey = `${instrumentName.toLowerCase()}-trades-${dateUnix}`;
        TargetTradeModel = mongoose.connection.db.collection(collectionKey);
      }

      if (!TargetTradeModel) {
        sendPrivateData({
          socketId,

          data: {
            status: true,
            startOfDayUnix: dateUnix,
            result: [],
          },
        });

        continue;
      }

      const periodTrades = await TargetTradeModel
        .find({}, { _id: 0, data: 1, time: 1 })
        .toArray();

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
