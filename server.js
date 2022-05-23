var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var path = require("path");
const ehbs = require('express-handlebars'); 
const mongoose = require("mongoose");
const bcrypt = require('bcrypt'); const saltRounds = 11; 
const clientSessions = require("client-sessions");

require("dotenv").config({ path: ".env" }); 


const InventoryModel = require("./models/inventoryModel");
const DeletedModel = require("./models/deletedModel");
const UserModel = require("./models/userModel");
const { response } = require("express");

app.engine('hbs', ehbs.engine({ extname: '.hbs' }));
app.set('view engine', '.hbs');

var HTTP_PORT = process.env.PORT || 8080;

mongoose.connect(process.env.dbconn);

function onHttpStart() {
    console.log("Express http server listing on: " + HTTP_PORT);
};

app.use(express.static("views"));
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: false }));


//======================================User Management===============================================================
app.use(clientSessions({
    cookieName: "session",
    secret: process.env.clientSessionsSecret, 
    duration: 60*60*1000,//1 hour session
    activeDuration: 1000*60*30
}));
function ensureLogin(req, res, next) { //This function will check if the caller page has a logged user
    if (!req.session.user) {
      res.redirect("/");
    } else {
      next();
    }
};
//More about Sessions security and tips in the down link.
//https://stormpath.com/blog/everything-you-ever-wanted-to-know-about-node-dot-js-sessions


//=====================================================================================================================
//=====================================================================================================================
//=======================================Pages=========================================================================

app.get("/", (req,res)=>{
    if(!req.session.user){
        res.render("login", {layout: false});
    } else if(req.session.user) {
        res.render("Profile", {user: req.session.user, layout: false});
    }
});


app.post("/login", async (req, res)  => {
    const username = req.body.username;
    const password = req.body.password;

    if (username === "" || password === "" || username === "^*;" || password === "^*;" ) {
        return res.render("login", {errorMsg: "Missing Credentials.", layout: false});
    }

    UserModel.findOne({username: username})
        .exec()
        .then(async (usr) => {
            //https://www.loginradius.com/blog/async/hashing-user-passwords-using-bcryptjs/
            if (!usr) {
                res.render("login", {errorMsg: "login does not exist!", layout: false});
            } else {
                //const validPassword = await bcrypt.compare(password, usr.password);
                // user exists
                if (username === usr.username && password === usr.password  /*password === validPassword*//*usr.password*/ && usr.isAdmin){
                    req.session.user = {
                        username: usr.username,
                        isAdmin: usr.isAdmin
                    };
                    res.redirect("/inventory");
                }
                else if (username === usr.username && password === usr.password /*password === validPassword*//*usr.password*/){
                    req.session.user = {
                        username: usr.username,
                        isAdmin: usr.isAdmin
                    };
                    res.redirect("/inventory");
                } else {
                    res.render("login", {errorMsg: "login and password does not match!", layout: false});
                };
            };

        })
        .catch((err) => { console.log(`An error occurred: ${err}`)});
});

app.get("/logout", (req,res)=> {
    req.session.reset();
    res.render("login", {errorMsg: "Please login your username and password below.", layout: false});
});

app.get("/Profile", ensureLogin, (req,res)=>{
    res.render("Profile", {user: req.session.user, layout: false});
 });
 
app.get("/Profile/Edit", ensureLogin, (req,res)=>{
    res.render("ProfileEdit", {user: req.session.user, layout: false});
});

app.get("/addProfile",/* ensureLogin,*/ (req,res)=>{
    res.render("addProfile", {/*user: req.session.user, */layout: false});
});
//https://stormpath.com/blog/everything-you-ever-wanted-to-know-about-node-dot-js-sessions

app.post("/AddProfile", async (req,res) => {
    //if(req.session.user.isAdmin === true){
    try{
        //const hashedPassword = await bcrypt.hash(req.body.password, saltRounds, funtion(err, hash))
        //const salt = await bcrypt.genSalt(saltRounds);
        //const userPassword = await bcrypt.hash(req.body.password, salt);
        var newUser = new UserModel({
            username: req.body.username, 
            password: req.body.password,    /*userPassword*//*bcrypt.hash(req.body.password, salt)*/       
            isAdmin: true
        });
 
        newUser.save((err)=> {
            console.log("Error: " + err + ';');
            if (err) {
                console.log("There was an error creating newUser: " + err);
            } else {
                console.log("newUser was created");
            }
        });
        console.log("got here 2!");
        res.redirect("/");

        //emailSender.emailMachine(emailSender.newUserMessage(req.body.email));
    } catch{
        res.redirect('/logout');
    }
});

app.get("/ProfilesDashboard", ensureLogin, (req,res)=>{
    if(req.session.user.isAdmin === true){
        UserModel.find()
        .lean()
        .exec()
        .then((users) =>{
            res.render("ProfilesDashboard", {users: users, hasUser: !!users.length, user: req.session.user, layout: false});
        });
    } else {
        res.redirect("/Profile");
    }
});

app.get("/Profile/Edit/:username", ensureLogin, (req,res) => {
    const username = req.params.username;
    if(req.session.user.isAdmin === true){
        UserModel.findOne({username: username})
            .lean()
            .exec()
            .then((user)=>{
                res.render("ProfileEdit", {user: req.session.user, user: user, editmode: true, layout: false})
            .catch((err)=>{});
        });
    } else {
        res.redirect("/ProfileDashboard", {user: req.session.user});
    }
});

app.get("/Profile/Delete/:username", ensureLogin, (req, res) => {
    if(req.session.user.isAdmin === true){
    const usrname = req.params.username;
    UserModel.deleteOne({username: usrname})
        .then(()=>{
            res.redirect("/ProfilesDashboard");
        });
    } else {
        res.redirect("/Profile");
    }
});

app.post("/Profile/Edit", ensureLogin, (req,res) => {
    const username = req.body.username;
    const isAdmin = (req.body.isAdmin === "on");
    UserModel.updateOne(
        { username: username },
        {$set: {
            isAdmin: isAdmin
        }}
    ).exec()
    .then(()=>{
        req.session.user = {
            username: username,
            isAdmin: isAdmin
        };
        res.redirect("/Profile");
    });    
});

app.get("/addInventory",(req,res)=>{
    res.render("addInventory", {layout: false});
});

app.post("/addInventory", async (req,res) => {  
    const delcomm = "";
        var newItem = new InventoryModel({
            itemName: req.body.itemN, 
            itemQty: req.body.itemQ,   
            Warehouse: req.body.Warehouse,
            DelComment: delcomm
        });
        newItem.save((err)=> {
            if (err) {
                console.log("There was an error creating new inventory item: " + err);
            } else {
                console.log("new inventory was created");
            }
        });
        console.log("Redirecting!");
        res.redirect("/inventory");
});

app.get("/inventory", ensureLogin, (req,res) => {
    InventoryModel.find()
        .lean()
        .exec()
        .then((inventory) =>{
            res.render("inventory", {inventory: inventory, hasInventory: !!inventory.length, user: req.session.user, layout: false});
        });
});

//  app.get("/inventory/Edit", ensureLogin, (req,res) => {
//     res.render("inventoryEdit", {user: req.session.user, layout: false});
//  });

// app.get("/inventory/Edit/:date", ensureLogin, (req,res) => {
//     const datee = req.params.date;
//     ReportModel.findOne({date: datee})
//         .lean()
//         .exec()
//         .then((report)=>{
//             res.render("inventoryEdit", {user: req.session.user, report: report, layout: false})
//     });
// });

 app.get("/inventoryDelete/:itemName", ensureLogin, (req, res) => {
     const itemN = req.params.itemName;
     InventoryModel.deleteOne({itemName: itemN})
         .then(()=>{
             res.redirect("/inventory");
         });
     
 });

app.get("/inventory/Edit/:itemName", ensureLogin, (req,res) => {
    const itemNa = req.params.itemName;

    InventoryModel.findOne({itemName: itemNa})
        .lean()
        .exec()
        .then((inventory)=>{
            res.render("inventoryEdit", {user: req.session.user, inventory: inventory, editmode: true, layout: false})
        });
        const name = req.params.itemName;
        console.log(name)
});

// app.get("/inventoryDelete/:itemName", ensureLogin, (req,res) => {
//     const itemNa = req.params.itemName;
//     InventoryModel.findOne({itemName: itemNa})
//         .lean()
//         .exec()
//         .then((inventory)=>{
//             res.render("inventoryDelete", {user: req.session.user, inventory: inventory, editmode: true, layout: false})
//         });
//         const name = req.params.itemName;
//         console.log(name)
// });

 app.post("/inventoryDelete", ensureLogin, (req,res) => {
     const itemN = req.params.itemName;
     const comm = req.body.delComments;
     InventoryModel.updateOne(
         { itemName: itemN },
                  { $set: {
                      Deleted: true,
                      DelComment: comm,
                  }}).exec()
                  .then(()=>{
                      res.redirect("/inventory");
                  })
                  .catch((err) => {
                     console.log(`Something went wrong: ${err}`);
                 });
  });



app.get("/inventory/Delete/:itemName", ensureLogin, (req, res) => {
    if(req.session.user.isAdmin === true){
    const itemN = req.params.itemName;
    const comm = req.body.delComments;
    const itemName = req.body.itemN;
    const itemq = req.body.itemQ;
    const wh = req.body.Warehouse;

    var deletedItem = new DeletedModel({
            itemName: itemName, 
            itemQty: itemq,   
            Warehouse: wh,
            DelComment: comm
    });
    deletedItem.save((err)=>{
        if (err) {
            console.log("There was an error creating new inventory item: " + err);
        } else {
            console.log("new inventory was created");
        }
    });
    
    InventoryModel.deleteOne({itemName: itemN})
        .then(()=>{
            res.redirect("/inventory");
        });
    } else {
        res.redirect("/Profile");
    }
});


app.post("/inventory/Edit", ensureLogin, (req,res) => {  
    const comm = req.body.delComments;
    const itemN = req.body.itemN;
    const itemq = req.body.itemQ;
    const wh = req.body.Warehouse;

        InventoryModel.updateOne(
            { itemName: itemN },
            { $set: {
                itemName: itemN,
                itemQty: itemq,
                Warehouse: wh,
                DelComment: comm,
            }}
            ).exec()
            .then(()=>{
                res.redirect("/inventory");
            })
            .catch((err) => {
                console.log(`Something went wrong: ${err}`);
            });
   });



app.listen(HTTP_PORT, onHttpStart);