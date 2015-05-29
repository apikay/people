'use strict';

exports.init = function (req, res) {
  if (req.isAuthenticated()) {
    res.redirect(req.user.defaultReturnUrl());
  }
  else {
    req.app.db.models.Settings.getParam(['twitterKey', 'githubKey', 'facebookKey', 'googleKey', 'tumblrKey'], function(err, params) {
      res.render('signup/index', {
        oauthMessage: '',
        oauthTwitter: !!params.twitterKey,
        oauthGitHub: !!params.githubKey,
        oauthFacebook: !!params.facebookKey,
        oauthGoogle: !!params.googleKey,
        oauthTumblr: !!params.tumblrKey
      });
    });
  }
};

exports.signup = function (req, res) {
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function () {
    if (!req.body.username) {
      workflow.outcome.errfor.username = 'required';
    }
    else if (!/^[a-zA-Z0-9\-\_]+$/.test(req.body.username)) {
      workflow.outcome.errfor.username = 'only use letters, numbers, \'-\', \'_\'';
    }

    if (!req.body.email) {
      workflow.outcome.errfor.email = 'required';
    }
    else if (!/^[a-zA-Z0-9\-\_\.\+]+@[a-zA-Z0-9\-\_\.]+\.[a-zA-Z0-9\-\_]+$/.test(req.body.email)) {
      workflow.outcome.errfor.email = 'invalid email format';
    }

    if (!req.body.password) {
      workflow.outcome.errfor.password = 'required';
    }

    if (workflow.hasErrors()) {
      return workflow.emit('response');
    }

    workflow.emit('duplicateUsernameCheck');
  });

  workflow.on('duplicateUsernameCheck', function () {
    req.app.db.models.User.findOne({username: req.body.username}, function (err, user) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (user) {
        workflow.outcome.errfor.username = 'username already taken';
        return workflow.emit('response');
      }

      workflow.emit('duplicateEmailCheck');
    });
  });

  workflow.on('duplicateEmailCheck', function () {
    req.app.db.models.User.findOne({email: req.body.email.toLowerCase()}, function (err, user) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (user) {
        workflow.outcome.errfor.email = 'email already registered';
        return workflow.emit('response');
      }

      workflow.emit('createUser');
    });
  });

  workflow.on('createUser', function () {
    req.app.db.models.User.encryptPassword(req.body.password, function (err, hash) {
      if (err) {
        return workflow.emit('exception', err);
      }

      var fieldsToSet = {
        isActive: 'yes',
        username: req.body.username,
        email: req.body.email.toLowerCase(),
        password: hash,
        search: [
          req.body.username,
          req.body.email
        ]
      };
      req.app.db.models.User.create(fieldsToSet, function (err, user) {
        if (err) {
          return workflow.emit('exception', err);
        }

        workflow.user = user;
        workflow.emit('sendWelcomeEmail');
      });
    });
  });

  workflow.on('sendWelcomeEmail', function () {
    req.app.db.models.Settings.getParam(['smtpFromName', 'smtpFromAddress', 'projectName'], function(err, params) {
      req.app.utility.sendmail(req, res, {
        from: params.smtpFromName + ' <' + params.smtpFromAddress + '>',
        to: req.body.email,
        subject: 'Your ' + params.projectName + ' Account',
        textPath: 'signup/email-text',
        htmlPath: 'signup/email-html',
        locals: {
          username: req.body.username,
          email: req.body.email,
          loginURL: req.protocol + '://' + req.headers.host + '/login/',
          projectName: params.projectName
        },
        success: function (message) {
          workflow.emit('logUserIn');
        },
        error: function (err) {
          console.log('Error Sending Welcome Email: ' + err);
          workflow.emit('logUserIn');
        }
      });
    });
  });

  workflow.on('logUserIn', function () {
    req._passport.instance.authenticate('local', function (err, user, info) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (!user) {
        workflow.outcome.errors.push('Login failed. That is strange.');
        return workflow.emit('response');
      }
      else {
        req.login(user, function (err) {
          if (err) {
            return workflow.emit('exception', err);
          }

          workflow.outcome.defaultReturnUrl = user.defaultReturnUrl();
          workflow.emit('response');
        });
      }
    })(req, res);
  });

  workflow.emit('validate');
};

exports.signupTwitter = function (req, res, next) {
  req._passport.instance.authenticate('twitter', function (err, user, info) {
    if (!info || !info.profile) {
      return res.redirect('/signup/');
    }

    req.app.db.models.User.findOne({'twitter.id': info.profile.id}, function (err, user) {
      if (err) {
        return next(err);
      }

      if (!user) {
        req.session.socialProfile = info.profile;
        res.render('signup/social', {email: ''});
      }
      else {
        req.app.db.models.Settings.getParam(['twitterKey', 'githubKey', 'facebookKey', 'googleKey', 'tumblrKey'], function(err, params) {
          res.render('signup/index', {
            oauthMessage: 'We found a user linked to your Twitter account.',
            oauthTwitter: !!params.twitterKey,
            oauthGitHub: !!params.githubKey,
            oauthFacebook: !!params.facebookKey,
            oauthGoogle: !!params.googleKey,
            oauthTumblr: !!params.tumblrKey
          });
        });
      }
    });
  })(req, res, next);
};

exports.signupGitHub = function (req, res, next) {
  req._passport.instance.authenticate('github', function (err, user, info) {
    if (!info || !info.profile) {
      return res.redirect('/signup/');
    }

    req.app.db.models.User.findOne({'github.id': info.profile.id}, function (err, user) {
      if (err) {
        return next(err);
      }

      if (!user) {
        req.session.socialProfile = info.profile;
        res.render('signup/social', {email: info.profile.emails && info.profile.emails[0].value || ''});
      }
      else {
        req.app.db.models.Settings.getParam(['twitterKey', 'githubKey', 'facebookKey', 'googleKey', 'tumblrKey'], function(err, params) {
          res.render('signup/index', {
            oauthMessage: 'We found a user linked to your GitHub account.',
            oauthTwitter: !!params.twitterKey,
            oauthGitHub: !!params.githubKey,
            oauthFacebook: !!params.facebookKey,
            oauthGoogle: !!params.googleKey,
            oauthTumblr: !!params.tumblrKey
          });
        });
      }
    });
  })(req, res, next);
};

exports.signupFacebook = function (req, res, next) {
  req._passport.instance.authenticate('facebook', {callbackURL: '/signup/facebook/callback/'}, function (err, user, info) {
    if (!info || !info.profile) {
      return res.redirect('/signup/');
    }

    req.app.db.models.User.findOne({'facebook.id': info.profile.id}, function (err, user) {
      if (err) {
        return next(err);
      }
      if (!user) {
        req.session.socialProfile = info.profile;
        res.render('signup/social', {email: info.profile.emails && info.profile.emails[0].value || ''});
      }
      else {
        req.app.db.models.Settings.getParam(['twitterKey', 'githubKey', 'facebookKey', 'googleKey', 'tumblrKey'], function (err, params) {
          res.render('signup/index', {
            oauthMessage: 'We found a user linked to your Facebook account.',
            oauthTwitter: !!params.twitterKey,
            oauthGitHub: !!params.githubKey,
            oauthFacebook: !!params.facebookKey,
            oauthGoogle: !!params.googleKey,
            oauthTumblr: !!params.tumblrKey
          });
        });
      }
    });
  })(req, res, next);
};

exports.signupGoogle = function (req, res, next) {
  req._passport.instance.authenticate('google', {callbackURL: '/signup/google/callback/'}, function (err, user, info) {
    if (!info || !info.profile) {
      return res.redirect('/signup/');
    }

    req.app.db.models.User.findOne({'google.id': info.profile.id}, function (err, user) {
      if (err) {
        return next(err);
      }
      if (!user) {
        req.session.socialProfile = info.profile;
        res.render('signup/social', {email: info.profile.emails && info.profile.emails[0].value || ''});
      }
      else {
        req.app.db.models.Settings.getParam(['twitterKey', 'githubKey', 'facebookKey', 'googleKey', 'tumblrKey'], function(err, params) {
          res.render('signup/index', {
            oauthMessage: 'We found a user linked to your Google account.',
            oauthTwitter: !!params.twitterKey,
            oauthGitHub: !!params.githubKey,
            oauthFacebook: !!params.facebookKey,
            oauthGoogle: !!params.googleKey,
            oauthTumblr: !!params.tumblrKey
          });
        });
      }
    });
  })(req, res, next);
};

exports.signupTumblr = function (req, res, next) {
  req._passport.instance.authenticate('tumblr', {callbackURL: '/signup/tumblr/callback/'}, function (err, user, info) {
    if (!info || !info.profile) {
      return res.redirect('/signup/');
    }

    if (!info.profile.hasOwnProperty('id')) {
      info.profile.id = info.profile.username;
    }

    req.app.db.models.User.findOne({'tumblr.id': info.profile.id}, function (err, user) {
      if (err) {
        return next(err);
      }
      if (!user) {
        req.session.socialProfile = info.profile;
        res.render('signup/social', {email: info.profile.emails && info.profile.emails[0].value || ''});
      }
      else {
        req.app.db.models.Settings.getParam(['twitterKey', 'githubKey', 'facebookKey', 'googleKey', 'tumblrKey'], function(err, params) {
          res.render('signup/index', {
            oauthMessage: 'We found a user linked to your Tumblr account.',
            oauthTwitter: !!params.twitterKey,
            oauthGitHub: !!params.githubKey,
            oauthFacebook: !!params.facebookKey,
            oauthGoogle: !!params.googleKey,
            oauthTumblr: !!params.tumblrKey
          });
        });
      }
    });
  })(req, res, next);
};

exports.signupSocial = function (req, res) {
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function () {
    if (!req.body.email) {
      workflow.outcome.errfor.email = 'required';
    }
    else if (!/^[a-zA-Z0-9\-\_\.\+]+@[a-zA-Z0-9\-\_\.]+\.[a-zA-Z0-9\-\_]+$/.test(req.body.email)) {
      workflow.outcome.errfor.email = 'invalid email format';
    }

    if (workflow.hasErrors()) {
      return workflow.emit('response');
    }

    workflow.emit('duplicateUsernameCheck');
  });

  workflow.on('duplicateUsernameCheck', function () {
    workflow.username = req.session.socialProfile.username || req.session.socialProfile.id;
    if (!/^[a-zA-Z0-9\-\_]+$/.test(workflow.username)) {
      workflow.username = workflow.username.replace(/[^a-zA-Z0-9\-\_]/g, '');
    }

    req.app.db.models.User.findOne({username: workflow.username}, function (err, user) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (user) {
        workflow.username = workflow.username + req.session.socialProfile.id;
      }
      else {
        workflow.username = workflow.username;
      }

      workflow.emit('duplicateEmailCheck');
    });
  });

  workflow.on('duplicateEmailCheck', function () {
    req.app.db.models.User.findOne({email: req.body.email.toLowerCase()}, function (err, user) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (user) {
        workflow.outcome.errfor.email = 'email already registered';
        return workflow.emit('response');
      }

      workflow.emit('createUser');
    });
  });

  workflow.on('createUser', function () {
    var fieldsToSet = {
      isActive: 'yes',
      isVerified: 'yes',
      username: workflow.username,
      email: req.body.email.toLowerCase(),
      search: [
        workflow.username,
        req.body.email
      ]
    };
    fieldsToSet[req.session.socialProfile.provider] = {id: req.session.socialProfile.id};

    req.app.db.models.User.create(fieldsToSet, function (err, user) {
      if (err) {
        return workflow.emit('exception', err);
      }

      workflow.user = user;
      workflow.emit('sendWelcomeEmail');
    });
  });

  workflow.on('sendWelcomeEmail', function () {
    req.app.db.models.Settings.getParam(['smtpFromName', 'smtpFromAddress', 'projectName'], function(err, params) {
      req.app.utility.sendmail(req, res, {
        from: params.smtpFromName + ' <' + params.projectName + '>',
        to: req.body.email,
        subject: 'Your ' + params.projectName + ' Account',
        textPath: 'signup/email-text',
        htmlPath: 'signup/email-html',
        locals: {
          username: workflow.user.username,
          email: req.body.email,
          loginURL: req.protocol + '://' + req.headers.host + '/login/',
          projectName: params.projectName
        },
        success: function (message) {
          workflow.emit('logUserIn');
        },
        error: function (err) {
          console.log('Error Sending Welcome Email: ' + err);
          workflow.emit('logUserIn');
        }
      });
    });

  });

  workflow.on('logUserIn', function () {
    req.login(workflow.user, function (err) {
      if (err) {
        return workflow.emit('exception', err);
      }

      delete req.session.socialProfile;
      workflow.outcome.defaultReturnUrl = workflow.user.defaultReturnUrl();
      workflow.emit('response');
    });
  });

  workflow.emit('validate');
};
