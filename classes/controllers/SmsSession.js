var correctedPath = ('./../apis/Wendys.js'); //that's that
const { Order, wendys }  = require(correctedPath);

const {saveProductRequestAsync} = require("./../../db/queries/productRequestQueries");

class SmsSession {
    constructor() {
        this.SMS_ORDERS = {};
    }

    generateToken() {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let token = "";
        for (let i = 0; i < 6; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
    }

    startSmsSession({ customerNumber, twilioNum }) {
        console.log("Started: ", customerNumber);

        if (!this.SMS_ORDERS.hasOwnProperty(customerNumber)) {
            var token = this.generateToken();
            this.SMS_ORDERS[customerNumber] =
            {
                status: "started",
                order: new Order(wendys),
                id: token,
                storeNumber: twilioNum,
                conversation: []
            };
        }
        console.log(this.SMS_ORDERS[customerNumber]);
        return this.SMS_ORDERS[customerNumber];
    }

    addOrder({ customerNumber, orderData }) {
        if (this.SMS_ORDERS[customerNumber] !== undefined) {
            this.SMS_ORDERS[customerNumber].order = orderData;
        }
        else {
            console.log("Sms session id not found");
        }
    }

    addConversationData({ customerNumber, conversation }) {
        if (this.SMS_ORDERS[customerNumber] !== undefined) {
            this.SMS_ORDERS[customerNumber].conversation.push(conversation);
        }
        else {
            console.log("Sms session id not found");
        }
    }

    changeSessionStatus({ customerNumber, status }) {
        // started
        // send
        // ended
        if (this.SMS_ORDERS[customerNumber] !== undefined) {

            this.SMS_ORDERS[customerNumber].status = status;
            // this.SMS_PRODUCTS_ALTERNATIVES[customerNumber].options = data.status;
        }
        else {
            console.log("Sms session id not found");
        }
    }

    endSession(customerNumber) {
        console.log("Ended: ", customerNumber);

        if (this.SMS_ORDERS[customerNumber] !== undefined) {
            this.SMS_ORDERS[customerNumber].status = "ended";

            //order request/response data
            let conversationFormated = [];
            for(let i = 0; i < this.SMS_ORDERS[customerNumber].conversation.length; i++)
            {
                conversationFormated.push({
                    request : this.SMS_ORDERS[customerNumber].conversation[i].message,
                    response : this.SMS_ORDERS[customerNumber].conversation[++i].message
                });
            }
            console.log(conversationFormated);

            conversationFormated.forEach(conversation => {
                let dataToSave = {
                    idSession: this.SMS_ORDERS[customerNumber].id,
                    source: "sms-wendys",
                    isCorrect: 0,
                    products: JSON.stringify(this.SMS_ORDERS[customerNumber].order.export()),
                    request: conversation.request,
                    response: conversation.response,
                };

                console.log("DATA TO SAVE: ", dataToSave);
                saveProductRequestAsync(dataToSave);
            });
            
            delete this.SMS_ORDERS[customerNumber]; // for testing
        }
        else {
            return undefined;
        }
    }
}

module.exports = SmsSession;