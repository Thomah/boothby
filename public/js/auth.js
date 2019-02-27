//When we press the enter button, we trigger the login button
document.getElementById("password")
    .addEventListener("keyup", function(event) {
    event.preventDefault();
    if (event.keyCode === 13) {
        document.getElementById("login").click(); // or just login()
    }
});

function login() {
  var user = document.getElementById("username").value;
  var pwd = document.getElementById("password").value;

  overload_xhr(
    "POST",
    "/api/user/login",
    function(xhr){
      var token = JSON.parse(xhr.response)['token'];
      setCookie('token',token,10);
      window.location = 'index.html';
    },
    function(xhr){
      xhr.setRequestHeader('user', user);
      xhr.setRequestHeader('pwd', pwd);
    },
    function(){
      var par = document.getElementById("alert-login");
      par.style.display = "block";
    },
  );
}

function logout() {
  overload_xhr(
    "POST",
    "/api/user/logout",
    function(xhr){
      setCookie('token','',0);//Delete the cookie
      window.location = 'auth.html';
    }
  );
}

function add_user() {
  var user = document.getElementById("username").value;
  var pwd = document.getElementById("password").value;

  var par_success = document.getElementById("user-created");
  var par_not_success = document.getElementById("user-not-created");

  overload_xhr(
    "POST",
    "/api/user",
    function(){
      par_success.style.display = "block";
      par_not_success.style.display = "none";
    },
    function(xhr){
      xhr.setRequestHeader('user', user);
      xhr.setRequestHeader('pwd', pwd);
    },
    function(){
      par_success.style.display = "none";
      par_not_success.style.display = "block";
    },
  );
}
