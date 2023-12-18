const express = require('express')
const mongoose = require('mongoose')
var cors = require('cors')
require('dotenv').config()
const path = require('path')
const routes = require('./routes/routes')
const session = require('express-session')





const app = express()




app.use((req, res, next) => {
    console.log(req.path, req.method)
    next()
})
app.set('view engine', 'ejs')
app.use(cors())



app.use(express.static(path.join(__dirname, './../frontend/public/')))
app.set('views', path.join(__dirname, './../frontend/views/'))
app.use(express.urlencoded({ extended: true }))

app.use(express.json())
app.use(session({
    secret: 'your-secret-key', // Replace with a strong secret key
    resave: false,
    saveUninitialized: false,
  }));


app.set('view engine', 'pug')
app.use('/', routes)







// if the request is not handled by any of the routes
app.use((req, res) => {
    res.status(404).render('404');
})





//connect to mongodb
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Connected to MongoDB')

        app.listen(process.env.PORT, () => {
            //print server url in console
            console.log(`Server is running at http://localhost:${process.env.PORT}`)
        
        })
    })
    .catch(err => {
        console.log(err)
    })








