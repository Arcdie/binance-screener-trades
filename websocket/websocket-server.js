const ws = require('ws');
const http = require('http');

const log = require('../libs/logger')(module);

const {
  randStr,
} = require('../libs/support');

const {
  ACTION_NAMES,
} = require('./constants');

const {
  app: { websocketPort },
} = require('../config');

const wsSettings = {};

if (process.env.NODE_ENV === 'localhost') {
  wsSettings.port = websocketPort;
} else {
  wsSettings.server = http.createServer().listen(websocketPort);
}

const wss = new ws.Server(wsSettings);

wss.on('connection', async ws => {
  const socketId = randStr(10);

  ws.isAlive = true;
  ws.socketId = socketId;

  ws.on('message', async message => {
    const data = JSON.parse(message.toString());

    if (!data.actionName) {
      log.warn('No actionName');
      return false;
    }

    switch (data.actionName) {
      case 'pong': {
        ws.isAlive = true;
        break;
      }

      case 'request': {
        await newRequest({
          data: data.data,
          socketId: ws.socketId,
        }); break;
      }

      default: break;
    }
  });
});

const newRequest = async ({
  data,
  socketId,
}) => {
  if (!data) {
    log.warn('No data');
    return false;
  }

  const { requestName } = data;

  if (!requestName) {
    log.warn('No requestName');
    return false;
  }

  if (!ACTION_NAMES.get(requestName)) {
    log.warn('Invalid requestName');
    return false;
  }

  data.socketId = socketId;

  switch (requestName) {
    case ACTION_NAMES.get('tradesData'): {
      const resultGetTrades = await getTrades(data);

      if (!resultGetTrades || !resultGetTrades.status) {
        const message = resultGetTrades.message || 'Cant getTrades';
        log.warn(message);

        sendPrivateData({
          socketId,
          data: {
            status: false,
            message,
          },
        });
      }

      break;
    }

    default: break;
  }
};

const sendPrivateData = (obj = {}) => {
  if (!obj.socketId) {
    log.warn('No socketId');
    return false;
  }

  const targetClient = [...wss.clients].find(
    client => client.socketId === obj.socketId,
  );

  if (!targetClient || !targetClient.isAlive) {
    log.warn('No or terminated targetClient');
    return false;
  }

  targetClient.send(JSON.stringify(obj.data));
};

module.exports = {
  sendPrivateData,
};

const intervalCheckDeadConnections = async (interval) => {
  for (const client of wss.clients) {
    if (client.isAlive) {
      client.isAlive = false;
      continue;
    }

    console.log('Disconnect client', client.socketId);
    client.terminate();
  }

  setTimeout(() => {
    intervalCheckDeadConnections(interval);
  }, interval);
};

intervalCheckDeadConnections(10 * 60 * 1000); // 10 minutes

const {
  getTrades,
} = require('../controllers/trades/utils/get-trades');
