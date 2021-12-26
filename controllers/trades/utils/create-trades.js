const log = require('../../../libs/logger')(module);

const {
  modelSchemasForInstruments,
} = require('../../models/constants');

const createTrades = async ({
  instrumentName,
  trades,
}) => {
  try {
    if (!instrumentName) {
      return {
        status: false,
        message: 'No instrumentName',
      };
    }

    if (!trades || !trades.length) {
      return {
        status: false,
        message: 'No or empty trades',
      };
    }

    const Trade = modelSchemasForInstruments.get(instrumentName);

    if (!Trade) {
      return {
        status: false,
        message: `No model trades for ${instrumentName}`,
      };
    }

    const newTrades = trades.map(trade => ({
      // price, quantity, isLong
      data: [trade.price, trade.quantity, trade.isLong],
      time: trade.time,
    }));

    await Trade.insertMany(newTrades);

    return {
      status: true,
      isCreated: true,
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
  createTrades,
};
