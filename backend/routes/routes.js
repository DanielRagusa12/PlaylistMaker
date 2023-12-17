const express = require('express')
const router = express.Router()
const {home, click, reset} = require('../controllers/promptController')

//POST hero
// router.get('/:lat/:lon/:startDate/:endDate', searchCity)
router.get("/", home)
router.get("/click", click)
router.get("/reset", reset)




module.exports = router
