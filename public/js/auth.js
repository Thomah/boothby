function send_infos() {
  var user = document.getElementById("username").value;
  var pwd = document.getElementById("password").value;

  overload_xhr(
    "GET",
    "/api/user",
    function(xhr){
      token = JSON.parse(xhr.response)['token'];
      username = JSON.parse(xhr.response)['user'];
      sessionStorage.setItem('username',username);
      sessionStorage.setItem('token',token);
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
    JSON.stringify()
  );
}
