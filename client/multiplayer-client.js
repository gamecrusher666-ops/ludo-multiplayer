// Multiplayer client logic
const socket = io();
let roomId = null;
let playerIndex = null;
let playerColor = null;
let isLocalPlayer = false;
let activeColors = []; // Track which colors are in this game

// Get session data
function initializeFromSession() {
    roomId = sessionStorage.getItem('roomId');
    playerIndex = parseInt(sessionStorage.getItem('playerIndex'));
    playerColor = sessionStorage.getItem('playerColor');
    
    // Safely parse activeColors
    const activeColorsStr = sessionStorage.getItem('activeColors');
    activeColors = [];
    if (activeColorsStr && activeColorsStr !== 'undefined') {
        try {
            activeColors = JSON.parse(activeColorsStr);
        } catch (e) {
            console.error('Failed to parse activeColors:', e);
            activeColors = [];
        }
    }
    
    const playerName = sessionStorage.getItem('playerName');
    
    if (!roomId || playerIndex === null || !playerColor) {
        alert('Invalid game session');
        window.location.href = 'multiplayer.html';
        return;
    }
    
    console.log('Initialized. activeColors:', activeColors, 'playerIndex:', playerIndex);
    
    // Now that activeColors is set, create the board with only active pieces
    createLudoBoard();
    
    // Update player info display
    document.getElementById('player-info').innerHTML = `
        <div style="color: ${getColorCode(playerColor)}; font-weight: bold; margin-bottom: 10px;">
            ${playerName} (${playerColor.toUpperCase()})
        </div>
    `;
}

function getColorCode(color) {
    const colors = {
        red: '#ff4444',
        blue: '#4488ff',
        green: '#44ff44',
        yellow: '#ffff44'
    };
    return colors[color] || '#fff';
}

// Socket.io event handlers
socket.on('gameStart', (data) => {
    console.log('Game started');
    const turnDisplay = document.getElementById('turn-display');
    turnDisplay.textContent = `${gameState.players[gameState.currentPlayer]}'s turn`;
    isLocalPlayer = gameState.currentPlayer === playerIndex;
    
    // Enable/disable roll button based on whose turn it is
    if (isLocalPlayer) {
        document.getElementById('roll-dice').disabled = false;
    } else {
        document.getElementById('roll-dice').disabled = true;
    }
    
    console.log('isLocalPlayer:', isLocalPlayer, 'playerIndex:', playerIndex, 'currentPlayer:', gameState.currentPlayer);
});

socket.on('playerJoined', (data) => {
    console.log(`${data.playerName} joined as ${data.color}`);
    const turnDisplay = document.getElementById('turn-display');
    turnDisplay.textContent = `${data.playerName} joined! (${data.totalPlayers}/${data.maxPlayers})`;
});

socket.on('diceRolled', (data) => {
    console.log(`Player ${data.playerIndex} rolled a ${data.diceValue}`);
    if (data.playerIndex !== playerIndex) {
        // Another player rolled, show their roll
        const turnDisplay = document.getElementById('turn-display');
        turnDisplay.textContent = `${gameState.players[data.playerIndex]} rolled ${data.diceValue}`;
        document.getElementById('dice-value').textContent = data.diceValue;
        gameState.diceValue = data.diceValue;
    }
});

socket.on('pieceMoved', (data) => {
    console.log(`${data.color} piece moved to position ${data.newPosition}`);
    if (data.color !== playerColor) {
        // Another player's piece moved - visual update needed
        const piece = gameState.pieces[data.color].find(p => p.id === data.pieceId);
        if (piece) {
            piece.position = data.newPosition;
            updatePiecePosition(piece, data.color);
        }
    }
});

socket.on('pieceCaptured', (data) => {
    console.log(`${data.attackerColor} captured ${data.capturedColor}`);
    const piece = gameState.pieces[data.capturedColor].find(p => p.id === data.capturedPieceId);
    if (piece) {
        piece.inHome = true;
        piece.position = -1;
        
        // Move piece visually back to home
        const pieceElement = document.querySelector(`[data-id="${data.capturedPieceId}"]`);
        if (pieceElement && pieceElement.parentElement) {
            pieceElement.parentElement.removeChild(pieceElement);
        }
        
        // Find home position and place piece there
        const homeX = piece.x;
        const homeY = piece.y;
        const table = document.querySelector('.ludo-table');
        const rowIndex = table.rows.length - 1 - homeY;
        const homeCell = table.rows[rowIndex].cells[homeX];
        
        const newPin = document.createElement('div');
        newPin.style.width = '40px';
        newPin.style.height = '40px';
        newPin.style.borderRadius = '50%';
        newPin.style.margin = 'auto';
        newPin.style.background = data.capturedColor;
        newPin.style.border = '2px solid #fff';
        newPin.classList.add('game-piece');
        newPin.dataset.id = data.capturedPieceId;
        newPin.dataset.color = data.capturedColor;
        newPin.style.cursor = 'pointer';
        newPin.addEventListener('click', () => selectPiece(data.capturedPieceId, data.capturedColor));
        homeCell.appendChild(newPin);
    }
});

socket.on('turnEnded', (data) => {
    console.log(`Turn ended, next player: ${data.nextPlayerIndex}`);
    const turnDisplay = document.getElementById('turn-display');
    const nextColor = activeColors[data.nextPlayerIndex] || gameState.colors[data.nextPlayerIndex];
    turnDisplay.textContent = `${nextColor.toUpperCase()}'s turn`;
    document.getElementById('dice-value').textContent = '-';
    
    isLocalPlayer = data.nextPlayerIndex === playerIndex;
    
    if (isLocalPlayer) {
        document.getElementById('roll-dice').disabled = false;
    } else {
        document.getElementById('roll-dice').disabled = true;
    }
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    alert('Connection error: ' + error.message);
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    alert('You have been disconnected from the game');
    window.location.href = 'multiplayer.html';
});

// Override rollDice to emit to server
const originalRollDice = rollDice;
rollDice = function() {
    if (!isLocalPlayer) {
        console.log('Not your turn');
        return;
    }
    
    // Prevent rolling if already rolled and haven't moved
    if (gameState.canMove || gameState.diceValue !== null) {
        return;
    }
    
    const diceValue = gameState.debugDiceMode ? 1 : (Math.floor(Math.random() * 6) + 1);
    gameState.diceValue = diceValue;
    
    // Emit to server
    socket.emit('rollDice', {
        roomId,
        diceValue,
        playerIndex
    });
    
    const diceDisplay = document.getElementById('dice-value');
    const turnDisplay = document.getElementById('turn-display');
    
    diceDisplay.textContent = diceValue;
    diceDisplay.style.fontSize = '48px';
    diceDisplay.style.fontWeight = 'bold';
    
    // Check for legal moves with this roll
    const hasMove = hasLegalMoveForCurrent(diceValue);
    if (!hasMove) {
        turnDisplay.textContent = `${gameState.players[gameState.currentPlayer]}: no legal moves (rolled ${diceValue})`;
        turnDisplay.style.color = gameState.colors[gameState.currentPlayer];
        gameState.canMove = false;
        gameState.diceValue = null;
        setTimeout(() => {
            diceDisplay.textContent = '-';
            endTurnMultiplayer();
        }, 500);
        return;
    }
    
    gameState.canMove = true;
    turnDisplay.textContent = `${gameState.players[gameState.currentPlayer]}'s turn - Roll: ${diceValue}`;
    turnDisplay.style.color = gameState.colors[gameState.currentPlayer];
    
    // Auto-play if only one legal move
    setTimeout(() => {
        const legalPieces = getLegalPiecesForCurrent(diceValue);
        if (legalPieces.length === 1) {
            selectPiece(legalPieces[0].id, gameState.colors[gameState.currentPlayer]);
        }
    }, 300);
};

// Override endTurn to emit to server
function endTurnMultiplayer() {
    gameState.canMove = false;
    gameState.selectedPiece = null;
    gameState.diceValue = null;
    
    // Remove selection
    const selected = document.querySelector('.game-piece.selected');
    if (selected) {
        selected.classList.remove('selected');
        selected.style.boxShadow = '';
    }
    
    const turnDisplay = document.getElementById('turn-display');
    const diceDisplay = document.getElementById('dice-value');
    
    // Move to next active player
    let nextPlayer = (gameState.currentPlayer + 1) % activeColors.length;
    gameState.currentPlayer = nextPlayer;
    
    turnDisplay.textContent = `${gameState.players[nextPlayer]}'s turn`;
    turnDisplay.style.color = gameState.colors[nextPlayer];
    diceDisplay.textContent = '-';
    
    // Emit to server
    socket.emit('endTurn', {
        roomId,
        nextPlayerIndex: nextPlayer
    });
    
    isLocalPlayer = nextPlayer === playerIndex;
}

// Override checkCapture to emit captures to server
const originalCheckCapture = checkCapture;
checkCapture = function(piece, attackerColor, rolledValue) {
    const path = getPathForColor(attackerColor);
    const coords = path[piece.position];
    
    if (!coords || typeof coords.x !== 'number' || typeof coords.y !== 'number') {
        gameState.canMove = false;
        gameState.diceValue = null;
        document.getElementById('dice-value').textContent = '-';
        endTurnMultiplayer();
        return;
    }
    
    const x = coords.x;
    const y = coords.y;
    
    const turnDisplay = document.getElementById('turn-display');
    const isOnSafeSquare = isSafeSquare(x, y);
    let captured = false;
    
    // Check for captures only if not on safe square
    if (!isOnSafeSquare) {
        for (let opponentColor of gameState.colors) {
            if (opponentColor === attackerColor) continue;
            
            const opponentPath = getPathForColor(opponentColor);
            const opponentPieces = gameState.pieces[opponentColor];
            
            for (let opponentPiece of opponentPieces) {
                if (opponentPiece.inHome || opponentPiece.finished) continue;
                
                const opponentCoords = opponentPath[opponentPiece.position];
                if (!opponentCoords) continue;
                
                const ox = opponentCoords.x;
                const oy = opponentCoords.y;
                
                if (ox === x && oy === y) {
                    // Capture!
                    opponentPiece.inHome = true;
                    opponentPiece.position = -1;
                    
                    // Emit capture to server
                    socket.emit('pieceCaptured', {
                        roomId,
                        capturedPieceId: opponentPiece.id,
                        capturedColor: opponentColor,
                        attackerColor
                    });
                    
                    // Move piece back to its home position
                    const opponentPieceElement = document.querySelector(`[data-id="${opponentPiece.id}"]`);
                    if (opponentPieceElement && opponentPieceElement.parentElement) {
                        opponentPieceElement.parentElement.removeChild(opponentPieceElement);
                    }
                    
                    // Place in home cell
                    const table = document.querySelector('.ludo-table');
                    const rowIndex = table.rows.length - 1 - opponentPiece.y;
                    const homeCell = table.rows[rowIndex].cells[opponentPiece.x];
                    homeCell.appendChild(opponentPieceElement);
                    
                    captured = true;
                    turnDisplay.textContent = `${attackerColor.toUpperCase()} captured ${opponentColor.toUpperCase()}!`;
                }
            }
        }
    }
    
    if (captured) {
        // Give extra roll
        setTimeout(() => {
            turnDisplay.textContent = `${attackerColor.toUpperCase()}'s turn - Roll again!`;
        }, 800);
        gameState.canMove = false;
        gameState.diceValue = null;
        setTimeout(() => {
            document.getElementById('dice-value').textContent = '-';
            turnDisplay.textContent = `${gameState.players[gameState.currentPlayer]}'s turn`;
        }, 1600);
    } else {
        // Normal turn end (no capture)
        if (rolledValue === 6) {
            // Give extra roll for 6
            turnDisplay.textContent = `${attackerColor.toUpperCase()}'s turn - Roll again!`;
            gameState.canMove = false;
            gameState.diceValue = null;
            document.getElementById('dice-value').textContent = '-';
        } else {
            // Regular turn end - not a 6, no capture
            gameState.canMove = false;
            gameState.diceValue = null;
            document.getElementById('dice-value').textContent = '-';
            endTurnMultiplayer();
        }
    }
};

// Leave game button
document.getElementById('leave-game').addEventListener('click', () => {
    if (confirm('Leave the game?')) {
        socket.disconnect();
        window.location.href = 'multiplayer.html';
    }
});

// Override movePiece to emit moves to server
const originalMovePiece = movePiece;
movePiece = function(pieceId) {
    const color = gameState.colors[gameState.currentPlayer];
    const piece = gameState.pieces[color].find(p => p.id === pieceId);
    
    if (!piece) return;
    
    // If piece is in home, need a 6 to start
    if (piece.inHome && gameState.diceValue !== 6) {
        const turnDisplay = document.getElementById('turn-display');
        turnDisplay.textContent = 'Need a 6 to start that piece!';
        setTimeout(() => {
            turnDisplay.textContent = `${gameState.players[gameState.currentPlayer]}'s turn`;
        }, 1000);
        return;
    }
    
    // Move piece
    if (piece.inHome) {
        // Move to starting position (requires rolling a 6)
        piece.inHome = false;
        piece.position = 0;
        updatePiecePosition(piece, color);
        
        // Emit move to server
        socket.emit('movePiece', {
            roomId,
            pieceId,
            color,
            newPosition: 0,
            currentPlayer: gameState.currentPlayer
        });
        
        // Give extra roll for rolling 6 to start
        const turnDisplay = document.getElementById('turn-display');
        const diceDisplay = document.getElementById('dice-value');
        turnDisplay.textContent = `${gameState.players[gameState.currentPlayer]}'s turn - Roll again!`;
        gameState.canMove = false;
        gameState.diceValue = null;
        diceDisplay.textContent = '-';
        return;
    } else {
        const path = getPathForColor(color);
        const lastIndex = path.length - 1;
        const target = piece.position + gameState.diceValue;

        // Cannot move beyond finish
        if (target > lastIndex) {
            const turnDisplay = document.getElementById('turn-display');
            turnDisplay.textContent = `Cannot move: roll too high to finish`;
            gameState.canMove = false;
            gameState.diceValue = null;
            setTimeout(() => endTurnMultiplayer(), 1000);
            return;
        }

        piece.position = target;
        
        // Emit move to server
        socket.emit('movePiece', {
            roomId,
            pieceId,
            color,
            newPosition: target,
            currentPlayer: gameState.currentPlayer
        });
        
        if (piece.position === lastIndex) {
            piece.finished = true;
            updatePiecePosition(piece, color);
            const turnDisplay = document.getElementById('turn-display');
            turnDisplay.textContent = `${color.toUpperCase()} piece finished!`;
            
            // Clear state immediately and give extra roll for finishing
            gameState.canMove = false;
            gameState.diceValue = null;
            
            setTimeout(() => {
                turnDisplay.textContent = `${gameState.players[gameState.currentPlayer]}'s turn - Roll again!`;
            }, 1000);
            setTimeout(() => {
                document.getElementById('dice-value').textContent = '-';
                turnDisplay.textContent = `${gameState.players[gameState.currentPlayer]}'s turn`;
            }, 2000);
            return;
        } else {
            updatePiecePosition(piece, color);
            
            // Store the dice value before calling checkCapture
            const rolledValue = gameState.diceValue;
            
            // Check for capture after moving
            checkCapture(piece, color, rolledValue);
            return; // Let checkCapture handle turn ending
        }
    }
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeFromSession();
    
    const diceButton = document.getElementById('roll-dice');
    if (diceButton) {
        diceButton.addEventListener('click', rollDice);
    }
    
    // Set up debug move button
    const debugMoveBtn = document.getElementById('debug-move-btn');
    if (debugMoveBtn) {
        debugMoveBtn.addEventListener('click', () => {
            const pieceId = document.getElementById('debug-piece').value;
            const x = parseInt(document.getElementById('debug-x').value);
            const y = parseInt(document.getElementById('debug-y').value);
            
            if (!pieceId || isNaN(x) || isNaN(y)) {
                alert('Please select a piece and enter valid coordinates');
                return;
            }
            
            // Find the piece and its color
            let foundPiece = null;
            let foundColor = null;
            for (let color of gameState.colors) {
                const piece = gameState.pieces[color].find(p => p.id === pieceId);
                if (piece) {
                    foundPiece = piece;
                    foundColor = color;
                    break;
                }
            }
            
            if (!foundPiece) {
                alert('Piece not found');
                return;
            }
            
            // Find the position on the path that matches these coordinates
            const path = getPathForColor(foundColor);
            let targetPosition = -1;
            for (let i = 0; i < path.length; i++) {
                if (path[i].x === x && path[i].y === y) {
                    targetPosition = i;
                    break;
                }
            }
            
            if (targetPosition === -1) {
                alert(`No valid path position found at (${x}, ${y}) for ${foundColor}`);
                return;
            }
            
            // Move the piece
            foundPiece.inHome = false;
            foundPiece.position = targetPosition;
            updatePiecePosition(foundPiece, foundColor);
            
            console.log(`Debug: Moved ${pieceId} to position ${targetPosition} at (${x}, ${y})`);
        });
    }
    
    // Set up debug dice toggle
    const debugDiceToggle = document.getElementById('debug-dice-toggle');
    if (debugDiceToggle) {
        debugDiceToggle.addEventListener('change', (e) => {
            gameState.debugDiceMode = e.target.checked;
            console.log('Debug dice mode:', gameState.debugDiceMode ? 'ON (always roll 1)' : 'OFF');
        });
    }
    
    // Initialize turn display
    const turnDisplay = document.getElementById('turn-display');
    if (turnDisplay) {
        turnDisplay.textContent = `${gameState.players[gameState.currentPlayer]}'s turn`;
        turnDisplay.style.color = gameState.colors[gameState.currentPlayer];
    }
    
    // Disable roll button if not your turn
    isLocalPlayer = gameState.currentPlayer === playerIndex;
    document.getElementById('roll-dice').disabled = !isLocalPlayer;
});
