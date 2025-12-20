// State
let players = [];
let gameState = {
    bootAmount: 50,
    currentPot: 0,
    lastUpdated: Date.now()
};

// Selectors
const potDisplay = document.getElementById('currentPot');
const playersGrid = document.getElementById('playersGrid');
const statsTableBody = document.getElementById('statsTableBody');
const bootInput = document.getElementById('bootAmount');
const newPlayerInput = document.getElementById('newPlayerName');

// Constants
const STORAGE_KEY_PLAYERS = 'teen_patti_players';
const STORAGE_KEY_GAME = 'teen_patti_game';

// Initialization
function init() {
    loadData();
    // If no players, add some placeholders or defaults? No, let user add.
    render();
}

// Data Handling
function loadData() {
    const savedPlayers = localStorage.getItem(STORAGE_KEY_PLAYERS);
    const savedGame = localStorage.getItem(STORAGE_KEY_GAME);

    if (savedPlayers) {
        players = JSON.parse(savedPlayers);
    }

    if (savedGame) {
        gameState = JSON.parse(savedGame);
        bootInput.value = gameState.bootAmount;
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY_PLAYERS, JSON.stringify(players));
    localStorage.setItem(STORAGE_KEY_GAME, JSON.stringify(gameState));
    render();
}

// Core Actions

function addPlayer(initialName = null) {
    const name = initialName || newPlayerInput.value.trim();
    if (!name) return alert("Please enter a name");

    const newPlayer = {
        id: Date.now() + Math.random(),
        name: name,
        balance: 0,
        added: 0,
        paid: 0,
        won: 0,
        isFolded: false
    };

    players.push(newPlayer);
    newPlayerInput.value = '';
    saveData();
}

// Alias for button click
function addNewPlayer() {
    addPlayer();
}

function updateBoot(newAmount) {
    gameState.bootAmount = parseInt(newAmount) || 0;
    saveData();
}

// Helper for +/- buttons
function adjustBoot(delta) {
    let current = parseInt(bootInput.value) || 0;
    let newVal = current + delta;
    if (newVal < 0) newVal = 0;
    bootInput.value = newVal;
    updateBoot(newVal);
}

// Listen for manual input changes
bootInput.addEventListener('change', (e) => updateBoot(e.target.value));

function payMoney(playerId, amount = null) {
    const p = players.find(p => p.id === playerId);
    if (!p) return;

    // If amount not specified, assume it's a BOOT/CHAAL based on input or prompt
    // For simplicity in this UI, the "PAY" button will ask? Or just pay boot?
    // Let's make the "PAY" button default to Boot Amount, but ask if different?
    // User requested: "Pay Boot / Chaal" button.

    // To keep it fast: Single click pays Boot Amount. Long press or different button?
    // Let's just use current Boot Amount as the base unit. 
    // Ideally user might want to pay 2x boot (blind) or something.
    // Let's Prompt for flexibility, but default to boot.

    let payAmount = amount;
    if (payAmount === null) {
        let input = prompt(`Pay amount for ${p.name}?`, gameState.bootAmount);
        if (input === null) return; // Cancelled
        payAmount = parseInt(input);
    }

    if (isNaN(payAmount) || payAmount <= 0) return alert("Invalid Amount");

    p.balance -= payAmount;
    p.paid += payAmount;
    gameState.currentPot += payAmount;

    saveData();
}

function addMoney(playerId) {
    const p = players.find(p => p.id === playerId);
    if (!p) return;

    let input = prompt(`Add money to ${p.name}'s balance:`, 500);
    if (input === null) return;
    let amount = parseInt(input);

    if (isNaN(amount) || amount <= 0) return alert("Invalid Amount");

    p.balance += amount;
    p.added += amount;

    saveData();
}

function winPot(playerId) {
    const p = players.find(p => p.id === playerId);
    if (!p) return;

    if (gameState.currentPot === 0) return alert("Pot is empty");

    if (!confirm(`${p.name} won the pot of ₹${gameState.currentPot}?`)) return;

    const pot = gameState.currentPot;
    p.balance += pot;
    p.won += pot;
    gameState.currentPot = 0;

    // Auto reset folds?
    // Usually new round starts after win.
    // We'll leave it to manual "New Round" or do it here?
    // User asked for "Round Control" separately. So just Win here.

    saveData();
}

function toggleFold(playerId) {
    const p = players.find(p => p.id === playerId);
    if (!p) return;
    p.isFolded = !p.isFolded;
    saveData();
}

function newRound() {
    const boot = gameState.bootAmount;
    if (!confirm(`Start New Round?\nEveryone will pay Boot: ₹${boot}\n(Total to Pot: ₹${boot * players.length})`)) return;

    players.forEach(p => {
        p.isFolded = false;
        p.balance -= boot;
        p.paid += boot;
    });

    gameState.currentPot += (boot * players.length);
    saveData();
}

function confirmResetGame() {
    if (confirm("RESET ALL DATA?\nThis will clear all balances and players!")) {
        players = [];
        gameState = { bootAmount: 50, currentPot: 0 };
        saveData();
    }
}

// Rendering
function render() {
    // Pot
    potDisplay.innerText = `₹${gameState.currentPot}`;

    // Players
    playersGrid.innerHTML = '';

    if (players.length === 0) {
        playersGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #666; padding: 20px;">No players yet. Add one below!</div>';
    }

    players.forEach(p => {
        const card = document.createElement('div');
        card.className = `player-card ${p.isFolded ? 'folded' : ''}`;

        card.innerHTML = `
            <div class="player-header">
                <span class="player-name">${p.name}</span>
                <span class="player-balance">₹${p.balance}</span>
            </div>
            <div class="player-actions">
                <button class="action-btn btn-add" onclick="addMoney(${p.id})">+Buy</button>
                <button class="action-btn btn-pay" onclick="payMoney(${p.id})">Pay</button>
                <button class="action-btn btn-win" onclick="winPot(${p.id})">Win</button>
                <button class="action-btn btn-fold" onclick="toggleFold(${p.id})">${p.isFolded ? 'In' : 'Fold'}</button>
            </div>
        `;
        playersGrid.appendChild(card);
    });

    // Table
    statsTableBody.innerHTML = '';
    players.forEach(p => {
        let net = p.balance - p.added; // Net actually is tricky. 
        // Logic: Balance = Added - Paid + Won.
        // So Net Profit = Balance - Added? 
        // If I Add 500, pay 100, balance is 400. My "Profit"? No, I have 400 chips.
        // "Net Profit/Loss" usually means: Current Value (Balance) - Cost (Added).
        // Yes. If I have 400 chips and bought for 500, I am at -100.

        const netVal = p.balance - p.added;
        const netClass = netVal >= 0 ? 'profit' : 'loss';
        const netSign = netVal >= 0 ? '+' : '';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${p.name}</td>
            <td style="font-weight:bold">₹${p.balance}</td>
            <td>₹${p.added}</td>
            <td style="color:#e57373">₹${p.paid}</td>
            <td style="color:#81c784">₹${p.won}</td>
            <td class="${netClass}">${netSign}₹${netVal}</td>
        `;
        statsTableBody.appendChild(row);
    });
}

// Start
init();
