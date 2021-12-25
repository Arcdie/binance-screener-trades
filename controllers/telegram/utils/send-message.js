const axios = require('axios');

const {
  isMongoId,
} = require('validator');

const log = require('../../../libs/logger')(module);

const {
  tradingHelperConf,
} = require('../../../config');

const sendMessage = async (clientId, message) => {
  try {
    const body = {
      message,
    };

    if (isMongoId(clientId.toString())) {
      body.userId = clientId;
    } else {
      body.chatId = clientId;
    }

    const request = await axios({
      method: 'post',
      url: `https://${tradingHelperConf.url}/api/telegram/message`,

      headers: {
        'Content-Type': 'application/json',
        token: tradingHelperConf.token,
      },

      data: body,
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
  sendMessage,
};
