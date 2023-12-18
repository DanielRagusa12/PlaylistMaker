const express = require('express')
const router = express.Router()
const {home, login, callback, isAuth, getPlaylists, signout} = require('../controllers/promptController')

//POST hero
// router.get('/:lat/:lon/:startDate/:endDate', searchCity)
router.get("/", home)
router.get("/login", login)
router.get("/callback", callback)
router.get("/getPlaylists", isAuth, getPlaylists)
router.get("/signout", isAuth, signout)





module.exports = router
