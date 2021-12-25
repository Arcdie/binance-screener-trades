const log = require('../libs/logger')(module);

const memoryUsage = require('./memory-usage');
const binanceProcesses = require('./binance');

const {
  getActiveInstruments,
} = require('../controllers/instruments/utils/get-active-instruments');

module.exports = async () => {
  try {
    const resultRequestGetActiveInstruments = await getActiveInstruments({
      isOnlyFutures: true,
    });

    if (!resultRequestGetActiveInstruments || !resultRequestGetActiveInstruments.status) {
      log.warn(resultRequestGetActiveInstruments.message || 'Cant getActiveInstruments');
      return false;
    }

    const resultGetActiveInstruments = resultRequestGetActiveInstruments.result;

    if (!resultGetActiveInstruments || !resultGetActiveInstruments.status) {
      log.warn(resultGetActiveInstruments.message || 'Cant getActiveInstruments');
      return false;
    }

    const instrumentsDocs = resultGetActiveInstruments.result || [];

    await binanceProcesses(instrumentsDocs);

    /*
    setInterval(() => {
      memoryUsage();
    }, 10 * 1000); // 10 seconds
    // */
  } catch (error) {
    log.warn(error.message);
    return false;
  }
};
