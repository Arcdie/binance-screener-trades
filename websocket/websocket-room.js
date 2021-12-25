class WebSocketRoom {
  constructor(roomName) {
    this.roomName = roomName;
    this.members = [];
  }

  join(memberId) {
    this.members.push(memberId);
  }

  leave(memberId) {
    this.members = this.members.filter(member => member !== memberId);

    this.rooms.forEach(room => {
      room.leave(memberId);
    });
  }
}

module.exports = WebSocketRoom;
