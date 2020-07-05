require('dotenv').config();
const express = require('express');
const app = express();
const session = require('express-session');
const request = require('request');
const qs = require('querystring');
const url = require('url');
const randomString = require('randomstring');

const port = process.env.PORT || 3000;

const redirect_uri = 'http://localhost:3000/redirect';

app.use(express.static('views'));
app.use(
  session({
    secret: randomString.generate(),
    cookie: { maxAge: 60000 },
    resave: false,
    saveUninitialized: false
  })
);

app.get('/', (req, res, next) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/login', (req, res, next) => {
  req.session.csrf_string = randomString.generate();
  const githubAuthUrl =
    'https://github.com/login/oauth/authorize?' +
    qs.stringify({
      client_id: process.env.CLIENT_ID,
      redirect_uri: redirect_uri,
      state: req.session.csrf_string
    });
  res.redirect(githubAuthUrl);
});

app.all('/redirect', (req, res) => {
  const code = req.query.code;
  const returnedState = req.query.state;
  if (req.session.csrf_string === returnedState) {
    request.post(
      {
        url:
          'https://github.com/login/oauth/access_token?' +
          qs.stringify({
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            code: code,
            redirect_uri: redirect_uri,
            state: req.session.csrf_string
          })
      },
      (error, response, body) => {
          console.log(error, body)
        req.session.access_token = qs.parse(body).access_token;
        res.redirect('/user');
      }
    );
  } else {
    res.redirect('/');
  }
});

app.get('/user', (req, res) => {
    const CircularJSON = require('circular-json');
    const json = CircularJSON.stringify(res);

  request.get(
    {
      url: 'https://api.github.com/user/public_emails',
      headers: {
        Authorization: 'token ' + req.session.access_token,
        'User-Agent': 'GITHUB-LOGINApp'
      }
    },
    (error, response, body) => {
    console.log(response)     
      res.send(
        "<p>You're logged in! Here's all your emails on GitHub: </p>" +
          body +
          '<p>Go back to <a href="./">log in page</a>.</p>'+ json
      );
    }
  );
});

app.listen(port, () => {
  console.log('Server listening at port ' + port);
});