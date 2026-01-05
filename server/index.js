// Express + Socket.IO server for multiplayer Ludo
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static('../client'));

// Game rooms storage
const gameRooms = new Map();

// Player socket mapping
const playerSockets = new Map();

class GameRoom {
    constructor(roomId, maxPlayers) {
        this.roomId = roomId;
        this.maxPlayers = maxPlayers;
        this.players = [];
        this.gameState = {
            currentPlayer: 0,
            players: ['Red', 'Blue', 'Green', 'Yellow'],
            colors: ['red', 'blue', 'green', 'yellow'],
            canMove: false,
            selectedPiece: null,
            diceValue: null,
            pieces: {
                red: [],
                blue: [],
                green: [],
                yellow: []
            }
        };
        this.status = 'waiting'; // waiting, playing, finished
    }

    addPlayer(playerId, playerName) {
        if (this.players.length < this.maxPlayers) {
            const playerIndex = this.players.length;
            const color = this.gameState.colors[playerIndex];
            this.players.push({
                id: playerId,
                name: playerName,
                color: color,
                index: playerIndex
            });
            
            // Initialize pieces for this player
            const pieceIds = [];
            for (let i = 0; i < 4; i++) {
                pieceIds.push(`${color}${i}`);
            }
            this.gameState.pieces[color] = pieceIds.map((id, i) => ({
                id,
                position: -1,
                inHome: true,
                finished: false
            }));
            
            return true;
        }
        return false;
    }

    isFull() {
        return this.players.length === this.maxPlayers;
    }

    getPlayerBySocketId(socketId) {
        return this.players.find(p => playerSockets.get(p.id) === socketId);
    }
}

// Routes for room management
app.get('/api/rooms', (req, res) => {
    const rooms = Array.from(gameRooms.values()).map(room => ({
        roomId: room.roomId,
        maxPlayers: room.maxPlayers,
        currentPlayers: room.players.length,
        status: room.status,
        players: room.players.map(p => ({ name: p.name, color: p.color }))
    }));
    res.json(rooms);
});

app.post('/api/rooms/create', (req, res) => {
    const roomId = uuidv4().substring(0, 8);
    const maxPlayers = req.query.players || 4;
    const newRoom = new GameRoom(roomId, parseInt(maxPlayers));
    gameRooms.set(roomId, newRoom);
    res.json({ roomId, status: 'created' });
});

// Socket.IO events
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join a game room
    socket.on('joinRoom', (data, callback) => {
        const { roomId, playerName } = data;
        const room = gameRooms.get(roomId);

        if (!room) {
            callback({ success: false, error: 'Room not found' });
            return;
        }

        if (room.isFull()) {
            callback({ success: false, error: 'Room is full' });
            return;
        }

        const playerId = socket.id;
        if (room.addPlayer(playerId, playerName)) {
            playerSockets.set(playerId, socket.id);
            socket.join(roomId);

            const playerIndex = room.players.length - 1;
            const player = room.players[playerIndex];

            callback({
                success: true,
                playerIndex,
                color: player.color,
                gameState: room.gameState,
                players: room.players.map(p => ({ name: p.name, color: p.color }))
            });

            // Notify all players in room
            io.to(roomId).emit('playerJoined', {
                playerName,
                color: player.color,
                totalPlayers: room.players.length,
                maxPlayers: room.maxPlayers
            });

            // If room is full, start game
            if (room.isFull()) {
                room.status = 'playing';
                io.to(roomId).emit('gameStart', { gameState: room.gameState });
            }
        } else {
            callback({ success: false, error: 'Could not add player to room' });
        }
    });

    // Relay dice roll
    socket.on('rollDice', (data) => {
        const { roomId, diceValue, playerIndex } = data;
        const room = gameRooms.get(roomId);
        if (room) {
            room.gameState.diceValue = diceValue;
            room.gameState.currentPlayer = playerIndex;
            io.to(roomId).emit('diceRolled', { diceValue, playerIndex });
        }
    });

    // Relay piece move
    socket.on('movePiece', (data) => {
        const { roomId, pieceId, color, newPosition, currentPlayer } = data;
        const room = gameRooms.get(roomId);
        if (room) {
            const piece = room.gameState.pieces[color].find(p => p.id === pieceId);
            if (piece) {
                piece.position = newPosition;
                io.to(roomId).emit('pieceMoved', {
                    pieceId,
                    color,
                    newPosition,
                    currentPlayer
                });
            }
        }
    });

    // Relay capture
    socket.on('pieceCaptured', (data) => {
        const { roomId, capturedPieceId, capturedColor, attackerColor } = data;
        const room = gameRooms.get(roomId);
        if (room) {
            const piece = room.gameState.pieces[capturedColor].find(p => p.id === capturedPieceId);
            if (piece) {
                piece.inHome = true;
                piece.position = -1;
                io.to(roomId).emit('pieceCaptured', {
                    capturedPieceId,
                    capturedColor,
                    attackerColor
                });
            }
        }
    });

    // Relay turn end
    socket.on('endTurn', (data) => {
        const { roomId, nextPlayerIndex } = data;
        const room = gameRooms.get(roomId);
        if (room) {
            room.gameState.currentPlayer = nextPlayerIndex;
            room.gameState.diceValue = null;
            room.gameState.canMove = false;
            io.to(roomId).emit('turnEnded', { nextPlayerIndex });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Clean up and notify room
        playerSockets.delete(socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
