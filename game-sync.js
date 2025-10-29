// ======= Cross-Tab Synchronization System =======
// Create a broadcast channel for communication between tabs
const gameChannel = new BroadcastChannel('clicker-game-sync');

// Game state manager
class GameState {
    constructor() {
        this.loadState();
        this.setupSyncListeners();
    }

    loadState() {
        this.gemCount = parseInt(localStorage.getItem("playerGems")) || 0;
        this.clickPower = parseInt(localStorage.getItem("clickPower")) || 1;
        this.clickerLevel = parseInt(localStorage.getItem("clickerLevel")) || 0;
        this.autoMinerLevel = parseInt(localStorage.getItem("autoMinerLevel")) || 0;
        this.superClickerLevel = parseInt(localStorage.getItem("superClickerLevel")) || 0;
        this.myArmy = parseInt(localStorage.getItem("myArmy")) || 0;
        this.kingdomName = localStorage.getItem("kingdomName") || "My Kingdom";
        this.lastUpdate = parseInt(localStorage.getItem("lastUpdate")) || Date.now();
    }

    saveState() {
        localStorage.setItem("playerGems", this.gemCount);
        localStorage.setItem("clickPower", this.clickPower);
        localStorage.setItem("clickerLevel", this.clickerLevel);
        localStorage.setItem("autoMinerLevel", this.autoMinerLevel);
        localStorage.setItem("superClickerLevel", this.superClickerLevel);
        localStorage.setItem("myArmy", this.myArmy);
        localStorage.setItem("kingdomName", this.kingdomName);
        localStorage.setItem("lastUpdate", this.lastUpdate);
        
        // Broadcast to other tabs
        this.broadcastUpdate();
    }

    broadcastUpdate() {
        gameChannel.postMessage({
            type: 'state-update',
            data: {
                gemCount: this.gemCount,
                clickPower: this.clickPower,
                clickerLevel: this.clickerLevel,
                autoMinerLevel: this.autoMinerLevel,
                superClickerLevel: this.superClickerLevel,
                myArmy: this.myArmy,
                kingdomName: this.kingdomName,
                lastUpdate: Date.now()
            }
        });
    }

    setupSyncListeners() {
        // Listen for updates from other tabs
        gameChannel.onmessage = (event) => {
            if (event.data.type === 'state-update') {
                const remoteData = event.data.data;
                
                // Only update if remote data is newer
                if (remoteData.lastUpdate > this.lastUpdate) {
                    this.gemCount = remoteData.gemCount;
                    this.clickPower = remoteData.clickPower;
                    this.clickerLevel = remoteData.clickerLevel;
                    this.autoMinerLevel = remoteData.autoMinerLevel;
                    this.superClickerLevel = remoteData.superClickerLevel;
                    this.myArmy = remoteData.myArmy;
                    this.kingdomName = remoteData.kingdomName;
                    this.lastUpdate = remoteData.lastUpdate;
                    
                    // Update localStorage without broadcasting again
                    this.saveStateLocal();
                    
                    // Trigger UI update
                    if (typeof this.onStateUpdate === 'function') {
                        this.onStateUpdate();
                    }
                }
            }
        };

        // Handle storage events (for older browser support)
        window.addEventListener('storage', (e) => {
            if (e.key === 'playerGems' || e.key === 'lastUpdate') {
                this.loadState();
                if (typeof this.onStateUpdate === 'function') {
                    this.onStateUpdate();
                }
            }
        });
    }

    saveStateLocal() {
        localStorage.setItem("playerGems", this.gemCount);
        localStorage.setItem("clickPower", this.clickPower);
        localStorage.setItem("clickerLevel", this.clickerLevel);
        localStorage.setItem("autoMinerLevel", this.autoMinerLevel);
        localStorage.setItem("superClickerLevel", this.superClickerLevel);
        localStorage.setItem("myArmy", this.myArmy);
        localStorage.setItem("kingdomName", this.kingdomName);
        localStorage.setItem("lastUpdate", this.lastUpdate);
    }

    addGems(amount) {
        this.gemCount += amount;
        this.lastUpdate = Date.now();
        this.saveState();
    }

    spendGems(amount) {
        if (this.gemCount >= amount) {
            this.gemCount -= amount;
            this.lastUpdate = Date.now();
            this.saveState();
            return true;
        }
        return false;
    }

    // Calculate gems earned while away
    calculateOfflineGems() {
        const lastUpdate = parseInt(localStorage.getItem("lastUpdate")) || Date.now();
        const timeAway = Math.floor((Date.now() - lastUpdate) / 1000); // seconds
        const offlineGems = timeAway * this.autoMinerLevel; // 1 gem per second per miner
        
        if (offlineGems > 0) {
            this.addGems(offlineGems);
            return offlineGems;
        }
        return 0;
    }
}

// Export for use in other files
window.GameState = GameState;