// controllers/promptController.js

const querystring = require('querystring');
const randomstring = require('randomstring');
const axios = require('axios');
const fs = require('fs');
const winston = require('winston');

// Create logs folder if it doesn't exist
if (!fs.existsSync('./logs')) {
    fs.mkdirSync('./logs');
}

// Configure the logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(info => `${info.level}: ${info.message} ${JSON.stringify({ timestamp: info.timestamp })}`)
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console()
    ],
});

// Override console methods to use the logger
console.log = (...args) => logger.info(args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' '));
console.error = (...args) => logger.error(args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' '));
console.warn = (...args) => logger.warn(args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' '));
console.info = (...args) => logger.info(args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' '));

const refreshAccessToken = async (req, res, next) => {
    if (Date.now() - req.session.token_received_at < req.session.expires_in * 1000) {
        console.log("Token is still valid");
        next();
    } else {
        try {
            const response = await axios.post('https://accounts.spotify.com/api/token', querystring.stringify({
                refresh_token: req.session.refresh_token,
                grant_type: 'refresh_token'
            }), {
                headers: {
                    'content-type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + (Buffer.from(process.env.CLIENT_ID + ':' + process.env.CLIENT_SECRET).toString('base64')),
                }
            });

            if (response.status === 200) {
                req.session.access_token = response.data.access_token;
                req.session.token_received_at = Date.now();
                req.session.expires_in = response.data.expires_in;
                req.session.scope = response.data.scope;
                console.log("Token refreshed");
                next();
            } else {
                console.error(`Unexpected response status: ${response.status}`);
                res.status(500).render('error', { status: 500 });
            }
        } catch (error) {
            if (error.response) {
                console.error(`Error refreshing access token - Response Error: Status ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
            } else if (error.request) {
                console.error(`Error refreshing access token - No Response: ${error.request}`);
            } else {
                console.error(`Error refreshing access token - General Error: ${error.message}`);
            }
            res.status(500).render('error', { status: 500 });
        }
    }
};

const signout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error(`Error destroying session: ${err.message}`);
            res.status(500).render('error', { status: 500 });
            return;
        }
        res.redirect('/welcome');
    });
};

const isAuth = (req, res, next) => {
    if (req.session.access_token) {
        next();
    } else {
        if (req.headers['hx-request']) {
            console.log("HTMX request!");
            res.setHeader('HX-Redirect', '/login');
            res.end();
        } else {
            res.redirect('/welcome');
        }
    }
};

const login = (req, res) => {
    const state = randomstring.generate(16);

    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: process.env.CLIENT_ID,
            scope: "user-read-private user-read-email playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private",
            redirect_uri: `http://localhost:${process.env.PORT}/callback`,
            state: state,
            show_dialog: true
        }));
};

const callback = async (req, res) => {
    const code = req.query.code || null;
    const state = req.query.state || null;

    if (state === null || code === null) {
        console.error('State or code is null in callback.');
        res.redirect('/welcome');
    } else {
        try {
            // Get access token from Spotify
            const response = await axios.post('https://accounts.spotify.com/api/token', querystring.stringify({
                code: code,
                redirect_uri: `http://localhost:${process.env.PORT}/callback`,
                grant_type: 'authorization_code'
            }), {
                headers: {
                    'content-type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + (Buffer.from(process.env.CLIENT_ID + ':' + process.env.CLIENT_SECRET).toString('base64')),
                }
            });

            if (response.status === 200) {
                req.session.access_token = response.data.access_token;
                req.session.token_received_at = Date.now();
                req.session.refresh_token = response.data.refresh_token;
                req.session.expires_in = response.data.expires_in;
                req.session.scope = response.data.scope;

                // Get user ID and profile picture
                const userResponse = await axios.get('https://api.spotify.com/v1/me', {
                    headers: { 'Authorization': 'Bearer ' + req.session.access_token },
                });

                if (userResponse.status === 200) {
                    //console.log(`User response data: ${JSON.stringify(userResponse.data)}`);
                    req.session.user_id = userResponse.data.id;

                    if (!req.session.user_id) {
                        console.error('User ID is missing in the response data.');
                        res.redirect('/login');
                        return;
                    }

                    req.session.profile_pic = userResponse.data.images.length !== 0 ? userResponse.data.images[0].url : null;
                    console.log(`User authenticated: ${req.session.user_id}`);
                    res.redirect('/');
                } else {
                    console.error('Failed to retrieve user information.');
                    res.redirect('/login');
                }
            } else {
                console.error(`Unexpected response status during token exchange: ${response.status}`);
                res.status(500).render('error', { status: 500 });
            }
        } catch (error) {
            if (error.response) {
                console.error(`Error in callback - Response Error: Status ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
            } else if (error.request) {
                console.error(`Error in callback - No Response: ${error.request}`);
            } else {
                console.error(`Error in callback - General Error: ${error.message}`);
            }
            res.status(500).render('error', { status: 500 });
        }
    }
};

const landingPage = (req, res) => {
    try {
        res.status(200).render('landingpage');
    } catch (err) {
        console.error(`Error rendering landing page: ${err.message}`);
        res.status(500).render('error', { status: 500 });
    }
};

const home = async (req, res) => {
    try {
        if (req.session.access_token && req.session.user_id) {
            console.log(`Access token and user ID are present in session. User ID: ${req.session.user_id}`);
            await getPlaylists(req);
        } else {
            console.error('Access token or user ID is missing from session.');
            res.redirect('/login');
            return;
        }

        // Log the user_playlists data
        //console.log(`User playlists data: ${JSON.stringify(req.session.playlists)}`);

        res.status(200).render('index', {
            user_id: req.session.user_id || 'Unknown User',
            profile_pic: req.session.profile_pic || null,
            user_playlists: req.session.playlists || [],
            PORT: process.env.PORT
        });
    } catch (err) {
        console.error(`Error in home function: ${err.message}`);
        res.status(500).render('error', { status: 500 });
    }
};


const getPlaylists = async (req) => {
    try {
        console.log('Fetching playlists for current user');
        const response = await axios.get('https://api.spotify.com/v1/me/playlists', {
            headers: { 'Authorization': 'Bearer ' + req.session.access_token },
        });

        // Filter out null or undefined playlists
        const validPlaylists = response.data.items.filter(playlist => playlist != null);

        // Ensure that each playlist has an images array
        req.session.playlists = validPlaylists.map(playlist => ({
            ...playlist,
            images: playlist.images || []
        }));

        console.log(`Playlists retrieved: ${req.session.playlists.length}`);
    } catch (error) {
        if (error.response) {
            console.error(`Error in getPlaylists - Response Error: Status ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
            console.error(`Error in getPlaylists - No Response: ${error.request}`);
        } else {
            console.error(`Error in getPlaylists - General Error: ${error.message}`);
        }
        throw error;
    }
};


const getTracks = async (req, playlist) => {
    try {
        playlist.retrievedTracks = [];

        const limit = playlist.tracks.total > 50 ? 50 : playlist.tracks.total;
        const offset = Math.floor(Math.random() * (playlist.tracks.total - limit));
        console.log(`Fetching tracks with offset: ${offset}, limit: ${limit}`);

        const response = await axios.get(playlist.tracks.href, {
            headers: { 'Authorization': 'Bearer ' + req.session.access_token },
            params: {
                limit: limit,
                offset: offset
            }
        });

        playlist.retrievedTracks = response.data.items;
        console.log(`Tracks retrieved: ${playlist.retrievedTracks.length}`);
        return response;
    } catch (error) {
        if (error.response) {
            console.error(`Error in getTracks - Response Error: Status ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
            console.error(`Error in getTracks - No Response: ${error.request}`);
        } else {
            console.error(`Error in getTracks - General Error: ${error.message}`);
        }
        throw error;
    }
};

const getRecommendedTracks = async (req, track_ids) => {
    try {
        const seed_tracks = track_ids.join(',');

        console.log(`Fetching recommended tracks with seed tracks: ${seed_tracks}`);

        const response = await axios.get('https://api.spotify.com/v1/recommendations', {
            headers: { 'Authorization': 'Bearer ' + req.session.access_token },
            params: {
                seed_tracks: seed_tracks,
                limit: 20
            }
        });

        console.log(`Recommended tracks retrieved: ${response.data.tracks.length}`);
        return response;
    } catch (error) {
        if (error.response) {
            console.error(`Error in getRecommendedTracks - Response Error: Status ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
            console.error(`Error in getRecommendedTracks - No Response: ${error.request}`);
        } else {
            console.error(`Error in getRecommendedTracks - General Error: ${error.message}`);
        }
        throw error;
    }
};

const generateSongs = async (req, res) => {
    try {
        const playlist = req.session.playlists.find(p => p.id === req.params.playlistId);

        if (!playlist) {
            console.error(`Playlist not found with ID: ${req.params.playlistId}`);
            res.status(404).render('error', { status: 404 });
            return;
        }

        console.log(`Generating songs for playlist ID: ${playlist.id}`);

        if (playlist.tracks.total < 5) {
            console.error('Playlist has fewer than 5 tracks.');
            res.setHeader('HX-Trigger', 'handleRes');
            res.status(400).end();
            return;
        }

        const trackResponse = await getTracks(req, playlist);
        if (trackResponse.status === 200) {
            // Get 5 random track IDs from the playlist
            const random_track_ids = [];
            for (let i = 0; i < 5; i++) {
                const randomIndex = Math.floor(Math.random() * playlist.retrievedTracks.length);
                const track = playlist.retrievedTracks[randomIndex]?.track;
                if (track && track.id) {
                    random_track_ids.push(track.id);
                } else {
                    console.error(`Invalid track data at index: ${randomIndex}`);
                }
            }

            const recommendedResponse = await getRecommendedTracks(req, random_track_ids);
            console.log(`Recommended tracks: ${JSON.stringify(recommendedResponse.data.tracks)}`);

            res.status(200).render('generatedsongs', {
                songs: recommendedResponse.data.tracks,
                playlist_id: playlist.id,
                PORT: process.env.PORT
            });
        } else {
            console.error('Failed to retrieve tracks from playlist.');
            res.status(500).render('error', { status: 500 });
        }
    } catch (error) {
        console.error(`Error in generateSongs: ${error.message}`);
        res.status(500).render('error', { status: 500 });
    }
};

const addSong = async (req, res) => {
    try {
        const playlist_id = req.body.playlistId;
        const track_uri = req.body.trackUri;
        console.log(`Adding song to playlist ID: ${playlist_id}, track URI: ${track_uri}`);
        console.log(`Request body: ${JSON.stringify(req.body)}`);

        const response = await axios.post(`https://api.spotify.com/v1/playlists/${playlist_id}/tracks`, {
            uris: [track_uri],
            position: 0
        }, {
            headers: { 'Authorization': 'Bearer ' + req.session.access_token },
        });

        console.log(`Spotify API response status: ${response.status}`);
        console.log(`Spotify API response data: ${JSON.stringify(response.data)}`);

        if (response.status === 201) {
            console.log("Song added to playlist");
            res.status(200).render('addSongs');
        } else {
            console.error(`Unexpected response status when adding song: ${response.status}`);
            res.status(response.status).render('error', { status: response.status });
        }
    } catch (error) {
        if (error.response) {
            console.error(`Error in addSong - Response Error: Status ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
            console.error(`Error in addSong - No Response: ${error.request}`);
        } else {
            console.error(`Error in addSong - General Error: ${error.message}`);
        }
        res.status(500).render('error', { status: 500 });
    }
};

module.exports = {
    home,
    login,
    callback,
    isAuth,
    signout,
    refreshAccessToken,
    landingPage,
    generateSongs,
    addSong
};
