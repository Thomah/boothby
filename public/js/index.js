function reloadIHM() {
  channelsAndIMs();
  listMessages();
}

function syncDb() {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "/api/channelsAndIMs/refresh");
  xhr.onload = function() {
    if (xhr.status === 200) {
      doc_addIncommingMessage({
        ts: new Date().getTime(),
        text: "SYNC STARTED"
      });
    } else {
      alert(`Request failed.  Returned status of : ${xhr.status}`);
    }
  };
  xhr.send();
}

function channelsAndIMs() {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "/api/channelsAndIMs");
  xhr.onload = function() {
    if (xhr.status === 200) {
      var json = JSON.parse(this.responseText);
      doc_refreshChannelsAndIMs(json);
    } else {
      alert(`Request failed.  Returned status of : ${xhr.status}`);
    }
  };
  xhr.send();
}

var deleteMessage = function deleteMessage() {
  var xhr = new XMLHttpRequest();
  var textButton = this.firstChild.parentElement;
  xhr.open("DELETE", `/api/simple-messages/${textButton.id}`);
  xhr.onload = function() {
    if (xhr.status === 200) {
      var row = textButton.parentElement.parentElement.parentElement;
      var table = row.parentElement;
      table.removeChild(row);
    } else {
      textButton.style["backgroundColor"] = "red";
      alert("Request failed.  Returned status of " + xhr.status);
    }
  };
  xhr.send();
};

function listMessages() {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "/api/simple-messages");
  xhr.onload = function() {
    if (xhr.status === 200) {
      var json = JSON.parse(this.responseText);
      doc_refreshMessages(json);
    } else {
      alert(`Request failed.  Returned status of : ${xhr.status}`);
    }
  };
  xhr.send();
}

function sendSimpleMessage() {
  var xhr = new XMLHttpRequest();
  xhr.open("POST", "/api/simple-messages/send", true);
  xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  var channel = document.getElementById("message-channel").value;
  var content = document.getElementById("message-text").value;
  xhr.send(`channel=${channel}&message=${content}`);
}

function doc_addIncommingMessage(message) {
  var incommingMessages = document
    .getElementById("incomming-messages")
    .getElementsByTagName("tbody")[0];
  var row = document.createElement("tr");

  // Timestamp
  var cell = document.createElement("td");
  cell.textContent = message.ts;
  row.appendChild(cell);

  // Channel
  cell = document.createElement("td");
  cell.textContent = message.channel;
  row.appendChild(cell);

  // User
  cell = document.createElement("td");
  cell.textContent = message.user ? message.user : message.username;
  row.appendChild(cell);

  // Content
  cell = document.createElement("td");
  cell.textContent = message.text;
  row.appendChild(cell);

  // Actions
  cell = document.createElement("td");
  var cellSpan = document.createElement("span");
  var button = document.createElement("button");
  button.appendChild(document.createTextNode("Delete"));
  button.id = message._id;
  button.onclick = deleteMessage;
  cellSpan.appendChild(button);
  cell.appendChild(cellSpan);
  row.appendChild(cell);

  incommingMessages.prepend(row);
}

function doc_refreshChannelsAndIMs(channelsAndIMs) {
  // Hide DOM when updating it (Green IT Best Practice)
  var channelsAndIMsSection = document.getElementById("channels-and-users");
  channelsAndIMsSection.style.display = "none";

  // DOM : Channels List
  var conversationsList = document.getElementById("channels");

  // Delete previous data
  util_dropTable(conversationsList);

  // Append channels
  var conversations = channelsAndIMs.channels;
  var li, conversationId, conversation, a, text;
  for (conversationId in conversations) {
    conversation = conversations[conversationId];
    li = document.createElement("li");

    // Link
    a = document.createElement("a");
    text = `${conversation.id} (#${conversation.name})`;
    a.appendChild(document.createTextNode(text));
    a.href = "";
    a.title = text;

    li.appendChild(a);
    conversationsList.appendChild(li);
  }

  // DOM : IMs List
  conversationsList = document.getElementById("users");

  // Delete previous data
  util_dropTable(conversationsList);

  // Append IMs
  conversations = channelsAndIMs.ims;
  for (conversationId in conversations) {
    conversation = conversations[conversationId];
    if (conversation.id !== undefined) {
      li = document.createElement("li");

      // Link
      a = document.createElement("a");
      text = `${conversation.id} (@${conversation.user.real_name})`;
      a.appendChild(document.createTextNode(text));
      a.href = "";
      a.title = text;

      li.appendChild(a);
      conversationsList.appendChild(li);
    }
  }

  // Show DOM when update is finished
  channelsAndIMsSection.style.display = "block";
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

var socket = io();
socket.on("message", function(message) {
  console.log(message);
  doc_addIncommingMessage(message);
});
