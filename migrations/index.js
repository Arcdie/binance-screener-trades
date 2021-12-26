const removeAllCollections = require('./remove-all-collections');
const removeTradesForPeriod = require('./remove-trades-for-period');
const loadWeeklyAggTradesHistory = require('./load-weekly-aggTrades-history');

const moveTradesToDayCollections = require('./move-trades-to-day-collections');

module.exports = () => {
  // removeAllCollections();
  // loadWeeklyAggTradesHistory();

  // removeTradesForPeriod();
  moveTradesToDayCollections();
};
