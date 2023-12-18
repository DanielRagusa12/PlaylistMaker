// const { default: mongoose } = require('mongoose')
// const Hero = require('../models/db')
const querystring = require('querystring');
const randomstring = require('randomstring');
const request = require('request');


var stateKey = 'spotify_auth_state';

let counter = 0;

const signout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return console.log(err);
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

                // get users playlists to display after login
                // getPlaylists(req, res, () => {
                //     res.redirect('/');
                // });
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



const home = async (req, res) => {
    if (req.session.access_token) {
        // update playlists
        await getPlaylists(req, res, () => {
            console.log("playlists updated")
        });
    }

    try {
        res.status(200).render('index', {
            counter: counter, 
            user_id: req.session.user_id, 
            profile_pic: req.session.profile_pic,
            user_playlists: req.session.playlists
        })    
    }

    catch (err) {
        res.status(400).json({ message: err.message })
    }
    
}



const getPlaylists = (req, res) => {
    return new Promise((resolve, reject) => {
        var options = {
            url: 'https://api.spotify.com/v1/users/' + req.session.user_id + '/playlists',
            headers: { 'Authorization': 'Bearer ' + req.session.access_token },
            json: true
        };

        request.get(options, function(error, response, body) {
            // console.log(body);
            req.session.playlists = body.items
            console.log(req.session.playlists)
            resolve();
        });  
});
}







module.exports = {home, login, callback, isAuth, getPlaylists, signout}
