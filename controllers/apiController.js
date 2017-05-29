'use strict';

const bluebird = require('bluebird');
const request = bluebird.promisifyAll(require('request'), { multiArgs: true });
const cheerio = require('cheerio');
const graph = require('fbgraph');
//const LastFmNode = require('lastfm').LastFmNode;
//const tumblr = require('tumblr.js');
//const GitHub = require('github');
//const Twit = require('twit');
//const stripe = require('stripe')(process.env.STRIPE_SKEY);
//const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
//const Linkedin = require('node-linkedin')(process.env.LINKEDIN_ID, process.env.LINKEDIN_SECRET, process.env.LINKEDIN_CALLBACK_URL);
//const clockwork = require('clockwork')({ key: process.env.CLOCKWORK_KEY });
const paypal = require('paypal-rest-sdk');

/**
 * GET /api
 * List of API examples.
 */
exports.getApi = (req, res) => {
  res.render('api/index', {
    title: 'API Examples'
  });
};


/**
 * GET /api/facebook
 * Facebook API example.
 */
exports.getFacebook = (req, res, next) => {
  const token = req.user.tokens.find(token => token.kind === 'facebook');
  graph.setAccessToken(token.accessToken);
  graph.get(`${req.user.facebook}?fields=id,name,email,first_name,last_name,gender,link,locale,timezone`, (err, results) => {
    if (err) { return next(err); }
    res.render('api/facebook', {
      title: 'Facebook API',
      profile: results
    });
  });
};


/**
 * GET /api/steam
 * Steam API example.
 */
exports.getSteam = (req, res, next) => {
  const steamId = '76561197982488301';
  const params = { l: 'english', steamid: steamId, key: process.env.STEAM_KEY };
  const playerAchievements = () => {
    params.appid = '49520';
    return request.getAsync({ url: 'http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/', qs: params, json: true })
      .then(([request, body]) => {
        if (request.statusCode === 401) {
          throw new Error('Invalid Steam API Key');
        }
        return body;
      });
  };
  const playerSummaries = () => {
    params.steamids = steamId;
    return request.getAsync({ url: 'http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/', qs: params, json: true })
      .then(([request, body]) => {
        if (request.statusCode === 401) {
          throw Error('Missing or Invalid Steam API Key');
        }
        return body;
      });
  };
  const ownedGames = () => {
    params.include_appinfo = 1;
    params.include_played_free_games = 1;
    return request.getAsync({ url: 'http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/', qs: params, json: true })
      .then(([request, body]) => {
        if (request.statusCode === 401) {
          throw new Error('Missing or Invalid Steam API Key');
        }
        return body;
      });
  };
  Promise.all([
    playerAchievements(),
    playerSummaries(),
    ownedGames()
  ])
  .then(([playerAchievements, playerSummaries, ownedGames]) => {
    res.render('api/steam', {
      title: 'Steam Web API',
      ownedGames: ownedGames.response.games,
      playerAchievemments: playerAchievements.playerstats,
      playerSummary: playerSummaries.response.players[0]
    });
  })
  .catch(next);
};


/**
 * GET /api/paypal
 * PayPal SDK example.
 */
exports.getPayPal = (req, res, next) => {
  paypal.configure({
    mode: 'sandbox',
    client_id: process.env.PAYPAL_ID,
    client_secret: process.env.PAYPAL_SECRET
  });

  const paymentDetails = {
    intent: 'sale',
    payer: {
      payment_method: 'paypal'
    },
    redirect_urls: {
      return_url: process.env.PAYPAL_RETURN_URL,
      cancel_url: process.env.PAYPAL_CANCEL_URL
    },
    transactions: [{
      description: 'Hackathon Starter',
      amount: {
        currency: 'USD',
        total: '1.99'
      }
    }]
  };

  paypal.payment.create(paymentDetails, (err, payment) => {
    if (err) { return next(err); }
    req.session.paymentId = payment.id;
    const links = payment.links;
    for (let i = 0; i < links.length; i++) {
      if (links[i].rel === 'approval_url') {
        res.render('api/paypal', {
          approvalUrl: links[i].href
        });
      }
    }
  });
};

/**
 * GET /api/paypal/success
 * PayPal SDK example.
 */
exports.getPayPalSuccess = (req, res) => {
  const paymentId = req.session.paymentId;
  const paymentDetails = { payer_id: req.query.PayerID };
  paypal.payment.execute(paymentId, paymentDetails, (err) => {
    res.render('api/paypal', {
      result: true,
      success: !err
    });
  });
};

/**
 * GET /api/paypal/cancel
 * PayPal SDK example.
 */
exports.getPayPalCancel = (req, res) => {
  req.session.paymentId = null;
  res.render('api/paypal', {
    result: true,
    canceled: true
  });
};


/**
 * GET /api/upload
 * File Upload API example.
 */

exports.getFileUpload = (req, res) => {
  res.render('api/upload', {
    title: 'File Upload'
  });
};

exports.postFileUpload = (req, res) => {
  req.flash('success', { msg: 'File was uploaded successfully.' });
  res.redirect('/api/upload');
};


