// Cleaned: all logic is inside DOMContentLoaded and createLudoBoard below
/* Ludo board rendering and basic logic */

document.addEventListener('DOMContentLoaded', createLudoBoard);

// Game state
const gameState = {
    currentPlayer: 0, // 0=red, 1=blue, 2=green, 3=yellow
    players: ['Red', 'Blue', 'Green', 'Yellow'],
    colors: ['red', 'blue', 'green', 'yellow'],
    diceValue: null,
    selectedPiece: null,
    canMove: false,
    pieces: {
        red: [
            {id: 'red0', position: -1, inHome: true, x: 1, y: 10},
            {id: 'red1', position: -1, inHome: true, x: 1, y: 13},
            {id: 'red2', position: -1, inHome: true, x: 4, y: 10},
            {id: 'red3', position: -1, inHome: true, x: 4, y: 13}
        ],
        blue: [
            {id: 'blue0', position: -1, inHome: true, x: 1, y: 1},
            {id: 'blue1', position: -1, inHome: true, x: 1, y: 4},
            {id: 'blue2', position: -1, inHome: true, x: 4, y: 1},
            {id: 'blue3', position: -1, inHome: true, x: 4, y: 4}
        ],
        green: [
            {id: 'green0', position: -1, inHome: true, x: 10, y: 1},
            {id: 'green1', position: -1, inHome: true, x: 10, y: 4},
            {id: 'green2', position: -1, inHome: true, x: 13, y: 1},
            {id: 'green3', position: -1, inHome: true, x: 13, y: 4}
        ],
        yellow: [
            {id: 'yellow0', position: -1, inHome: true, x: 10, y: 10},
            {id: 'yellow1', position: -1, inHome: true, x: 10, y: 13},
            {id: 'yellow2', position: -1, inHome: true, x: 13, y: 10},
            {id: 'yellow3', position: -1, inHome: true, x: 13, y: 13}
        ]
    }
};

function createLudoBoard() {
    // createLudoBoard start
    const board = document.getElementById('board');
    board.innerHTML = '';
    const size = 15;
    const table = document.createElement('table');
    table.className = 'ludo-table';

    // Build the board (y=0 at bottom; render from top row down)
    for (let y = size - 1; y >= 0; y--) {
        const tr = document.createElement('tr');
        for (let x = 0; x < size; x++) {
            const td = document.createElement('td');
            td.dataset.x = x;
            td.dataset.y = y;

            // Color home areas (swap blue and red)
            if (x < 6 && y < 6) {
                td.style.background = '#2980b9'; // Blue home (bottom left)
                td.style.border = '2px solid #1f5a8a'; // Darker blue border
            } else if (x > 8 && y < 6) {
                td.style.background = '#27ae60'; // Green home (bottom right)
                td.style.border = '2px solid #1e8449'; // Darker green border
            } else if (x < 6 && y > 8) {
                td.style.background = '#e74c3c'; // Red home (top left)
                td.style.border = '2px solid #a93226'; // Darker red border
            } else if (x > 8 && y > 8) {
                td.style.background = '#f1c40f'; // Yellow home (top right)
                td.style.border = '2px solid #b8860b'; // Darker yellow border
            }

            // Starting squares (all colors, (0,0) is bottom left)
            // Blue: bottom left, just above home
            if (x === 6 && y === 1) td.style.background = '#2980b9';
            // Red: top left, just right of home
            if (x === 1 && y === 8) td.style.background = '#e74c3c';
            // Yellow: top right, just below home
            if (x === 8 && y === 13) td.style.background = '#f1c40f';
            // Green: bottom right, just left of home
            if (x === 13 && y === 6) td.style.background = '#27ae60';

            // Make center completely blank (no background, no content, no children)
            if (x >= 6 && x <= 8 && y >= 6 && y <= 8) {
                td.style.background = '';
                td.innerHTML = '';
                while (td.firstChild) td.removeChild(td.firstChild);
            }

            // Blue ending squares (home-stretch to center): (7,1) to (7,6)
            if (x === 7 && y >= 1 && y <= 6) td.style.background = '#2980b9';

            // Red ending squares (home-stretch to center): (1,7) to (6,7)
            if (y === 7 && x >= 1 && x <= 6) td.style.background = '#e74c3c';

            // Yellow ending squares (home-stretch to center): (7,8) to (7,13)
            if (x === 7 && y >= 8 && y <= 13) td.style.background = '#f1c40f';

            // Green ending squares (home-stretch to center): (8,7) to (13,7)
            if (y === 7 && x >= 8 && x <= 13) td.style.background = '#27ae60';

            // Very center cell is pink
            if (x === 7 && y === 7) td.style.background = '#ff69b4';

            // Safezone stars at (8,2), (12,8), (6,12), (2,6)
            if (x === 8 && y === 2) addStar(td, '#2980b9');
            if (x === 12 && y === 8) addStar(td, '#27ae60');
            if (x === 6 && y === 12) addStar(td, '#e74c3c');
            if (x === 2 && y === 6) addStar(td, '#e74c3c');

            tr.appendChild(td);
        }
        table.appendChild(tr);
    }

    // Helper: add a gold glow to a safezone cell
    function addStar(td, color) {
        td.style.boxShadow = '0 0 15px 3px gold, inset 0 0 15px 2px gold';
        td.style.border = '2px solid gold';
    }

    board.appendChild(table);

    // Draw red pins (top left home)
    drawPin(1, 10, 'red', 'red0');
    drawPin(1, 13, 'red', 'red1');
    drawPin(4, 10, 'red', 'red2');
    drawPin(4, 13, 'red', 'red3');

    // Draw blue pins (bottom left home)
    drawPin(1, 1, 'blue', 'blue0');
    drawPin(1, 4, 'blue', 'blue1');
    drawPin(4, 1, 'blue', 'blue2');
    drawPin(4, 4, 'blue', 'blue3');

    // Draw green pins (bottom right home)
    drawPin(10, 1, 'green', 'green0');
    drawPin(10, 4, 'green', 'green1');
    drawPin(13, 1, 'green', 'green2');
    drawPin(13, 4, 'green', 'green3');

    // Draw yellow pins (top right home)
    drawPin(10, 10, 'yellow', 'yellow0');
    drawPin(10, 13, 'yellow', 'yellow1');
    drawPin(13, 10, 'yellow', 'yellow2');
    drawPin(13, 13, 'yellow', 'yellow3');

    function drawPin(x, y, color, id) {
        const rowIndex = table.rows.length - 1 - y; // map y=0 bottom to bottom row
        const cell = table.rows[rowIndex].cells[x];
        const pin = document.createElement('div');
        pin.style.width = '18px';
        pin.style.height = '18px';
        pin.style.borderRadius = '50%';
        pin.style.margin = 'auto';
        pin.style.background = color;
        pin.style.border = '2px solid #fff';
        pin.classList.add('game-piece');
        pin.dataset.id = id;
        pin.dataset.color = color;
        pin.style.cursor = 'pointer';
        pin.addEventListener('click', () => selectPiece(id, color));
        cell.appendChild(pin);
    }
    // End of createLudoBoard
}

// Dice and turn management
function rollDice() {
    // Prevent rolling if already rolled and haven't moved
    if (gameState.canMove || gameState.diceValue !== null) {
        return;
    }
    
    const diceValue = gameState.debugDiceMode ? 1 : (Math.floor(Math.random() * 6) + 1);
    gameState.diceValue = diceValue;
    
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
            endTurn();
        }, 500);
        return;
    }

    gameState.canMove = true;
    // Update turn display
    turnDisplay.textContent = `${gameState.players[gameState.currentPlayer]}'s turn - Roll: ${diceValue}`;
    turnDisplay.style.color = gameState.colors[gameState.currentPlayer];
    
    // Auto-play if only one legal move
    setTimeout(() => {
        const legalPieces = getLegalPiecesForCurrent(diceValue);
        if (legalPieces.length === 1) {
            selectPiece(legalPieces[0].id, gameState.colors[gameState.currentPlayer]);
        }
    }, 300);
}

function getLegalPiecesForCurrent(diceValue) {
    const color = gameState.colors[gameState.currentPlayer];
    const path = getPathForColor(color);
    const lastIndex = path.length - 1;
    return gameState.pieces[color].filter(p => {
        if (p.finished) return false;
        if (p.inHome) return diceValue === 6;
        const target = p.position + diceValue;
        return target <= lastIndex;
    });
}

function hasLegalMoveForCurrent(diceValue) {
    const color = gameState.colors[gameState.currentPlayer];
    const path = getPathForColor(color);
    const lastIndex = path.length - 1;
    return gameState.pieces[color].some(p => {
        if (p.inHome) return diceValue === 6;
        const target = p.position + diceValue;
        return target <= lastIndex;
    });
}

function isSafeSquare(x, y) {
    // Center is safe
    if (x === 7 && y === 7) return true;
    
    // Starting squares for each color
    const starts = [
        {x: 6, y: 1},  // Blue start
        {x: 1, y: 8},  // Red start
        {x: 13, y: 6}, // Yellow start
        {x: 8, y: 13}  // Green start
    ];
    if (starts.some(s => s.x === x && s.y === y)) return true;
    
    // Gold glow safezones (star positions)
    const safezones = [
        {x: 2, y: 6},  // Left star
        {x: 8, y: 2},  // Bottom star
        {x: 6, y: 12}, // Top star
        {x: 12, y: 8}  // Right star
    ];
    return safezones.some(s => s.x === x && s.y === y);
}

function checkCapture(piece, attackerColor, rolledValue) {
    console.log('checkCapture called:', { attackerColor, rolledValue, piecePosition: piece.position });
    const path = getPathForColor(attackerColor);
    const coords = path[piece.position];
    
    // Safety check - if no valid coordinates, just end turn normally
    if (!coords || typeof coords.x !== 'number' || typeof coords.y !== 'number') {
        console.log('Invalid coords:', coords, 'at position', piece.position);
        gameState.canMove = false;
        gameState.diceValue = null;
        document.getElementById('dice-value').textContent = '-';
        endTurn();
        return;
    }
    
    const x = coords.x;
    const y = coords.y;
    
    const turnDisplay = document.getElementById('turn-display');
    const isOnSafeSquare = isSafeSquare(x, y);
    let captured = false;
    
    console.log('Checking for captures at:', {x, y}, 'isSafe:', isOnSafeSquare);
    
    // Check for captures only if not on safe square
    if (!isOnSafeSquare) {
        // Check all opponent colors
        for (let opponentColor of gameState.colors) {
        if (opponentColor === attackerColor) continue;
        
        const opponentPath = getPathForColor(opponentColor);
        const opponentPieces = gameState.pieces[opponentColor];
        
        console.log('Checking', opponentColor, 'pieces:');
        
        for (let opponentPiece of opponentPieces) {
            if (opponentPiece.inHome || opponentPiece.finished) continue;
            
            const opponentCoords = opponentPath[opponentPiece.position];
            if (!opponentCoords) continue;
            
            const ox = opponentCoords.x;
            const oy = opponentCoords.y;
            console.log('  -', opponentPiece.id, 'at position', opponentPiece.position, '→', {ox, oy});
            
            if (ox === x && oy === y) {
                // Capture!
                opponentPiece.inHome = true;
                opponentPiece.position = -1;
                
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
                // Don't break - continue checking for more pieces at same location
            }
        }
        // Continue checking other colors even if we captured
    }
    }
    
    if (captured) {
        console.log('Capture detected - giving extra roll');
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
            console.log('Rolled a 6 - giving extra roll');
            // Give extra roll for 6
            turnDisplay.textContent = `${attackerColor.toUpperCase()}'s turn - Roll again!`;
            gameState.canMove = false;
            gameState.diceValue = null;
            document.getElementById('dice-value').textContent = '-';
        } else {
            console.log('Regular turn end - calling endTurn, rolledValue:', rolledValue);
            // Regular turn end - not a 6, no capture
            gameState.canMove = false;
            gameState.diceValue = null;
            document.getElementById('dice-value').textContent = '-';
            endTurn();
        }
    }
}

function selectPiece(pieceId, color) {
    // Only allow selecting pieces of current player's color
    if (color !== gameState.colors[gameState.currentPlayer]) {
        return;
    }
    
    // Must have rolled dice first
    if (!gameState.canMove || gameState.diceValue === null) {
        return;
    }
    
    // Remove previous selection
    const previousSelected = document.querySelector('.game-piece.selected');
    if (previousSelected) {
        previousSelected.classList.remove('selected');
        previousSelected.style.boxShadow = '';
    }
    
    // Select new piece
    gameState.selectedPiece = pieceId;
    const pieceElement = document.querySelector(`[data-id="${pieceId}"]`);
    pieceElement.classList.add('selected');
    pieceElement.style.boxShadow = '0 0 10px 3px yellow';
    
    // Clear canMove immediately to prevent double-moves
    gameState.canMove = false;
    
    // Attempt to move the piece
    movePiece(pieceId);
}

function movePiece(pieceId) {
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
            setTimeout(() => endTurn(), 1000);
            return;
        }

        piece.position = target;
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
}

function updatePiecePosition(piece, color) {
    const path = getPathForColor(color);
    const coords = path[piece.position];
    
    if (!coords) return;
    
    const pieceElement = document.querySelector(`[data-id="${piece.id}"]`);
    if (!pieceElement) return;
    
    // Remove from old cell
    if (pieceElement.parentElement) {
        pieceElement.parentElement.removeChild(pieceElement);
    }
    
    // Add to new cell
    const table = document.querySelector('.ludo-table');
    const rowIndex = table.rows.length - 1 - coords.y; // map logical y to rendered row
    const newCell = table.rows[rowIndex].cells[coords.x];
    newCell.appendChild(pieceElement);
}

function getPathForColor(color) {
    // Base path for Blue (start at 6,1) following user-specified loop to center
    const baseBlue = [
        {x:6,y:1}, {x:6,y:2}, {x:6,y:3}, {x:6,y:4}, {x:6,y:5}, {x:6,y:6},
        {x:5,y:6}, {x:4,y:6}, {x:3,y:6}, {x:2,y:6}, {x:1,y:6}, {x:0,y:6},
        {x:0,y:7}, {x:0,y:8},
        {x:1,y:8}, {x:2,y:8}, {x:3,y:8}, {x:4,y:8}, {x:5,y:8}, {x:6,y:8},
        {x:6,y:9}, {x:6,y:10}, {x:6,y:11}, {x:6,y:12}, {x:6,y:13}, {x:6,y:14},
        {x:7,y:14}, {x:8,y:14},
        {x:8,y:13}, {x:8,y:12}, {x:8,y:11}, {x:8,y:10}, {x:8,y:9}, {x:8,y:8},
        {x:9,y:8}, {x:10,y:8}, {x:11,y:8}, {x:12,y:8}, {x:13,y:8}, {x:14,y:8},
        {x:14,y:7}, {x:14,y:6},
        {x:13,y:6}, {x:12,y:6}, {x:11,y:6}, {x:10,y:6}, {x:9,y:6}, {x:8,y:6},
        {x:8,y:5}, {x:8,y:4}, {x:8,y:3}, {x:8,y:2}, {x:8,y:1}, {x:8,y:0},
        {x:7,y:0}, {x:7,y:1}, {x:7,y:2}, {x:7,y:3}, {x:7,y:4}, {x:7,y:5}, {x:7,y:6}, {x:7,y:7}
    ];

    function rotateCW(coord, times) {
        let x = coord.x, y = coord.y;
        const cx = 7, cy = 7;
        for (let i = 0; i < times; i++) {
            const dx = x - cx;
            const dy = y - cy;
            const nx = cx + dy;
            const ny = cy - dx;
            x = nx; y = ny;
        }
        return {x, y};
    }

    let times = 0;
    if (color === 'red') times = 1;      // 90° CW from blue
    else if (color === 'yellow') times = 2; // 180° from blue
    else if (color === 'green') times = 3;  // 270° CW from blue
    else times = 0; // blue

    return baseBlue.map(c => rotateCW(c, times));
}

function endTurn() {
    console.log('endTurn called - current player:', gameState.currentPlayer);
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
    
    // Move to next player immediately
    gameState.currentPlayer = (gameState.currentPlayer + 1) % 4;
    console.log('endTurn - new player:', gameState.currentPlayer, gameState.players[gameState.currentPlayer]);
    turnDisplay.textContent = `${gameState.players[gameState.currentPlayer]}'s turn`;
    turnDisplay.style.color = gameState.colors[gameState.currentPlayer];
    diceDisplay.textContent = '-';
}

// Set up dice button after board loads
document.addEventListener('DOMContentLoaded', () => {
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
});
