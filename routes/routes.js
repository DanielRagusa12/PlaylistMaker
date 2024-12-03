const express = require('express');
const router = express.Router();
const {
    home, 
    login, 
    callback, 
    isAuth, 
    signout, 
    refreshAccessToken, 
    landingPage, 
    generateSongs,
    addSong
} = require('../controllers/promptController');

router.use((req, res, next) => {
    if (req.path.endsWith('/') && req.path.length > 1) {
        const query = req.url.slice(req.path.length);
        res.redirect(301, req.path.slice(0, -1) + query);
    } else {
        next();
    }
});

// Route definitions
router.get('/welcome', landingPage);
router.get("/", isAuth, refreshAccessToken, home);
router.get("/login", login);
router.get("/callback", callback);
// Removed the /getPlaylists route
router.get("/signout", isAuth, refreshAccessToken, signout);
router.post("/generateSongs/:playlistId", isAuth, refreshAccessToken, generateSongs);
router.post("/addSong", isAuth, refreshAccessToken, addSong);

module.exports = router;
