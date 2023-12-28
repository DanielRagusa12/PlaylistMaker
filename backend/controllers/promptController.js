// const { default: mongoose } = require('mongoose')
// const Hero = require('../models/db')
const querystring = require('querystring');
const randomstring = require('randomstring');
const axios = require('axios');







const signout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return err;
        }
        res.redirect('/');
    });
};



const isAuth = (req, res, next) => {
    if (req.session.access_token) {
        next()
    } else {
        // check if it is a htmx request
        if (req.headers['hx-request']) {
            // set redirect url header
            console.log("htmx request!")
            res.setHeader('HX-Redirect', '/login')
            res.end()
        }
        else {
            res.redirect('/login')
        }    
    }
};



const login = (req, res) => {
    
    var state = randomstring.generate(16);


    res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
    response_type: 'code',
    client_id: process.env.CLIENT_ID,
    scope: "user-read-private user-read-email playlist-read-private playlist-read-collaborative",
    redirect_uri: "http://localhost:4000/callback",
    state: state,
    show_dialog: true
    }));   
};

const callback = async (req, res) => {
    var code = req.query.code || null;
    var state = req.query.state || null;

    if (state === null) {
        res.redirect('/#' +
          querystring.stringify({
            error: 'state_mismatch'
          }));
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
            console.log(error);
            throw error
        }
    }
};




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
        })    
    }

    catch (err) {
        res.status(400).json({ message: err.message })
    }
    
}



const getPlaylists = async (req, res) => {
    try {
        const response = await axios.get('https://api.spotify.com/v1/users/' + req.session.user_id + '/playlists', {
            headers: { 'Authorization': 'Bearer ' + req.session.access_token },
            json: true
        });
        console.log(response.data.items);

        // req.session.playlists = response.data.items;
        // delete playlists that are not owned by user
        req.session.playlists = response.data.items.filter(playlist => playlist.owner.id === req.session.user_id)
        

    } catch (error) {
        console.log(error);
        throw error; // This will be caught by the calling function
    }
}







module.exports = {home, login, callback, isAuth, getPlaylists, signout}
