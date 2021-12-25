const axios = require('axios');

const {
  isUndefined,
} = require('lodash');

const log = require('../../../libs/logger')(module);

const {
  tradingHelperConf,
} = require('../../../config');

const getActiveInstruments = async ({
  isOnlyFutures,
}) => {
  try {
    const params = {};

    if (!isUndefined(isOnlyFutures)) {
      params.isOnlyFutures = isOnlyFutures;
    }

    const request = await axios({
      method: 'get',
      url: `https://${tradingHelperConf.url}/api/instruments/active`,

      headers: {
        'Content-Type': 'application/json',
        // token: tradingHelperConf.token,
      },

      params,
    });

    return {
      status: true,
      result: request.data,
    };
  } catch (error) {
    log.error(error.message);

    return {
      status: false,
      message: error.response.data,
    };
  }
};

module.exports = {
  getActiveInstruments,
};
