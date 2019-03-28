function refresh() {
  listMessages();
}

var deleteMessage = function deleteMessage() {
  var textButton = this.firstChild.parentElement;
  overload_xhr(
    "DELETE", 
    `/api/messages/${textButton.id}`,
    function(){
      var row = textButton.parentElement.parentElement.parentElement;
      var table = row.parentElement;
      table.removeChild(row);
    },
    function(){},
    function(){
      textButton.style["backgroundColor"] = "red";
    }
  );
};

function listMessages() {
  overload_xhr(
    "GET",
    "/api/messages",
    function(xhr){
      var json = JSON.parse(xhr.responseText);
      doc_refreshMessages(json);
    }
  );
}

function sendMessage() {
  var workspace = document.getElementById("message-workspace").value;
  var channel = document.getElementById("message-channel").value;
  var content = document.getElementById("message-text").value;

  overload_xhr(
    "POST", 
    "/api/messages/send",
    function(xhr){
      var json = JSON.parse(xhr.responseText);
      doc_refreshMessages(json);
    },
    function(xhr){
      xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    },
    function(){},
    `workspace=${workspace}&channel=${channel}&message=${content}`
  );
}

function doc_refreshMessages(messages) {
  var table = document
    .getElementById("incomming-messages")
    .getElementsByTagName("tbody")[0];

  // Hide table when updating it (Green IT Best Practice)
  table.style.display = "none";

  // Delete previous entries
  util_dropTable(table);

  // Append new entries
  var messageKey, message, row, cell, cellSpan, button;

  for (messageKey = messages.length; messageKey--; ) {
    message = messages[messageKey];
    row = document.createElement("tr");

    // Timestamp
    cell = document.createElement("td");
    cell.textContent = message.ts;
    row.appendChild(cell);

    // Workspace
    cell = document.createElement("td");
    cell.textContent = message.team;
    row.appendChild(cell);

    // Channel
    cell = document.createElement("td");
    cell.textContent = message.channel;
    row.appendChild(cell);

    // User
    cell = document.createElement("td");
    cell.textContent = message.user;
    row.appendChild(cell);

    // Text
    cell = document.createElement("td");
    cell.textContent = message.text;
    row.appendChild(cell);

    // Actions
    cell = document.createElement("td");
    cellSpan = document.createElement("span");
    button = document.createElement("button");
    button.appendChild(document.createTextNode("Delete"));
    button.id = message._id;
    button.onclick = deleteMessage;
    cellSpan.appendChild(button);
    cell.appendChild(cellSpan);
    row.appendChild(cell);

    table.appendChild(row);
  }

  // Show table when update is finished
  table.style.display = "table-row-group";
}

function util_dropTable(table) {
  var rowCount = table.childNodes.length;
  for (var x = rowCount - 1; x >= 0; x--) {
    table.removeChild(table.childNodes[x]);
  }
}

// ADD TRIGGER ON ENTER KEY FOR MESSAGE SENDING
var input = document.getElementById("message-text");
input.addEventListener("keyup", function(event) {
  event.preventDefault();
  if (event.keyCode === 13) {
    document.getElementById("message-send").click();
  }
});
