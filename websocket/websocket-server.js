const ws = require('ws');
const http = require('http');

const WebSocketRoom = require('./websocket-room');

const {
  randStr,
} = require('../libs/support');

const log = require('../libs/logger')(module);

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

const rooms = [...ACTION_NAMES.values()]
  .map(value => new WebSocketRoom(value));

wss.on('connection', async ws => {
  const socketId = randStr(10);

  ws.isAlive = true;
  ws.socketId = socketId;
  ws.listSubscriptions = [];

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

      case 'subscribe': {
        await newSubscribe({
          data: data.data,
          socketId: ws.socketId,
        }); break;
      }

      default: break;
    }
  });
});

const sendData = obj => {
  const { actionName } = obj;

  const targetRoom = rooms.find(room => room.roomName === actionName);

  if (!targetRoom) {
    return true;
  }

  const socketsIds = targetRoom.members;

  if (!socketsIds || !socketsIds.length) {
    return true;
  }

  const targetClients = [...wss.clients].filter(
    client => socketsIds.includes(client.socketId),
  );

  targetClients.forEach(ws => {
    if (ws.isAlive) {
      ws.send(JSON.stringify(obj));
    }
  });
};

const newSubscribe = async ({
  data,
  socketId,
}) => {
  if (!data) {
    log.warn('No data');
    return false;
  }

  const subscriptionsNames = [];

  if (data.subscriptionName) {
    subscriptionsNames.push(data.subscriptionName);
  } else {
    subscriptionsNames.push(...data.subscriptionsNames || []);
  }

  if (!subscriptionsNames.length) {
    log.warn('No subscriptionName');
    return false;
  }

  let areSubscriptionsNamesValid = true;

  subscriptionsNames.forEach(subscriptionName => {
    if (!ACTION_NAMES.get(subscriptionName)) {
      areSubscriptionsNamesValid = false;
    }
  });

  if (!areSubscriptionsNamesValid) {
    log.warn('Invalid subscriptionName');
    return false;
  }

  const clientWs = [...wss.clients].find(client => client.socketId === socketId);
  const { listSubscriptions } = clientWs;

  if (!clientWs) {
    log.warn('No clientWs');
    return false;
  }

  subscriptionsNames.forEach(subscriptionName => {
    const doesExistSubscription = listSubscriptions.some(
      subscription => subscription === subscriptionName,
    );

    if (!doesExistSubscription) {
      listSubscriptions.push(subscriptionName);
    }
  });

  subscriptionsNames.forEach(subscriptionName => {
    const targetRoom = rooms.find(room => room.roomName === subscriptionName);

    if (!targetRoom) {
      log.warn(`No targetRoom; subscriptionName: ${subscriptionName}`);
      return false;
    }

    targetRoom.join(socketId);
  });
};

module.exports = {
  sendData,
};

const intervalCheckDeadConnections = async (interval) => {
  for (const client of wss.clients) {
    if (client.isAlive) {
      client.isAlive = false;
      continue;
    }

    const { listSubscriptions } = client;

    listSubscriptions.forEach(subscriptionName => {
      const targetRoom = rooms.find(room => room.roomName === subscriptionName);
      targetRoom.leave(client.socketId);
    });

    console.log('Disconnect client', client.socketId);

    client.terminate();
  }

  setTimeout(() => {
    intervalCheckDeadConnections(interval);
  }, interval);
};

intervalCheckDeadConnections(60 * 60 * 1000); // 60 minutes
