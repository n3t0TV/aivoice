const fs = require('fs').promises;
const path = require('path');
const util = require('util');
const crypto = require('crypto');
const getSiteMenu_path = path.join(__dirname, '../../data/wendys/getSiteMenu.json');

class Wendys {

    constructor() {
        this.loadJSON();
    }

    async loadJSON() {
        console.log("----------------------------------- Loading Wendy's data...");
        try {
            const data = await fs.readFile(getSiteMenu_path, 'utf8');
            this.siteMenu = JSON.parse(data).menuLists;
            console.log("----------------------------------- Wendy's JSON loaded.");
        } catch (error) {
            console.error('Error reading JSON file:', error);
        }
        this.extractData();
    }

    extractData() {

        this.menus = this.siteMenu.menus[0];
        this.subMenus = {};

        for (const subMenu of this.siteMenu.subMenus) {
            this.subMenus[subMenu.subMenuId] = subMenu;
        }

        this.menuItems = {};
        for (const menuItem of this.siteMenu.menuItems) {
            this.menuItems[menuItem.menuItemId] = menuItem;
        }
        this.salesItems = {};
        for (const salesItem of this.siteMenu.salesItems) {
            this.salesItems[salesItem.salesItemId] = salesItem;
        }
        this.salesGroups = {};
        for (const salesGroup of this.siteMenu.salesGroups) {
            this.salesGroups[salesGroup.salesGroupId] = salesGroup;
        }
        this.modifierGroups = {};
        for (const modifierGroup of this.siteMenu.modifierGroups) {
            this.modifierGroups[modifierGroup.modifierGroupId] = modifierGroup;
        }
        this.modifierActions = {};
        for (const modifierAction of this.siteMenu.modifierActions) {
            this.modifierActions[modifierAction.action] = modifierAction;
        }
        this.modifiers = {};
        for (const modifier of this.siteMenu.modifiers) {
            this.modifiers[modifier.modifierId] = modifier;
        }


    }

    getSalesItemsBySalesGroup(salesGroupId) {
        const salesItemIds = this.salesGroups[salesGroupId].salesItemIds;
        const salesItems = [];
        for (const salesItemId of salesItemIds) {
            salesItems.push(this.salesItems[salesItemId]);
        }
        return salesItems;
    }

    getMenuItemNameList(menuItemIdArray) {
        menuItemList = [];
        for (const menuItemId of menuItemIdArray) {
            const menuItem = this.menuItems[menuItemId];
            menuItemList.push({
                menuItemId,
                name: menuItem.name,
            });
        }
        return menuItemList;
    }


    getSalesItemNameList(itemIdArray) {
        salesItemList = [];
        for (const salesItemId of itemIdArray) {
            const salesItem = this.salesItems[salesItemId];
            salesItemList.push({
                salesItemId,
                name: salesItem.name
            });
        }
        return salesItemList;
    }

    getModifiersBySalesItemId(salesItemId) {
        const modifiers = {};
        for (const modifierGroupId of this.salesItems[salesItemId].modifierGroups) {
            const modifierGroup = this.modifierGroups[modifierGroupId];
            modifiers[modifierGroup.name] = [];
            for (const modifierId of modifierGroup.modifiers) {
                modifiers.push({
                    name: modifierGroup.modifiers[modifierId].name,
                    description: modifierGroup.modifiers[modifierId].description,
                })
            }
        }
    }

    listMenu(subMenuIds) {
        const list = []
        for (const subMenuId of subMenuIds) {
            const subMenu = this.subMenus[subMenuId];
            list.push({
                subMenuId,
                name: subMenu.name
            });
        }
        return list;
    }

    listMenuCSV() {
        let csv = "itemId|name"
        for (const menuItemId of Object.keys(this.menuItems)) {
            const menuItem = this.menuItems[menuItemId];
            if (menuItem.comboMenuItemId) {
                continue;
            }
            csv += `\n${menuItemId}|"${menuItem.name}"`;
        }
        return csv;
    }

    listSidesAndDrinksCSV() {
        const menuItemId = 30968;
        const menuItem = this.menuItems[menuItemId];
        let resultText = '';
        for (const salesGroup of menuItem.salesGroups) {
            if (salesGroup.name != 'Side' && salesGroup.name != 'Drink') continue;
            resultText += `\nOptions for ${salesGroup.name}:\nitemId|name|price`;
            for (const salesItemId of salesGroup.salesItemIds) {
                const salesItem = this.salesItems[salesItemId];
                resultText += `\n${salesItemId}|"${salesItem.name}"`;
            }
        }
        return resultText;
    }


    listBreakfastMenu() {
        return this.listMenu(this.menus.breakfastSubMenuIds);
    }

    listLunchMenu() {
        return this.listMenu(this.menus.lunchSubMenuIds);
    }

    listSubMenu(subMenuId) {
        const list = [];
        for (const menuItemId of this.subMenus[subMenuId].menuItems) {
            const menuItem = this.menuItems[menuItemId];
            list.push({
                menuItemId,
                name: menuItem.name,
            });
        }
        return list;
    }

    getMenuItemDetails(menuItemId) {
        const menuItem = this.menuItems[menuItemId];

        const menuItemDetails = {
            name: menuItem.name,
            description: menuItem.description,
        };

        if (menuItem.comboMenuItemId) {
            const comboMenuItem = this.menuItems[menuItem.comboMenuItemId];
            const comboItems = [];
            for (const salesGroup of comboMenuItem.salesGroups) {
                comboItems.push(salesGroup.name);
            }
            menuItemDetails.combo = {
                menuItemId: menuItem.comboMenuItemId,
                comboItems,
                price: comboMenuItem.price
            };
        }

        return menuItemDetails;
    }

    getInfoGPT(menuItemId, withDescription) {
        let resultText;
        if (this.menuItems[menuItemId]) {
            const menuItem = this.menuItems[menuItemId];
            const defaultItem = this.salesItems[menuItem.defaultItemId] || {};
            resultText = `
        id: ${menuItemId}:
        name: ${menuItem.name}`;
        if(withDescription){
            resultText += `
            description: ${menuItem.description}
            price: ${menuItem.price}
            calories: ${defaultItem.calorieRange}`
        }
        resultText += `
        ---`;
        }else if(this.salesItems[menuItemId]){
            const salesItem = this.salesItems[menuItemId] || {};
            resultText = `
            id:${menuItemId}
            name: ${salesItem.name}`;
            if(withDescription){
                resultText += `
                description: ${menuItem.description}
                price: ${salesItem.price}
                calories: ${salesItem.calorieRange}`
            }
            resultText += `
            ---`;
        }
        return resultText;
    }

    listComboOptionsGPT(menuItemId) {
        const menuItem = this.menuItems[menuItemId];

        let resultText = `Here are the options for ${menuItemId} "${menuItem.name}"`;
        for (const salesGroup of menuItem.salesGroups) {
            if (salesGroup.name != 'Side' && salesGroup.name != 'Drink') continue;
            resultText += `\nOptions for ${salesGroup.name}:\nsalesItemid|name|price`;
            for (const salesItemId of salesGroup.salesItemIds) {
                const salesItem = this.salesItems[salesItemId];
                resultText += `\n${salesItemId}|"${salesItem.name}"`;
            }
        }
        return resultText;
    }

    listComboOptions(menuItemId) {
        const menuItem = this.menuItems[menuItemId];
        const options = {};
        for (const salesGroup of menuItem.salesGroups) {
            options[salesGroup.name] = {}
            for (const salesItemId of salesGroup.salesItemIds) {
                const salesItem = this.salesItems[salesItemId];
                let comboSize = 'ANY';
                switch (salesItem.shortDescription) {
                    case 'SMALL':
                    case 'MEDIUM':
                    case 'LARGE':
                        comboSize = salesItem.shortDescription;
                        break;
                }
                if (!options[salesGroup.name][comboSize]) {
                    options[salesGroup.name][comboSize] = []
                }
                options[salesGroup.name][comboSize].push({
                    salesItemId: salesItem.salesItemId,
                    name: salesItem.name,
                    price: salesItem.price
                });
            }

        }
        return options;
    }

    listModifiers(salesItemId) {
        const salesItem = this.salesItems[salesItemId];

        const groups = {};

        for (const modifierGroupId of salesItem.modifierGroups) {
            const modifierGroup = this.modifierGroups[modifierGroupId];
            groups[modifierGroup.modifierGroupId] = { name: modifierGroup.name, options: [] };
            for (const modifierId of modifierGroup.modifiers) {
                const modifier = this.modifiers[modifierId];
                groups[modifierGroup.modifierGroupId].options.push({
                    modifierId: modifier.modifierId,
                    name: modifier.name
                })
            }
        }

        const defaultOptions = {};

        for (const defaultOption of salesItem.defaultOptions) {
            const modifierGroup = this.modifierGroups[defaultOption.modifierGroupId];
            const modifier = this.modifiers[defaultOption.modifierId];
            groups[modifierGroup.modifierGroupId] = {
                name: modifierGroup.name, option: {
                    modifierId: modifier.modifierId,
                    name: modifier.name
                }
            };
        }

        return {
            defaultOptions,
            groups
        }
    }


}



class Order {
    constructor(wendys) {
        this.wendys = wendys;
        this.orderItems = [];
    }
    addCombo(menuItemId) {
        if(this.wendys.salesItems[menuItemId]){
            return this.addSide(menuItemId);
        }
        const orderCombo = new OrderCombo(this.wendys, menuItemId);
        this.orderItems.push(orderCombo);
        return orderCombo;
    }
    addSide(salesItemId) {
        if(this.wendys.menuItems[salesItemId]){
            return this.addCombo(salesItemId);
        }
        const orderOption = new OrderOption(this.wendys, salesItemId);
        this.orderItems.push(orderOption);
        return orderOption;
    }
    addDrink(salesItemId) {
        if(this.wendys.menuItems[salesItemId]){
            return this.addCombo(salesItemId);
        }
        const orderOption = new OrderOption(this.wendys, salesItemId);
        this.orderItems.push(orderOption);
        return orderOption;
    }
    removeCombo(orderItemId) {
        for (let i in this.orderCombos) {
            const orderCombo = this.orderCombos[i];
            if (orderCombo.orderItemId == orderItemId) {
                this.orderCombos.splice(i, 1);
                break;
            }
        }
    }

    export() {
        const combos = [];
        for (const orderCombo of this.orderItems) {
            combos.push(orderCombo.export());
        }
        return combos;
    }

}

class OrderCombo {
    constructor(wendys, menuItemId) {
        this.wendys = wendys;
        this.menuItemId = menuItemId;
        this.menuItem = wendys.menuItems[this.menuItemId];
        this.orderOptions = [];
        if (this.menuItem) {
            this.basePrice = this.menuItem.price;
            this.name = this.menuItem.name;
            this.orderItemId = crypto.randomBytes(4).toString('hex').toUpperCase();
        } else {
            this.name = `ERROR: There is not menuItemId ${this.menuItemId}`
        }
    }
    addOption(salesItemId) {
        const orderOption = new OrderOption(this.wendys, salesItemId);
        this.orderOptions.push(orderOption);
        return orderOption;
    }

    export() {
        const options = [];
        let price = this.basePrice;
        for (const orderOption of this.orderOptions) {
            options.push(orderOption.export());
            price += orderOption.price;
        }

        return {
            menuItemId: this.menuItemId,
            name: this.name,
            //    options,
            price,
            //   orderItemId: this.orderItemId
        }
    }
}



class OrderOption {
    constructor(wendys, salesItemId) {
        this.wendys = wendys;
        this.salesItemId = salesItemId;
        this.salesItem = wendys.salesItems[this.salesItemId];
        if (this.salesItem) {
            this.name = this.salesItem.name;
            this.price = this.salesItem.price;
            this.modifiers = [];
        } else {
            this.name = `ERROR: There is not salesItemId ${this.salesItemId}`
        }
    }

    addModifier(modifierId, action) {

        const modifier = {
            modifierId,
            action,
            name: this.wendys.modifiers[modifierId].name
        }
        this.modifiers.push(modifier);
    }

    export() {
        return {
            salesItemId: this.salesItemId,
            name: this.name,
            price: this.price
        }
    }


}

class WendysCommander {

    constructor(wendys) {
        this.wendys = wendys;
    }


    executeCommand(sms_order, order, action, param0, param1, param2) {
        let result = '';
        console.log(action, param0, param1, param2);
        switch (action) {
            case "getComboInfo":
                result = this.wendys.getInfoGPT(param0);
                break;
            case "askCustomer":
                result = `You have to ask the customer: "${param0}"`;
                break;
            case 'addCombo':
                order.addCombo(param0);
                break;
            case 'addSide':
                order.addSide(param0);
                break;
            case 'addDrink':
                order.addDrink(param0);
                break;
            case 'closeOrder':
                sms_order.finished = true;
                break;
        }

        return result;
    }


    execute(sms_order, order, commands) {
        let response = '';
        for (const command of commands) {
            console.log(command);
            response += this.executeCommand(sms_order, order, command.command, command.argument0, command.argument1, command.argument2);
            response += '\n-----------------------\n';
        }
        return response;
    }


}


setTimeout(() => {
    /*
    console.log("***** WEDNY'S TEST *****");
    console.log("wendys.listLunchMenu()");
    console.log(wendys.listLunchMenu());

    console.log("wendys.listSubMenu(100)");
    console.log(wendys.listSubMenu(100));

    console.log("wendys.getMenuItemDetails(31153)");
    console.log(wendys.getMenuItemDetails(31153));

    console.log("wendys.listComboOptions(31160)");
    console.log((util.inspect(wendys.listComboOptions(31160), { showHidden: false, depth: null, colors: true })));

    console.log("wendys.listModifiers(41768)");
    console.log((util.inspect(wendys.listModifiers(41768), { showHidden: false, depth: null, colors: true })));


    console.log("***** ORDER TEST *****");
    console.log("order = new Order(wendys);");
    const order = new Order(wendys);

    console.log("combo = order.addCombo(30970)");
    const combo = order.addCombo(30970);

    console.log("option = combo.addOption(40003)");
    const option = combo.addOption(40003);
    console.log("option.addModifier(71567,'REMOVE')");
    option.addModifier(71567,'REMOVE');
    console.log("option.addModifier(71569,'ADD')");
    option.addModifier(71569,'ADD');
    console.log("combo.addOption(40056)");
    combo.addOption(40056);

    console.log("combo.addOption(41265)");
    combo.addOption(41265);

    console.log("order.export()");
    console.log(util.inspect(order.export(), { showHidden: false, depth: null, colors: true }));
*/
}, 2000);

const wendys = new Wendys();
const wendysCommander = new WendysCommander(wendys);

module.exports = { wendys, Order, wendysCommander };