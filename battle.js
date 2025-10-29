// Player verisi index.html’den alınır
let playerGems = parseInt(localStorage.getItem("playerGems")) || 0;
let kingdomName = localStorage.getItem("kingdomName") || "My Kingdom";
document.getElementById("kingdom-name").textContent = kingdomName;
document.getElementById("battle-gems").textContent = playerGems;

// Enemy ve warrior ayarları
const warriorPanels = document.querySelector(".warrior-panels");
const addBtn = document.getElementById("add-warrior-btn");
const battleLog = document.getElementById("battle-log");
let warriorCount = 0;
let autoAttackInterval = null;
const enemyNames = ["Goblin","Orc","Troll","Dark Knight"];
const warriorData = {};

// Yeni warrior ekleme
function addWarrior() {
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

    // Warrior paneli oluştur
    const div = document.createElement("div");
    div.className = "battle-field";
    div.id = `warrior-${n}-field`;
    div.innerHTML = `
        <div class="player">
            <img src="assets/player.svg" class="player-img">
            <div class="hp-bar"><div class="hp-fill" id="player${n}-hp"></div></div>
            <p>Strength: <span id="player${n}-strength">${warriorData[n].playerStrength}</span></p>
        </div>
        <div class="enemy">
            <img src="assets/enemy.svg" class="enemy-img">
            <div class="hp-bar"><div class="hp-fill" id="enemy${n}-hp"></div></div>
            <p id="enemy${n}-name">${warriorData[n].currentEnemy} (Lv1) <img src="assets/gold.svg" class="gold-icon"> ${warriorData[n].enemyGold}</p>
        </div>
    `;
    warriorPanels.appendChild(div);

    // HP barlarını güncelle
    document.getElementById(`player${n}-hp`).style.width = "100%";
    document.getElementById(`enemy${n}-hp`).style.width = "100%";

    // Panele tıklama ile attack ekle
    div.addEventListener("click", () => attack(n));
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
    document.getElementById(`enemy${warrior}-hp`).style.width = (data.enemyHP / data.enemyMaxHP * 100) + "%";

    // Log player attack
    appendLog(`Warrior ${warrior} attacked ${data.currentEnemy} for ${dmg} damage${critical?" (CRITICAL!)":""}`, "player");

    if (data.enemyHP === 0) {
        playerGems += data.enemyGold;
        document.getElementById("battle-gems").textContent = playerGems;
        localStorage.setItem("playerGems", playerGems);

        appendLog(`${data.currentEnemy} defeated! +${data.enemyGold} Gems`, "player");

        levelUpEnemy(warrior);
    } else {
        enemyAttack(warrior);
    }
}

// Enemy saldırısı
function enemyAttack(warrior) {
    const data = warriorData[warrior];
    const dmg = Math.floor(Math.random() * 10 + 5);
    data.playerHP -= dmg;
    if (data.playerHP < 0) data.playerHP = 0;
    document.getElementById(`player${warrior}-hp`).style.width = (data.playerHP / data.playerMaxHP * 100) + "%";

    appendLog(`${data.currentEnemy} attacked Warrior ${warrior} for ${dmg} damage`, "enemy");

    if (data.playerHP === 0) {
        data.playerHP = data.playerMaxHP;
        document.getElementById(`player${warrior}-hp`).style.width = "100%";
        appendLog(`Warrior ${warrior} was defeated but revived!`, "enemy");
    }
}

// Enemy reset ve seviye artışı
function levelUpEnemy(warrior) {
    const data = warriorData[warrior];
    data.enemyLevel++;
    data.enemyMaxHP += 10; 
    data.enemyHP = data.enemyMaxHP;
    data.enemyGold = Math.floor(Math.random() * 20 + 10) * data.enemyLevel; 
    data.currentEnemy = enemyNames[Math.floor(Math.random() * enemyNames.length)];
    document.getElementById(`enemy${warrior}-hp`).style.width = "100%";
    document.getElementById(`enemy${warrior}-name`).innerHTML = `${data.currentEnemy} (Lv${data.enemyLevel}) <img src="assets/gold.svg" class="gold-icon"> ${data.enemyGold}`;
}

// Battle log ekleme fonksiyonu
function appendLog(text, type) {
    if (!battleLog) return;
    const p = document.createElement("p");
    p.textContent = text;
    p.className = type === "player" ? "player-log" : "enemy-log";
    battleLog.appendChild(p);
    battleLog.scrollTop = battleLog.scrollHeight; // scroll en alta
}

// Auto attack
document.getElementById("auto-attack-btn").addEventListener("click", () => {
    if (autoAttackInterval) {
        clearInterval(autoAttackInterval);
        autoAttackInterval = null;
        document.getElementById("auto-attack-btn").textContent = "Auto Attack";
        appendLog("Auto Attack stopped.", "enemy");
    } else {
        autoAttackInterval = setInterval(() => {
            for (let i = 1; i <= warriorCount; i++) {
                attack(i);
            }
        }, 200); 
        document.getElementById("auto-attack-btn").textContent = "Stop Auto Attack";
        appendLog("Auto Attack started.", "player");
    }
});



// +1 Warrior butonu
addBtn.addEventListener("click", addWarrior);

// Başlangıçta 1 warrior
addWarrior();

// Back to clicker
document.getElementById("back-btn").addEventListener("click", () => {
    localStorage.setItem("playerGems", playerGems);
    window.location.href = "index.html";
});

// Army panel toggle
const armyBtn = document.getElementById("army-btn");
const warriorPanelsDiv = document.querySelector(".warrior-panels");
warriorPanelsDiv.style.display = "none";

armyBtn.addEventListener("click", () => {
    warriorPanelsDiv.style.display = (warriorPanelsDiv.style.display === "none") ? "flex" : "none";
});
