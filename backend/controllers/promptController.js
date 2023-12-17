// const { default: mongoose } = require('mongoose')
// const Hero = require('../models/db')

let counter = 0

//POST hero
const home = async (req, res) => {
    try {
        res.status(200).render('index', {counter: counter})
    }

    catch (err) {
        res.status(400).json({ message: err.message })
    }
    
}

const click = async (req, res) => {
    
    try {
        counter++
        res.status(200).render('click', {counter: counter})
    }

    catch (err) {
        res.status(400).json({ message: err.message })
    }
    
}

const reset = async (req, res) => {
    try {
        counter = 0
        res.status(200).render('click', {counter: counter})
    }

    catch (err) {
        res.status(400).json({ message: err.message })
    }
    
}






module.exports = {home, click, reset}
