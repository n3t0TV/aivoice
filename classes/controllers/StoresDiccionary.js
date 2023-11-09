const { getStores } = require('./../../db/queries/storeQueries');

class StoresDiccionary {
    constructor() {
        this.STORES = {};
        this.loadStores();
    }

    async loadStores() {
        const storesFromDb = await getStores();
        storesFromDb.forEach(store => {
            if (!this.STORES.hasOwnProperty(store.id)) {
                this.STORES[store.id] = store;
            }
        });
    }

    getAllStores() {
        let allStores = [];
        Object.keys(this.STORES).forEach(key => {
            allStores.push(this.STORES[key])
        });
        return allStores;
    }

    getStore(id) {
        if (!this.STORES.hasOwnProperty(id)) {
            return null;
        }
        return this.STORES[id];
    }
}

module.exports = StoresDiccionary;