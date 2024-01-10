const express = require('express');
const mongoose = require('mongoose');
var cors = require('cors');
require('dotenv').config();
const path = require('path');
const routes = require('./routes/routes');
const session = require('express-session');
const MongoStore = require('connect-mongo');


const app = express();

app.use((req, res, next) => {
    console.log(req.path, req.method)
    next()
});
app.use(cors());


app.use(express.static(path.join(__dirname, './../frontend/public/')));
app.set('views', path.join(__dirname, './../frontend/views/'));
app.use(express.urlencoded({ extended: true }));

app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET, // Replace with a strong secret key
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions',
        ttl: 60 * 60 * 24 * 7 // = 7 days. Default
    })
  }));


app.set('view engine', 'pug');
app.use('/', routes);







// if the request is not handled by any of the routes
app.use((req, res) => {
    res.status(404).render('error', {status: 404});
});



app.listen(process.env.PORT, () => {
    console.log(`Server is running at http://localhost:${process.env.PORT}`)
            
});


    








