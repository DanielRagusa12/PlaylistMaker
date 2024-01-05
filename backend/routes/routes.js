const express = require('express')
const router = express.Router()
const {
    home, 
    login, 
    callback, 
    isAuth, 
    getPlaylists, 
    signout, 
    refreshAccessToken, 
    landingPage, 
    generateSongs,
    addSong
} = require('../controllers/promptController')

//POST hero
// router.get('/:lat/:lon/:startDate/:endDate', searchCity)
router.get('/welcome', landingPage)
router.get("/", isAuth, refreshAccessToken, home)
router.get("/login", login)
router.get("/callback", callback)
router.get("/getPlaylists", isAuth, refreshAccessToken, getPlaylists)
router.get("/signout", isAuth, refreshAccessToken, signout)
router.post("/generateSongs/:playlistId", isAuth, refreshAccessToken, generateSongs)
router.post("/addSong", isAuth, refreshAccessToken, addSong)






module.exports = router
