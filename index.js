// ======= Cross-Tab Synchronization System =======
const gameChannel = new BroadcastChannel('clicker-game-sync');

// ======= Oyun değişkenleri ve localStorage yükleme =======
let gemCount = parseInt(localStorage.getItem("playerGems")) || 0;
let clickPower = parseInt(localStorage.getItem("clickPower")) || 1;
let clickerLevel = parseInt(localStorage.getItem("clickerLevel")) || 0;
let autoMinerLevel = parseInt(localStorage.getItem("autoMinerLevel")) || 0;
let superClickerLevel = parseInt(localStorage.getItem("superClickerLevel")) || 0;
let myArmy = parseInt(localStorage.getItem("myArmy")) || 0;
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
gameChannel.onmessage = (event) => {
    if (event.data.type === 'state-update') {
        gemCount = event.data.gemCount;
        clickPower = event.data.clickPower;
        clickerLevel = event.data.clickerLevel;
        autoMinerLevel = event.data.autoMinerLevel;
        superClickerLevel = event.data.superClickerLevel;
        myArmy = event.data.myArmy;
        
        // Update UI
        gemDisplay.textContent = gemCount;
        const myArmyElement = document.getElementById("myArmy");
        if (myArmyElement) {
            myArmyElement.textContent = myArmy;
        }
        
        upgrades.forEach(upgrade => {
            const type = upgrade.dataset.type;
            const levelSpan = upgrade.querySelector(".upgrade-level");
            if(type === "clicker") levelSpan.textContent = clickerLevel;
            if(type === "auto") levelSpan.textContent = autoMinerLevel;
            if(type === "super-clicker") levelSpan.textContent = superClickerLevel;
        });
    }
};

// ======= Broadcast state to other tabs =======
function broadcastState() {
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

// ======= Mouse pozisyonu =======
document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

// ======= Gem tıklama =======
gem.addEventListener("click", (e) => {
    addGems(clickPower, e);
});

// ======= Upgrade satın alma =======
upgrades.forEach(upgrade => {
    const btn = upgrade.querySelector(".buy-btn");
    btn.addEventListener("click", () => {
        const type = upgrade.dataset.type;
        let levelSpan = upgrade.querySelector(".upgrade-level");
        let costSpan = upgrade.querySelector(".upgrade-cost");
        let level = parseInt(levelSpan.textContent);
        let cost = parseInt(costSpan.textContent);

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
            gemDisplay.textContent = gemCount;
            createStar(mouseX, mouseY);
            scatterUpgradeGems();
        } else {
            showToast("Yeterli gem yok!");
        }
    });
});

// ======= Auto Miner interval =======
minerAutoInterval = setInterval(() => {
    if(autoMinerLevel > 0){
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
    gem.style.transform = "scale(1.1)";
    setTimeout(() => gem.style.transform = "scale(1)", 100);
}

// Gem pop animasyonu
function animateGemPop(amount, e){
    const pop = document.createElement("div");
    pop.textContent = `+${amount}`;
    pop.className = "gem-pop";

    if(autoClickerActive){
        pop.style.color = `hsl(${Math.random()*360}, 100%, 50%)`;
    } else {
        pop.style.color = "#ffffff";
    }

    gemContainer.appendChild(pop);

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
    let step = 0;
    const interval = setInterval(() => {
        if(step >= amount){
            clearInterval(interval);
            gemDisplay.textContent = gemCount;
        } else {
            gemDisplay.textContent = parseInt(gemDisplay.textContent)+1;
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
battleBtn.addEventListener("click", () => {
    saveGame();
    window.location.href = "battle.html";
});

// ======= Ayarlar paneli =======
function toggleSettings() {
    const panel = document.getElementById("settingsPanel");
    panel.style.display = (panel.style.display === "block") ? "none" : "block";
}

function closeSettings() {
    document.getElementById("settingsPanel").style.display = "none";
}

function changeTheme(themeName) {
    document.body.classList.remove('theme1','theme2','theme3','theme4','theme5');
    document.body.classList.add(themeName);
}

// ======= Krallık ismi =======
let kingdomNameSpan = document.getElementById("kingdom-name");
const kingdomInput = document.getElementById("kingdom-input");
const setKingdomBtn = document.getElementById("set-kingdom");

let kingdomName = localStorage.getItem("kingdomName") || "My Kingdom";
kingdomNameSpan.textContent = kingdomName;

setKingdomBtn.addEventListener("click", () => {
    const name = kingdomInput.value.trim();
    if(name !== ""){
        kingdomName = name;
        kingdomNameSpan.textContent = kingdomName;
        saveGame();
        kingdomInput.value = "";
    }
});

// ======= Game verilerini kaydet =======
function saveGame(){
    localStorage.setItem("playerGems", gemCount);
    localStorage.setItem("clickPower", clickPower);
    localStorage.setItem("clickerLevel", clickerLevel);
    localStorage.setItem("autoMinerLevel", autoMinerLevel);
    localStorage.setItem("autoMinerPower", autoMinerPower);
    localStorage.setItem("superClickerLevel", superClickerLevel);
    localStorage.setItem("myArmy", myArmy);
    localStorage.setItem("kingdomName", kingdomName);
    
    // Broadcast to other tabs
    broadcastState();
}

// ======= Sayfa yüklenince verileri göster =======
window.addEventListener("load", () => {
    gemDisplay.textContent = gemCount;
    
    const myArmyElement = document.getElementById("myArmy");
    if (myArmyElement) {
        myArmyElement.textContent = myArmy;
    }
    
    upgrades.forEach(upgrade => {
        const type = upgrade.dataset.type;
        const levelSpan = upgrade.querySelector(".upgrade-level");
        if(type === "clicker") levelSpan.textContent = clickerLevel;
        if(type === "auto") levelSpan.textContent = autoMinerLevel;
        if(type === "super-clicker") levelSpan.textContent = superClickerLevel;
    });

    for(let i=0;i<autoMinerLevel;i++){
        addMinerVisual();
    }
});