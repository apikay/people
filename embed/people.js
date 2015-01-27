'use strict';

(function() {

  var httpRequest;

  /**
   * Make AJAX request.
   * @param method
   * @param url
   * @param data
   * @param next
   * @returns {boolean}
   */
  function makeRequest(method, url, data, next) {
    httpRequest = new XMLHttpRequest();

    if (!httpRequest) {
      alert('Giving up :( Cannot create an XMLHTTP instance');
      return false;
    }

    var str = [];
    for (var p in data) {
      if (data.hasOwnProperty(p)) {
        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(data[p]));
      }
    }
    data = str.join("&");

    httpRequest.open(method, url);
    httpRequest.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    httpRequest.send(data);
    httpRequest.onreadystatechange = next;
  }

  /**
   * Set Cookies.
   * @param cname
   * @param cvalue
   * @param exdays
   */
  function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + "; " + expires;
  }

  /**
   * Get Cookies.
   * @param cname
   * @returns {string}
   */
  function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  }

  /**
   * Erase Cookie.
   * @param name
   */
  function eraseCookie(name) {
    setCookie(name, "", -1);
  }

  /**
   * After user login process.
   */
  function login(data) {
    if (data.success === true) {
      // Set cookies.
      setCookie('people.sid', data.sid, 14);

      // Save Shallow user to local storage.
      localStorage.setItem('people.user', JSON.stringify(data.user));

      // Show the logged-in user block.
      userBlock();
    }
    else {
      for (var key in data.errfor) {
        var errfor = key + ': ' + data.errfor[key] + '\n';
      }
      for (var i = 0; error = data.errors[i]; ++i) {
        var errors = error + '\n';
      }
      alert(errfor + errors);
    }
  }

  /**
   * Logout current user.
   */
  function Logout() {
    eraseCookie('people.sid');
    localStorage.removeItem('people.user');
    formsLoginBlock();
  }

  /**
   * Logged-in user block.
   */
  function userBlock() {
    var user = JSON.parse(localStorage.getItem('people.user'));
    if (user) {
      var userBlock = '';
      userBlock += '<div class="people-block" id="user-block">';
      userBlock += '<div id="user-gravatar"><img src="' + user.gravatar + '"></div>';
      userBlock += '<span id="user-name">' + user.username + '</span>';
      userBlock += '<span> | <a class="to-logout" href="javascript:void(0)">Log Out</a></span>';
      userBlock += '</div>';

      document.getElementById("people-dash").innerHTML = userBlock;
    }
  }

  /**
   * login/register block.
   */
  function formsLoginBlock() {
    var loginHTML = '';
    loginHTML += '<div class="people-block" id="people-login">';
    loginHTML += '<form class="login">';
    loginHTML += '<div class="form-field"><input id="login-name" type="textfield" placeholder="Name" value></div>';
    loginHTML += '<div class="form-field"><input id="login-pass" type="password" placeholder="Password" value></div>';
    loginHTML += '<button id="login-btn" type="button" name="button-login">Login</button> ';
    loginHTML += '<a class="to-forgot" href="javascript:void(0)">Forgot my password</a>';
    loginHTML += '</form>';
    loginHTML += '<div>New here? <a class="to-register" href="javascript:void(0)">Register</a></div>';
    loginHTML += '</div>';

    document.getElementById("people-dash").innerHTML = loginHTML;
  }

  function formsRegisterBlock() {
    var registerHTML = '';
    registerHTML += '<div class="people-block" id="people-register">';
    registerHTML += '<form class="register">';
    registerHTML += '<div class="form-field"><input id="register-name" type="textfield" placeholder="Name" value></div>';
    registerHTML += '<div class="form-field"><input id="register-email" type="text" placeholder="Email" value></div>';
    registerHTML += '<div class="form-field"><input id="register-pass" type="password" placeholder="Password" value></div>';
    registerHTML += '<button id="register-btn" type="button" name="button-register">Register</button>';
    registerHTML += '</form>';
    registerHTML += '<span>Already a member? <a class="to-login" href="javascript:void(0)">Login</a></span>';
    registerHTML += '</div>';

    document.getElementById("people-dash").innerHTML = registerHTML;
  }

  function formsForgotBlock() {
    var forgotHTML = '';
    forgotHTML += '<div class="people-block" id="people-forgot">';
    forgotHTML += '<div class="form-field"><form class="forgot">';
    forgotHTML += '<div class="form-field"><input id="forgot-email" type="text" placeholder="Email" value></div>';
    forgotHTML += '<button id="forgot-btn" type="button" name="button-forgot">Send to my mail</button>';
    forgotHTML += '</form>';
    forgotHTML += '<a class="to-login" href="javascript:void(0)">Back to login</a>';
    forgotHTML += '</div>';

    document.getElementById("people-dash").innerHTML = forgotHTML;
  }

  function formsForgotResetBlock() {
    var forgotResetHTML = '';
    forgotResetHTML += '<div class="people-block" id="people-forgot-reset">';
    forgotResetHTML += '<form class="forgot-reset">';
    forgotResetHTML += '<div class="form-field"><input id="forgot-reset-token" type="text" placeholder="Verification Token"></div>';
    forgotResetHTML += '<div class="form-field"><input id="forgot-reset-pass" type="password" placeholder="New Password"></div>';
    forgotResetHTML += '<button id="forgot-reset-btn" type="button" name="button-forgot-reset">Update Password</button>';
    forgotResetHTML += '</form>';
    forgotResetHTML += '</div>';

    document.getElementById("people-dash").innerHTML = forgotResetHTML;
  }

  /**
   * Hide login/register forms.
   */
  function removePeople() {
    document.getElementById("people-dash").innerHTML = '';
  }

  /**
   * Events.
   */
  document.addEventListener("click", function(e) {

    // Elements ID
    switch (e.target.id) {
      case 'login-btn':
        makeRequest('POST', 'http://localhost:3000/remote/login/', {
          username: document.getElementById("login-name").value,
          password: document.getElementById("login-pass").value
        }, function() {
          if (httpRequest.readyState === 4 && httpRequest.status === 200) {
            login(JSON.parse(httpRequest.responseText));
          }
        });
        break;

      case 'register-btn':
        makeRequest('POST', 'http://localhost:3000/remote/signup/', {
          username: document.getElementById("register-name").value,
          email:    document.getElementById("register-email").value,
          password: document.getElementById("register-pass").value
        }, function() {
          if (httpRequest.readyState === 4 && httpRequest.status === 200) {
            login(JSON.parse(httpRequest.responseText));
          }
        });
        break;

      case 'forgot-btn':
        makeRequest('POST', 'http://localhost:3000/remote/forgot/', {
          email: document.getElementById("forgot-email").value
        }, function() {
          if (httpRequest.readyState === 4 && httpRequest.status === 200) {
            var data = JSON.parse(httpRequest.responseText);
            if (data.success === true) {
              formsForgotResetBlock();
            }
          }
        });
        break;

      case 'forgot-reset-btn':
        makeRequest('POST', 'http://localhost:3000/remote/forgot/reset/', {
          token:    document.getElementById("forgot-reset-token").value,
          password: document.getElementById("forgot-reset-pass").value
        }, function() {
          if (httpRequest.readyState === 4 && httpRequest.status === 200) {
            var data = JSON.parse(httpRequest.responseText);
            if (data.success === true) {
              formsLoginBlock();
            }
          }
        });
        break;
    }

    // Elements Class
    switch (e.target.className) {
      case 'to-login':
        formsLoginBlock();
        break;

      case 'to-register':
        formsRegisterBlock();
        break;

      case 'to-forgot':
        formsForgotBlock();
        break;

      case 'to-logout':
        Logout();
        break;
    }
  });

  if (getCookie('people.sid')) {
    userBlock();
  }
  else {
    localStorage.removeItem('peolple.user');
    formsLoginBlock();
  }
})();
