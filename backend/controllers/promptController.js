// const { default: mongoose } = require('mongoose')
// const Hero = require('../models/db')
const querystring = require('querystring');
const randomstring = require('randomstring');
const request = require('request');


var stateKey = 'spotify_auth_state';

let counter = 0;



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

const callback = (req, res) => {
    var code = req.query.code || null;
    var state = req.query.state || null;
    
    

    if (state === null) {
        res.redirect('/#' +
          querystring.stringify({
            error: 'state_mismatch'
          }));
      } else {
        var authOptions = {
          url: 'https://accounts.spotify.com/api/token',
          form: {
            code: code,
            redirect_uri: "http://localhost:4000/callback",
            grant_type: 'authorization_code'
          },
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + (new Buffer.from(process.env.CLIENT_ID + ':' + process.env.CLIENT_SECRET).toString('base64'))
          },
          json: true
        };
      }

      request.post(authOptions, (error, response, body) => {
        if (!error && response.statusCode === 200) {
            req.session.access_token = body.access_token;
            req.session.refresh_token = body.refresh_token;
            req.session.expires_in = body.expires_in;
            req.session.scope = body.scope;
        
            var options = {
                url: 'https://api.spotify.com/v1/me',
                headers: { 'Authorization': 'Bearer ' + req.session.access_token },
                json: true
            };
            
        
            request.get(options, function(error, response, body) {
                console.log(body);
                req.session.user_id = body.id
                // get users profile picture
                // if body images is not empty
                if (body.images.length != 0) {
                    req.session.profile_pic = body.images[0].url
                } else {
                    req.session.profile_pic = null
                }
                console.log(req.session.profile_pic)

                res.redirect('/');

                
            });

             

        }   else {
            res.redirect('/#' +
                querystring.stringify({
                    error: 'invalid_token'
            }));
        }
      })
    }



const home = (req, res) => {
    

    try {
        res.status(200).render('index', {counter: counter, user_id: req.session.user_id, profile_pic: req.session.profile_pic})    
    }

    catch (err) {
        res.status(400).json({ message: err.message })
    }
    
}

const click = (req, res) => {
    
    
    try {
        counter++
        res.status(200).render('click', {counter: counter})
    }

    catch (err) {
        res.status(400).json({ message: err.message })
    }
    
}

const reset = (req, res) => {
    try {
        counter = 0
        res.status(200).render('click', {counter: counter})
    }

    catch (err) {
        res.status(400).json({ message: err.message })
    }
    
}

const getPlaylists = (req, res) => {
    var options = {
        url: 'https://api.spotify.com/v1/users/' + req.session.user_id + '/playlists',
        headers: { 'Authorization': 'Bearer ' + req.session.access_token },
        json: true
    };

    // log users id
    console.log(req.session.user_id)
    request.get(options, function(error, response, body) {
        console.log(body);
        res.end();
    });


    
}






module.exports = {home, click, reset, login, callback, isAuth, getPlaylists}
