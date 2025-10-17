const crypto = require('crypto');

const rooms = new Map(); // Store active rooms in memory

const tenMinutes = 10 * 60 * 1000;
const thirtyMinutes = 10 * 60 * 1000;

class Room {
  constructor(id, name, creator) {
    this.id = id;
    this.name = name;
    this.creator = creator;
    this.players = new Map();
    this.gameState = null;
    this.createdAt = new Date();
    this.lastActivity = new Date();
  }

  addPlayer(socketId, player) {
    this.players.set(socketId, player);
    this.lastActivity = new Date();
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    this.lastActivity = new Date();
  }

  getPlayers() {
    return Array.from(this.players.values());
  }

  isEmpty() {
    return this.players.size === 0;
  }

  updateActivity() {
    this.lastActivity = new Date();
  }
}

function generateRoomId() {
  return crypto.randomBytes(6).toString('hex'); // Safe for use in URLs
}

function createRoom(name, creator, customId = null) {
  const roomId = customId || generateRoomId();
  
  // Check if custom ID already exists
  if (customId && rooms.has(customId)) {
    throw new Error(`Room with ID '${customId}' already exists`);
  }
  
  const room = new Room(roomId, name, creator);
  rooms.set(roomId, room);
  cleanupEmptyRoomsPeriodically();
  return room;
}

function getRoom(roomId) {
  return rooms.get(roomId);
}

function deleteRoom(roomId) {
  return rooms.delete(roomId);
}

function getAllRooms() {
  return Array.from(rooms.values()).map(room => ({
    id: room.id,
    name: room.name,
    playerCount: room.players.size,
    createdAt: room.createdAt
  }));
}

function cleanupEmptyRoomsPeriodically() {
  const now = new Date();
  const maxAge = thirtyMinutes
  
  for (const [roomId, room] of rooms) {
    const age = now - room.lastActivity;
    if (room.isEmpty() && age > maxAge) {
      rooms.delete(roomId);
      console.log(`Cleaned up empty room: ${roomId}`);
    }
  }
}

setInterval(cleanupEmptyRoomsPeriodically, tenMinutes);

module.exports = {
  createRoom,
  getRoom,
  deleteRoom,
  getAllRooms,
  Room
};