//This function has been made to override all XMLHTTPrequest
function overload_xhr(method, 
                      path, 
                      success_function = function(){}, 
                      before_function = function(){}, 
                      error_function= function(){}, 
                      params_url=''){

    var xhr = new XMLHttpRequest();
    xhr.open(method, path);
    before_function(xhr);
    token = sessionStorage.getItem('token');
    username = sessionStorage.getItem('username');
    //When the user is not auth, the token is not in db, there is no token to send
    if (typeof token !== 'undefined'){
        xhr.setRequestHeader('token', token);
        xhr.setRequestHeader('username', username);
    }
    xhr.onload = function() {
        if (xhr.status === 200) {
            success_function(this);
        } else if (xhr.status === 401){
          alert("Not authorized, you need to autenticate : Error " + xhr.status);
          window.location = '/auth.html';
        }
         else {
          error_function();
          console.log("Request failed.  Returned status of " + xhr.status);
        }
      };
    xhr.send(params_url);
};