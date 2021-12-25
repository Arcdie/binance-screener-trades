const removeAllCollections = require('./remove-all-collections');
const loadWeeklyAggTradesHistory = require('./load-weekly-aggTrades-history');

module.exports = () => {
  // removeAllCollections();
  loadWeeklyAggTradesHistory();
};
