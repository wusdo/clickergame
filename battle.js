// ======= Cross-Tab Synchronization System =======
let gameChannel;
try {
    gameChannel = new BroadcastChannel('clicker-game-sync');
} catch (e) {
    console.log("BroadcastChannel not supported, using fallback");
    gameChannel = { postMessage: () => {}, onmessage: null };
}

// Safe number getter
function getNumber(key, defaultValue = 0) {
    const value = localStorage.getItem(key);
    if (value === null || value === undefined || value === "null" || value === "undefined") {
        return defaultValue;
    }
    const parsed = parseInt(value);
    return isNaN(parsed) ? defaultValue : parsed;
}

// Player verisi index.html'den alınır
let playerGems = getNumber("playerGems", 0);
let kingdomName = localStorage.getItem("kingdomName") || "My Kingdom";
let myArmy = getNumber("myArmy", 0);
let autoMinerLevel = getNumber("autoMinerLevel", 0);
let autoAttackActive = (localStorage.getItem("autoAttackActive") === "true") || false;

const kingdomNameElement = document.getElementById("kingdom-name");
const battleGemsElement = document.getElementById("battle-gems");

if (kingdomNameElement) kingdomNameElement.textContent = kingdomName;
if (battleGemsElement) battleGemsElement.textContent = playerGems;

// ======= Sync listeners for other tabs =======
if (gameChannel && gameChannel.addEventListener) {
    gameChannel.addEventListener('message', (event) => {
        if (event.data.type === 'state-update') {
            playerGems = event.data.gemCount || 0;
            myArmy = event.data.myArmy || 0;
            autoMinerLevel = event.data.autoMinerLevel || 0;
            
            if (battleGemsElement) battleGemsElement.textContent = playerGems;
        }
    });
} else if (gameChannel) {
    gameChannel.onmessage = (event) => {
        if (event.data.type === 'state-update') {
            playerGems = event.data.gemCount || 0;
            myArmy = event.data.myArmy || 0;
            autoMinerLevel = event.data.autoMinerLevel || 0;
            
            if (battleGemsElement) battleGemsElement.textContent = playerGems;
        }
    };
}

// Storage event listener for cross-tab sync
window.addEventListener('storage', (e) => {
    if (e.key === 'playerGems') {
        playerGems = getNumber("playerGems", 0);
        if (battleGemsElement) battleGemsElement.textContent = playerGems;
    }
});

// ======= Broadcast state to other tabs =======
function broadcastState() {
    try {
        if (gameChannel && gameChannel.postMessage) {
            gameChannel.postMessage({
                type: 'state-update',
                gemCount: playerGems,
                clickPower: getNumber("clickPower", 1),
                clickerLevel: getNumber("clickerLevel", 0),
                autoMinerLevel: autoMinerLevel,
                superClickerLevel: getNumber("superClickerLevel", 0),
                myArmy: myArmy
            });
        }
    } catch (e) {
        console.log("Could not broadcast state");
    }
}

// ======= Auto earn gems from miners (works in background) =======
setInterval(() => {
    if (autoMinerLevel > 0) {
        playerGems += autoMinerLevel;
        localStorage.setItem("playerGems", playerGems.toString());
        if (battleGemsElement) battleGemsElement.textContent = playerGems;
        broadcastState();
    }
}, 1000);

// Enemy ve warrior ayarları
const warriorPanels = document.querySelector(".warrior-panels");
const addBtn = document.getElementById("add-warrior-btn");
let warriorCount = 0;
let autoAttackInterval = null;
const enemyNames = ["Goblin","Orc","Troll","Dark Knight"];
const warriorData = {};

// ======= Load warrior data from localStorage =======
function loadWarriors() {
    try {
        const savedWarriors = localStorage.getItem("warriorData");
        const savedCount = localStorage.getItem("warriorCount");
        
        if (savedWarriors && savedCount) {
            warriorCount = parseInt(savedCount) || 0;
            const parsedData = JSON.parse(savedWarriors);
            
            // Restore all warriors
            for (let i = 1; i <= warriorCount; i++) {
                if (parsedData[i]) {
                    warriorData[i] = parsedData[i];
                    createWarriorPanel(i);
                }
            }
        }
    } catch (e) {
        console.error("Could not load warriors:", e);
    }
}

// ======= Save warrior data to localStorage =======
function saveWarriors() {
    try {
        localStorage.setItem("warriorData", JSON.stringify(warriorData));
        localStorage.setItem("warriorCount", warriorCount.toString());
    } catch (e) {
        console.error("Could not save warriors:", e);
    }
}

// ======= Create warrior panel (for both new and loaded warriors) =======
function createWarriorPanel(n) {
    if (!warriorPanels) return;
    
    const data = warriorData[n];
    if (!data) return;
    
    // Check if panel already exists
    if (document.getElementById(`warrior-${n}-field`)) {
        return;
    }
    
    const playerHpPercent = (data.playerHP / data.playerMaxHP * 100);
    const enemyHpPercent = (data.enemyHP / data.enemyMaxHP * 100);
    
    const div = document.createElement("div");
    div.className = "battle-field";
    div.id = `warrior-${n}-field`;
    div.innerHTML = `
        <div class="player">
            <img src="assets/player.svg" class="player-img" alt="Player" onerror="this.style.display='none'">
            <div class="hp-bar"><div class="hp-fill" id="player${n}-hp" style="width: ${playerHpPercent}%; height: 100%; background: #4CAF50; transition: width 0.3s;"></div></div>
            <p>Strength: <span id="player${n}-strength">${data.playerStrength}</span></p>
        </div>
        <div class="enemy">
            <img src="assets/enemy.svg" class="enemy-img" alt="Enemy" onerror="this.style.display='none'">
            <div class="hp-bar"><div class="hp-fill" id="enemy${n}-hp" style="width: ${enemyHpPercent}%; height: 100%; background: #4CAF50; transition: width 0.3s;"></div></div>
            <p id="enemy${n}-name">${data.currentEnemy} (Lv${data.enemyLevel}) 💰 ${data.enemyGold}</p>
        </div>
    `;
    warriorPanels.appendChild(div);

    // Panele tıklama ile attack ekle
    div.addEventListener("click", () => attack(n));
}

// Yeni warrior ekleme
function addWarrior() {
    const warriorCost = 100;
    
    if (playerGems >= warriorCost) {
        playerGems -= warriorCost;
        myArmy++;
        localStorage.setItem("playerGems", playerGems.toString());
        localStorage.setItem("myArmy", myArmy.toString());
        if (battleGemsElement) battleGemsElement.textContent = playerGems;
        broadcastState();
        
        warriorCount++;
        const n = warriorCount;

        // Başlangıç değerleri
        warriorData[n] = {
            playerHP: 120,
            playerMaxHP: 120,
            playerStrength: 15,
            enemyHP: 50,
            enemyMaxHP: 50,
            enemyGold: 15,
            enemyLevel: 1,
            currentEnemy: enemyNames[Math.floor(Math.random() * enemyNames.length)]
        };

        createWarriorPanel(n);
        saveWarriors();
        
        showToast("Warrior added to your army!");
    } else {
        showToast("Not enough gems! Need 100 gems.");
    }
}

// Saldırı fonksiyonu
function attack(warrior) {
    const data = warriorData[warrior];
    if (!data) return;

    let dmg = data.playerStrength;
    let critical = false;
    if (Math.random() < 0.2) {
        dmg *= 2; 
        critical = true;
    }
    data.enemyHP -= dmg;
    if (data.enemyHP < 0) data.enemyHP = 0;
    
    const enemyHpBar = document.getElementById(`enemy${warrior}-hp`);
    if (enemyHpBar) {
        enemyHpBar.style.width = (data.enemyHP / data.enemyMaxHP * 100) + "%";
    }

    if (data.enemyHP === 0) {
        playerGems += data.enemyGold;
        if (battleGemsElement) battleGemsElement.textContent = playerGems;
        localStorage.setItem("playerGems", playerGems.toString());
        broadcastState();

        levelUpEnemy(warrior);
    } else {
        enemyAttack(warrior);
    }
    
    saveWarriors();
}

// Enemy saldırısı
function enemyAttack(warrior) {
    const data = warriorData[warrior];
    if (!data) return;
    
    const dmg = Math.floor(Math.random() * 10 + 5);
    data.playerHP -= dmg;
    if (data.playerHP < 0) data.playerHP = 0;
    
    const playerHpBar = document.getElementById(`player${warrior}-hp`);
    if (playerHpBar) {
        playerHpBar.style.width = (data.playerHP / data.playerMaxHP * 100) + "%";
    }

    if (data.playerHP === 0) {
        data.playerHP = data.playerMaxHP;
        if (playerHpBar) {
            playerHpBar.style.width = "100%";
        }
    }
}

// Enemy reset ve seviye artışı
function levelUpEnemy(warrior) {
    const data = warriorData[warrior];
    if (!data) return;
    
    data.enemyLevel++;
    data.enemyMaxHP += 10; 
    data.enemyHP = data.enemyMaxHP;
    data.enemyGold = Math.floor(Math.random() * 20 + 10) * data.enemyLevel; 
    data.currentEnemy = enemyNames[Math.floor(Math.random() * enemyNames.length)];
    
    const enemyHpBar = document.getElementById(`enemy${warrior}-hp`);
    if (enemyHpBar) {
        enemyHpBar.style.width = "100%";
    }
    
    const enemyName = document.getElementById(`enemy${warrior}-name`);
    if (enemyName) {
        enemyName.textContent = `${data.currentEnemy} (Lv${data.enemyLevel}) 💰 ${data.enemyGold}`;
    }
}

// ======= Background auto-attack (works even when page is closed) =======
function backgroundAutoAttack() {
    if (!autoAttackActive) return;
    
    const lastBattleTime = getNumber("lastBattleTime", Date.now());
    const currentTime = Date.now();
    const timeAway = Math.floor((currentTime - lastBattleTime) / 1000); // seconds
    
    if (timeAway > 0 && warriorCount > 0) {
        // Calculate offline battles (1 attack every 0.2 seconds per warrior)
        const totalAttacks = Math.floor(timeAway * 5) * warriorCount; // 5 attacks per second per warrior
        const gemsPerAttack = 15; // Average gems per attack
        const offlineGems = Math.floor(totalAttacks * gemsPerAttack * 0.5); // 50% efficiency for offline
        
        if (offlineGems > 0) {
            playerGems += offlineGems;
            localStorage.setItem("playerGems", playerGems.toString());
            if (battleGemsElement) battleGemsElement.textContent = playerGems;
            broadcastState();
            
            showToast(`Warriors earned ${offlineGems} gems while you were away!`);
        }
    }
    
    localStorage.setItem("lastBattleTime", Date.now().toString());
}

// Update last battle time periodically
setInterval(() => {
    if (autoAttackActive) {
        localStorage.setItem("lastBattleTime", Date.now().toString());
    }
}, 5000);

// Toast messages
function showToast(message) {
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 15px 25px;
        background: rgba(76, 175, 80, 0.9);
        color: white;
        border-radius: 8px;
        z-index: 10000;
        font-weight: bold;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s';
    }, 2500);
    
    setTimeout(() => toast.remove(), 3000);
}

// Auto attack
const autoAttackBtn = document.getElementById("auto-attack-btn");
if (autoAttackBtn) {
    autoAttackBtn.addEventListener("click", () => {
        if (autoAttackInterval) {
            clearInterval(autoAttackInterval);
            autoAttackInterval = null;
            autoAttackActive = false;
            localStorage.setItem("autoAttackActive", "false");
            autoAttackBtn.textContent = "Auto Attack";
            showToast("Auto Attack stopped");
        } else {
            if (warriorCount === 0) {
                showToast("Add warriors first!");
                return;
            }
            autoAttackActive = true;
            localStorage.setItem("autoAttackActive", "true");
            localStorage.setItem("lastBattleTime", Date.now().toString());
            
            autoAttackInterval = setInterval(() => {
                for (let i = 1; i <= warriorCount; i++) {
                    if (warriorData[i]) {
                        attack(i);
                    }
                }
            }, 200); 
            autoAttackBtn.textContent = "Stop Auto Attack";
            showToast("Auto Attack activated - Warriors will fight even when you leave!");
        }
    });
}

// +1 Warrior butonu
if (addBtn) {
    addBtn.addEventListener("click", addWarrior);
}

// Back to clicker
const backBtn = document.getElementById("back-btn");
if (backBtn) {
    backBtn.addEventListener("click", () => {
        saveWarriors();
        localStorage.setItem("playerGems", playerGems.toString());
        window.location.href = "index.html";
    });
}

// Army panel toggle
const armyBtn = document.getElementById("army-btn");
const warriorPanelsDiv = document.querySelector(".warrior-panels");

if (warriorPanelsDiv) {
    warriorPanelsDiv.style.display = "none";
}

if (armyBtn && warriorPanelsDiv) {
    armyBtn.addEventListener("click", () => {
        if (warriorPanelsDiv.style.display === "none") {
            warriorPanelsDiv.style.display = "flex";
            if (warriorCount === 0) {
                showToast("Click '+1 Warrior' to add warriors to your army!");
            }
        } else {
            warriorPanelsDiv.style.display = "none";
        }
    });
}

// ======= Initialize on page load =======
window.addEventListener("load", () => {
    // Load saved warriors
    loadWarriors();
    
    // Calculate offline battle earnings
    backgroundAutoAttack();
    
    // Resume auto-attack if it was active
    if (autoAttackActive && warriorCount > 0 && autoAttackBtn) {
        autoAttackInterval = setInterval(() => {
            for (let i = 1; i <= warriorCount; i++) {
                if (warriorData[i]) {
                    attack(i);
                }
            }
        }, 200);
        autoAttackBtn.textContent = "Stop Auto Attack";
    }
});