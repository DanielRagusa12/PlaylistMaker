const express = require('express')
const router = express.Router()
const {home, click, reset, login, callback, isAuth, getPlaylists} = require('../controllers/promptController')

//POST hero
// router.get('/:lat/:lon/:startDate/:endDate', searchCity)
router.get("/", home)
router.get("/click", isAuth, click)
router.get("/reset", reset)
router.get("/login", login)
router.get("/callback", callback)
router.get("/getPlaylists", isAuth, getPlaylists)





module.exports = router
