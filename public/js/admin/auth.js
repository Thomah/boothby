function login() {
  var user = document.getElementById("username").value;
  var pwd = document.getElementById("password").value;

  overload_xhr(
    "POST",
    "/api/users/login",
    function (xhr) {
      var token = xhr.response;
      setCookie('token', token, 10);
      window.location = 'index.html';
    },
    function (xhr) {
      xhr.setRequestHeader("user", user);
      xhr.setRequestHeader("pwd", pwd);
    },
    function () {
      var par = document.getElementById("alert-login");
      par.style.display = "block";
    },
  );
}

// eslint-disable-next-line no-unused-vars
function logout() {
  overload_xhr(
    "POST",
    "/api/users/logout",
    function () {
      setCookie('token', '', 0);//Delete the cookie
      window.location = 'admin/auth.html';
    }
  );
}

// eslint-disable-next-line no-unused-vars
function add_user() {
  var user = document.getElementById("username").value;
  var pwd = document.getElementById("password").value;

  var par_success = document.getElementById("user-created");
  var par_not_success = document.getElementById("user-not-created");

  var par_error = document.getElementById("cant-remove-user");

  overload_xhr(
    "POST",
    "/api/users",
    function () {
      par_success.style.display = "block";
      par_not_success.style.display = "none";
      par_error.style.display = "none";
      refresh();
    },
    function (xhr) {
      xhr.setRequestHeader("user", user);
      xhr.setRequestHeader("pwd", pwd);
    },
    function () {
      par_success.style.display = "none";
      par_not_success.style.display = "block";
      par_error.style.display = "none";
    },
  );
}

//When we press the enter button on the auth page, we trigger the login button
if (document.getElementById("password")) {
  document.getElementById("password")
    .addEventListener("keyup", function (event) {
      event.preventDefault();
      if (event.keyCode === 13) {
        login(); // or just login()
      }
    });
}

function refresh() {
  overload_xhr(
    "GET",
    "/api/users",
    function (xhr) {
      var json = JSON.parse(xhr.responseText);
      fill_users_table(json);
    }
  );
}

function fill_users_table(users) {
  var usersTable = document
    .getElementById("users")
    .getElementsByTagName("tbody")[0];

  usersTable.style.display = "none";

  // Delete previous entries
  var rowCount = usersTable.childNodes.length;
  for (var x = rowCount - 1; x >= 0; x--) {
    usersTable.removeChild(usersTable.childNodes[x]);
  }

  var userId, user, newEntry, button, cell, cellSpan;

  for (userId in users) {
    user = users[userId];
    newEntry = document.createElement("tr");
    newEntry.id = user.id;

    //Username
    cell = document.createElement("td");
    cell.textContent = user.username;
    newEntry.appendChild(cell);

    cell = document.createElement("td");
    cellSpan = document.createElement("span");

    //Remove button
    button = document.createElement("button");
    button.appendChild(document.createTextNode("Remove user"));
    button.onclick = remove_user;
    cellSpan.appendChild(button);

    cell.appendChild(cellSpan);
    newEntry.appendChild(cell);
    usersTable.appendChild(newEntry)
  }

  usersTable.style.display = "table-row-group";
}

var remove_user = function remove_user() {
  var textButton = this.firstChild.parentElement;
  var row = textButton.parentElement.parentElement.parentElement;
  var table = row.parentElement;

  var par_error = document.getElementById("cant-remove-user");

  overload_xhr(
    "DELETE",
    `/api/users/${row.id}`,
    function () {
      table.removeChild(row);
      par_error.style.display = "none";
    },
    function () { },
    function () {
      par_error.style.display = "block";
    }
  );
};
