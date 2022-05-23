// require mongoose and setup the Schema
const mongoose = require("mongoose");
const { stringify } = require("querystring");
const Schema = mongoose.Schema;

//use bluebird promise library with mongoose
mongoose.Promise = require("bluebird");

// car model
const userSchema = new Schema({
    "username": {
        type: String,
        },
    "password": String,
    "isAdmin": Boolean
});

module.exports = mongoose.model("users", userSchema);