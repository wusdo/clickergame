// ======= Cross-Tab Synchronization System =======
let gameChannel;
try {
    gameChannel = new BroadcastChannel('clicker-game-sync');
} catch (e) {
    console.log("BroadcastChannel not supported, using fallback");
    gameChannel = { postMessage: () => {}, onmessage: null };
}

// ======= Oyun değişkenleri ve localStorage yükleme =======
function getNumber(key, defaultValue = 0) {
    const value = localStorage.getItem(key);
    if (value === null || value === undefined || value === "null" || value === "undefined") {
        return defaultValue;
    }
    const parsed = parseInt(value);
    return isNaN(parsed) ? defaultValue : parsed;
}

let gemCount = getNumber("playerGems", 0);
let clickPower = getNumber("clickPower", 1);
let clickerLevel = getNumber("clickerLevel", 0);
let autoMinerLevel = getNumber("autoMinerLevel", 0);
let superClickerLevel = getNumber("superClickerLevel", 0);
let myArmy = getNumber("myArmy", 0);
let autoMinerPower = 1;

// Autoclicker değişkenleri
let autoClickerActive = false;
let autoClickerInterval;
let minerAutoInterval;

let mouseX = 0;
let mouseY = 0;

const gemDisplay = document.querySelector(".gem-count");
const gem = document.querySelector(".gem");
const gemContainer = document.querySelector(".gem-container");
const upgrades = document.querySelectorAll(".upgrade");
const minerStorage = document.querySelector(".miner-storage");

// ======= Sync listeners for other tabs =======
if (gameChannel && gameChannel.addEventListener) {
    gameChannel.addEventListener('message', (event) => {
        if (event.data.type === 'state-update') {
            gemCount = event.data.gemCount || 0;
            clickPower = event.data.clickPower || 1;
            clickerLevel = event.data.clickerLevel || 0;
            autoMinerLevel = event.data.autoMinerLevel || 0;
            superClickerLevel = event.data.superClickerLevel || 0;
            myArmy = event.data.myArmy || 0;
            
            updateUI();
        }
    });
} else if (gameChannel) {
    gameChannel.onmessage = (event) => {
        if (event.data.type === 'state-update') {
            gemCount = event.data.gemCount || 0;
            clickPower = event.data.clickPower || 1;
            clickerLevel = event.data.clickerLevel || 0;
            autoMinerLevel = event.data.autoMinerLevel || 0;
            superClickerLevel = event.data.superClickerLevel || 0;
            myArmy = event.data.myArmy || 0;
            
            updateUI();
        }
    };
}

// Storage event listener for cross-tab sync (fallback)
window.addEventListener('storage', (e) => {
    if (e.key === 'playerGems') {
        gemCount = getNumber("playerGems", 0);
        updateUI();
    }
});

function updateUI() {
    if (gemDisplay) gemDisplay.textContent = gemCount;
    
    const myArmyElement = document.getElementById("myArmy");
    if (myArmyElement) {
        myArmyElement.textContent = myArmy;
    }
    
    const kingdomNameElement = document.getElementById("kingdom-name");
    if (kingdomNameElement) {
        const savedName = localStorage.getItem("kingdomName");
        if (savedName) kingdomNameElement.textContent = savedName;
    }
    
    upgrades.forEach(upgrade => {
        const type = upgrade.dataset.type;
        const levelSpan = upgrade.querySelector(".upgrade-level");
        if (!levelSpan) return;
        
        if(type === "clicker") levelSpan.textContent = clickerLevel;
        if(type === "auto") levelSpan.textContent = autoMinerLevel;
        if(type === "super-clicker") levelSpan.textContent = superClickerLevel;
    });
}

// ======= Broadcast state to other tabs =======
function broadcastState() {
    try {
        if (gameChannel && gameChannel.postMessage) {
            gameChannel.postMessage({
                type: 'state-update',
                gemCount: gemCount,
                clickPower: clickPower,
                clickerLevel: clickerLevel,
                autoMinerLevel: autoMinerLevel,
                superClickerLevel: superClickerLevel,
                myArmy: myArmy
            });
        }
    } catch (e) {
        console.log("Could not broadcast state");
    }
}

// ======= Mouse pozisyonu =======
document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

// ======= Gem tıklama =======
if (gem) {
    gem.addEventListener("click", (e) => {
        addGems(clickPower, e);
    });
}

// ======= Upgrade satın alma =======
upgrades.forEach(upgrade => {
    const btn = upgrade.querySelector(".buy-btn");
    if (!btn) return;
    
    btn.addEventListener("click", () => {
        const type = upgrade.dataset.type;
        let levelSpan = upgrade.querySelector(".upgrade-level");
        let costSpan = upgrade.querySelector(".upgrade-cost");
        if (!levelSpan || !costSpan) return;
        
        let level = parseInt(levelSpan.textContent) || 0;
        let cost = parseInt(costSpan.textContent) || 0;

        if (gemCount >= cost) {
            gemCount -= cost;

            if (type === "clicker") {
                clickPower += 1;
                clickerLevel++;
                levelSpan.textContent = clickerLevel;
                costSpan.textContent = Math.floor(cost * 1.5);
                showToast(`Clicker level ${clickerLevel} alındı!`);
            } else if (type === "auto") {
                autoMinerLevel++;
                levelSpan.textContent = autoMinerLevel;
                costSpan.textContent = Math.floor(cost * 1.5);
                showToast(`Auto Miner level ${autoMinerLevel} alındı!`);
                addMinerVisual();
            } else if (type === "super-clicker") {
                clickPower += 5;
                superClickerLevel++;
                levelSpan.textContent = superClickerLevel;
                costSpan.textContent = Math.floor(cost * 2);
                showToast(`Super Clicker level ${superClickerLevel} alındı!`);
            }

            saveGame();
            if (gemDisplay) gemDisplay.textContent = gemCount;
            createStar(mouseX, mouseY);
            scatterUpgradeGems();
        } else {
            showToast("Yeterli gem yok!");
        }
    });
});

// ======= Auto Miner interval =======
minerAutoInterval = setInterval(() => {
    if(autoMinerLevel > 0 && minerStorage){
        for(let i=0;i<autoMinerLevel;i++){
            let minerImgs = minerStorage.querySelectorAll("img");
            if(minerImgs[i]){
                const rect = minerImgs[i].getBoundingClientRect();
                addGems(autoMinerPower, {clientX: rect.left+15, clientY: rect.top+15});
            }
        }
    }
}, 1000);

// ======= Gem ekleme ve animasyon =======
function addGems(amount, e=null){
    gemCount += amount;
    saveGame();
    animateGemPop(amount, e);
    animateGem();
    animateGemNumber(amount);
}

// Gem tıklama animasyonu
function animateGem() {
    if (!gem) return;
    gem.style.transform = "scale(1.1)";
    setTimeout(() => gem.style.transform = "scale(1)", 100);
}

// Gem pop animasyonu
function animateGemPop(amount, e){
    if (!gemContainer) return;
    
    const pop = document.createElement("div");
    pop.textContent = `+${amount}`;
    pop.className = "gem-pop";

    if(autoClickerActive){
        pop.style.color = `hsl(${Math.random()*360}, 100%, 50%)`;
    } else {
        pop.style.color = "#ffffff";
    }

    gemContainer.appendChild(pop);

    if (!gem) return;
    const rect = gem.getBoundingClientRect();
    let left = rect.width/2 - 10;
    let top = rect.height/2 - 20;

    if(e){
        left = e.clientX - rect.left - 10;
        top = e.clientY - rect.top - 20;
    } else {
        left = Math.random() * rect.width;
        top = Math.random() * rect.height;
    }

    pop.style.left = left + "px";
    pop.style.top = top + "px";

    setTimeout(() => pop.remove(), 600);
}

// Gem sayısı animasyonu
function animateGemNumber(amount){
    if (!gemDisplay) return;
    
    let step = 0;
    const interval = setInterval(() => {
        if(step >= amount){
            clearInterval(interval);
            gemDisplay.textContent = gemCount;
        } else {
            gemDisplay.textContent = (parseInt(gemDisplay.textContent) || 0) + 1;
            step++;
        }
    }, 10);
}

// ======= Toast mesaj =======
function showToast(message){
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(()=>toast.remove(), 3000);
}

// ======= Autoclicker =======
document.addEventListener("keydown", (e) => {
    if(e.key.toLowerCase() === "x"){
        autoClickerActive = !autoClickerActive;
        if(autoClickerActive){
            showToast("Autoclicker aktif!");
            document.body.classList.add("autoclicker-active");
            autoClickerInterval = setInterval(() => {
                simulateClick(mouseX, mouseY);
            }, 1);
        } else {
            showToast("Autoclicker kapalı!");
            document.body.classList.remove("autoclicker-active");
            clearInterval(autoClickerInterval);
        }
    }
});

// Virtual click
function simulateClick(x, y){
    const element = document.elementFromPoint(x, y);
    if(!element) return;

    if(element.classList.contains("gem") || element.classList.contains("buy-btn")){
        const event = new MouseEvent("click", {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y
        });
        element.dispatchEvent(event);
    }
}

// ======= Star patlaması =======
function createStar(x, y){
    const star = document.createElement("div");
    star.className = "star";
    star.style.left = x + "px";
    star.style.top = y + "px";
    star.style.background = `hsl(${Math.random()*360}, 100%, 80%)`;
    document.body.appendChild(star);
    setTimeout(()=>star.remove(), 1000);
}

// ======= Miner görseli ekleme =======
function addMinerVisual(){
    if (!minerStorage) return;
    
    const minerImg = document.createElement("img");
    minerImg.src = "assets/miner.svg";
    minerImg.style.transform = "scale(0)";
    minerStorage.appendChild(minerImg);
    setTimeout(()=>minerImg.style.transform = "scale(1)", 50);
}

// Upgrade patlaması
function scatterUpgradeGems(){
    for(let i=0;i<5;i++){
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight;
        animateGemPop(1, {clientX: x, clientY: y});
        createStar(x, y);
    }
}

// ======= Battle sayfasına geçiş =======
const battleBtn = document.getElementById("battle-btn");
if (battleBtn) {
    battleBtn.addEventListener("click", () => {
        saveGame();
        window.location.href = "battle.html";
    });
}

// ======= Ayarlar paneli =======
function toggleSettings() {
    const panel = document.getElementById("settingsPanel");
    if (panel) {
        panel.style.display = (panel.style.display === "block") ? "none" : "block";
    }
}

function closeSettings() {
    const panel = document.getElementById("settingsPanel");
    if (panel) {
        panel.style.display = "none";
    }
}

function changeTheme(themeName) {
    document.body.classList.remove('theme1','theme2','theme3','theme4','theme5');
    document.body.classList.add(themeName);
    localStorage.setItem("selectedTheme", themeName);
}

// ======= Krallık ismi =======
const kingdomNameSpan = document.getElementById("kingdom-name");
const kingdomInput = document.getElementById("kingdom-input");
const setKingdomBtn = document.getElementById("set-kingdom");

let kingdomName = localStorage.getItem("kingdomName") || "My Kingdom";
if (kingdomNameSpan) {
    kingdomNameSpan.textContent = kingdomName;
}

if (setKingdomBtn) {
    setKingdomBtn.addEventListener("click", () => {
        if (!kingdomInput) return;
        
        const name = kingdomInput.value.trim();
        if(name !== ""){
            kingdomName = name;
            if (kingdomNameSpan) {
                kingdomNameSpan.textContent = kingdomName;
            }
            saveGame();
            kingdomInput.value = "";
        }
    });
}

// ======= Game verilerini kaydet =======
function saveGame(){
    try {
        localStorage.setItem("playerGems", gemCount.toString());
        localStorage.setItem("clickPower", clickPower.toString());
        localStorage.setItem("clickerLevel", clickerLevel.toString());
        localStorage.setItem("autoMinerLevel", autoMinerLevel.toString());
        localStorage.setItem("autoMinerPower", autoMinerPower.toString());
        localStorage.setItem("superClickerLevel", superClickerLevel.toString());
        localStorage.setItem("myArmy", myArmy.toString());
        localStorage.setItem("kingdomName", kingdomName);
        
        // Broadcast to other tabs
        broadcastState();
    } catch (e) {
        console.error("Could not save game:", e);
    }
}

// ======= Sayfa yüklenince verileri göster =======
window.addEventListener("load", () => {
    // Load saved theme
    const savedTheme = localStorage.getItem("selectedTheme");
    if (savedTheme) {
        changeTheme(savedTheme);
    }
    
    updateUI();

    for(let i=0;i<autoMinerLevel;i++){
        addMinerVisual();
    }
    
    // Initial save to ensure data is stored
    saveGame();
});