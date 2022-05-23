const mongoose = require("mongoose");
const { stringify } = require("querystring");
const Schema = mongoose.Schema;

//use bluebird promise library with mongoose
mongoose.Promise = require("bluebird");

const deletedInventorySchema = new Schema({
    "itemName": {
        type: String
        },
    "itemQty": Number,
    "Warehouse": String,
    "DelComment": String
});

module.exports = mongoose.model("DeletedInventoryItem", deletedInventorySchema);