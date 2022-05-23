// require mongoose and setup the Schema
const mongoose = require("mongoose");
const { stringify } = require("querystring");
const Schema = mongoose.Schema;

//use bluebird promise library with mongoose
mongoose.Promise = require("bluebird");

// car model
const inventorySchema = new Schema({
    "itemName": {
        type: String
        },
    "itemQty": Number,
    "Warehouse": String,
    "DelComment": String
});

module.exports = mongoose.model("InventoryItem", inventorySchema);