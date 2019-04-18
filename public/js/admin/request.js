// eslint-disable-next-line no-unused-vars
function overload_xhr(method,
  path,
  success_function = function () { },
  before_function = function () { },
  error_function = function () { },
  params_url = '') {
    
  var xhr = new XMLHttpRequest();
  xhr.open(method, path);
  before_function(xhr);
  var token = getCookie('token');
  //When the user is not auth, the token is not in the cookie, there is no token to send
  if (token !== '') {
    xhr.setRequestHeader('Token', token);
  }
  xhr.onload = function () {
    if (xhr.status === 200) {
      success_function(this);
    } else if (xhr.status === 401) {
      alert("Not authorized, you need to autenticate : Error " + xhr.status);
      window.location = '/admin/auth.html';
    } else {
      error_function();
    }
  };
  xhr.send(params_url);
}

// eslint-disable-next-line no-unused-vars
function setCookie(cname, cvalue, exhours) {
  var d = new Date();
  d.setTime(d.getTime() + (exhours * 60 * 60 * 1000));
  var expires = "expires=" + d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
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