// const get1mCandlesForSpotInstruments = require('./spot/get-1m-candles-for-spot-instruments');

const getAggTradesForFuturesInstruments = require('./futures/get-agg-trades-for-futures-instruments');

module.exports = async (instrumentsDocs = []) => {
  const spotDocs = instrumentsDocs
    .filter(doc => !doc.is_futures);

  const futuresDocs = instrumentsDocs
    .filter(doc => doc.is_futures);

  // await get1mCandlesForSpotInstruments(spotDocs);

  await getAggTradesForFuturesInstruments(futuresDocs);
};
