const querystring = require('querystring');
const randomstring = require('randomstring');
const axios = require('axios');
const fs = require('fs');
const winston = require('winston');

// create logs folder if it doesn't exist
if (!fs.existsSync('./logs')) {
    fs.mkdirSync('./logs');
}

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({ format: winston.format.simple() })
    ],
});
console.log = logger.info.bind(logger);
console.error = logger.error.bind(logger);
console.warn = logger.warn.bind(logger);
console.info = logger.info.bind(logger);


const refreshAccessToken = async (req, res, next) => {

    
    if (Date.now() - req.session.token_received_at < req.session.expires_in * 1000) {
        console.log("token is still valid")
        next();
    }
    else {
        try {
            response = await axios.post('https://accounts.spotify.com/api/token', querystring.stringify({
                refresh_token: req.session.refresh_token,
                grant_type: 'refresh_token'
            }), {
                headers: {
                    'content-type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + (new Buffer.from(process.env.CLIENT_ID + ':' + process.env.CLIENT_SECRET).toString('base64')),
                    json: true
                }
            });

            if (response.status === 200) {
                req.session.access_token = response.data.access_token;
                req.session.token_received_at = Date.now(); // store the time when the token was received
                req.session.expires_in = response.data.expires_in;
                req.session.scope = response.data.scope;
                console.log("token refreshed")
                next();
            }
        } catch (error) {
            console.error(error);
            res.status(500).render('error', {status: 500});
        }
    }
    
}



const signout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return err;
        }
        res.redirect('/welcome');
    });
}



const isAuth = (req, res, next) => {
    if (req.session.access_token) {
        next();
    } else {
        // check if it is a htmx request
        if (req.headers['hx-request']) {
            // set redirect url header
            console.log("htmx request!");
            res.setHeader('HX-Redirect', '/login');
            res.end();
        }
        else {
            res.redirect('/welcome');
        }    
    }
}



const login = (req, res) => {
    
    var state = randomstring.generate(16);


    res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
    response_type: 'code',
    client_id: process.env.CLIENT_ID,
    scope: "user-read-private user-read-email playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private",
    redirect_uri: "http://localhost:4000/callback",
    state: state,
    show_dialog: true
    }));   
}

const callback = async (req, res) => {
    var code = req.query.code || null;
    var state = req.query.state || null;

    if (state === null || code === null) {
        res.redirect('/welcome');
    } 

    
    else {
        
        try {
            // get access token from spotify
            
            response = await axios.post('https://accounts.spotify.com/api/token', querystring.stringify({
                code: code,
                redirect_uri: "http://localhost:4000/callback",
                grant_type: 'authorization_code'
            }), {
                headers: {
                    'content-type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + (new Buffer.from(process.env.CLIENT_ID + ':' + process.env.CLIENT_SECRET).toString('base64')),
                    json: true
                }
            });

        

            if (response.status === 200) {
                req.session.access_token = response.data.access_token;
                req.session.token_received_at = Date.now(); // store the time when the token was received
                req.session.refresh_token = response.data.refresh_token;
                req.session.expires_in = response.data.expires_in;
                req.session.scope = response.data.scope;

                // get user id and profile picture

                response = await axios.get('https://api.spotify.com/v1/me', {
                    headers: { 'Authorization': 'Bearer ' + req.session.access_token },
                    json: true
                });
                if (response.status === 200) {
                    req.session.user_id = response.data.id
                    // get users profile picture
                    // if body images is not empty
                    if (response.data.images.length != 0) {
                        req.session.profile_pic = response.data.images[0].url
                    } else {
                        req.session.profile_pic = null
                    }
                    
                    res.redirect('/');
                }
            }

        } catch (error) {
            console.error(error);
            res.status(500).render('error', {status: 500});
        }
    }
}

const landingPage = (req, res) => {
    try {
        res.status(200).render('landingpage');
    }

    catch (err) {
        console.error(err);
        res.status(500).render('error', {status: 500});
    }
    
}




const home = async (req, res) => {
    if (req.session.access_token) {
        // update playlists
        await getPlaylists(req, res);
    }

    try {
        res.status(200).render('index', {
            user_id: req.session.user_id, 
            profile_pic: req.session.profile_pic,
            user_playlists: req.session.playlists
        });
    }

    catch (err) {
        console.error(err);
        res.status(500).render('error', {status: 500});
    }
    
}



const getPlaylists = async (req, res) => {
    try {
        const response = await axios.get('https://api.spotify.com/v1/users/' + req.session.user_id + '/playlists', {
            headers: { 'Authorization': 'Bearer ' + req.session.access_token },
            json: true
        });
        // console.log(response.data.items);

        // req.session.playlists = response.data.items;
        // delete playlists that are not owned by user
        req.session.playlists = response.data.items.filter(playlist => playlist.owner.id === req.session.user_id);
        
        
    } catch (error) {
        console.error(error);
        res.status(500).render('error', {status: 500});
    }
}

const getTracks = async (req, res, playlist) => {
    try {
        playlist.retrievedTracks = [];

        let limit;
        if (playlist.tracks.total > 50) {
            limit = 50;
        }
        else {
            limit = playlist.tracks.total;
        }
        // offset should be random number between 0 and total - limit
        let offset = Math.floor(Math.random() * (playlist.tracks.total - limit));
        console.log(`offset: ${offset}`);
        console.log(`limit: ${limit}`);



        const response = await axios.get(playlist.tracks.href, {
            headers: { 'Authorization': 'Bearer ' + req.session.access_token },
            json: true,
            params: {
                limit: limit,
                offset: offset
            }

        });
        playlist.retrievedTracks = response.data.items;
        return response;
        
    } catch (error) {
        console.error(error);
        res.status(500).render('error', {status: 500});
    }
}

const generateSongs = async (req, res) => {
    try {
        const playlist = req.session.playlists.find(playlist => playlist.id === req.params.playlistId);
        // reset retrievedTracks
        console.log(`playlist id: ${playlist.id}`);
        
        if (playlist.tracks.total < 5) {
            // modify htmx headers
            res.setHeader('HX-Trigger', 'handleRes');
            res.status(400).end();
            return;
        }

        let response = await getTracks(req, res, playlist);
        if (response.status === 200) {
            // get 5 random track id's from playlist
            const random_track_ids = [];
            for (let i = 0; i < 5; i++) {
                random_track_ids.push(playlist.retrievedTracks[Math.floor(Math.random() * playlist.retrievedTracks.length)].track.id);
            }
            // console.log(random_track_ids);
            response = await getRecommendedTracks(req, res, random_track_ids);
            // print resposne items
            console.log(response.data.tracks);
            res.status(200).render('generatedsongs', {songs: response.data.tracks, playlist_id: playlist.id});

            
           
        }
    }
    catch (error) {
        console.error(error);
        res.status(500).render('error', {status: 500});
    }
}

const getRecommendedTracks = async (req, res, track_ids) => {
    try {
        // turn track id's into comma separated string
        track_ids = track_ids.join();
        
        const response = await axios.get('https://api.spotify.com/v1/recommendations', {
            headers: { 'Authorization': 'Bearer ' + req.session.access_token },
            json: true,
            params: {
                seed_tracks: track_ids,
                limit: 20
            }

        });
        return response;

        
        
    } catch (error) {
        console.error(error);
        res.status(500).render('error', {status: 500});
    }
}

const addSong = async (req, res) => {
    try {
        const playlist_id = req.body.playlistId;
        const track_uri = req.body.trackUri;
        console.log(`playlist id: ${playlist_id}`);
        console.log(`track uri: ${track_uri}`);
        console.log('req.query:', req.body);
        console.log(`acccess token: ${req.session.access_token}`);

        response = await axios({
            method: 'post',
            url: 'https://api.spotify.com/v1/playlists/' + playlist_id + '/tracks',
            headers: { 'Authorization': 'Bearer ' + req.session.access_token },
            data: {
                uris: [track_uri],
                position: 0
            }
        });
        if (response.status === 201) {
            console.log("song added to playlist");
            res.status(200).render('addSongs');
        }
    }
    catch (error) {
        console.error(error);
        res.status(500).render('error', {status: 500});
    }
}
    

module.exports = {home, login, callback, isAuth, getPlaylists, signout, refreshAccessToken, landingPage, generateSongs, addSong};