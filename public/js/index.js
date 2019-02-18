function reloadIHM() {
  channelsAndIMs();
  listMessages();
}


function syncDb() {
  overload_xhr(
    "GET", 
    "/api/channelsAndIMs/refresh",
    function(){
      doc_addIncommingMessage({
        ts: new Date().getTime(),
        text: "SYNC STARTED"
      });
    }
  );
};

function channelsAndIMs() {
  overload_xhr(
    "GET",
    "/api/channelsAndIMs",
    success_function = function(xhr){
      var json = JSON.parse(xhr.responseText);
      doc_refreshChannelsAndIMs(json);
    }
  );
};

//The index page is like a playground. Features on this page are not prioritized (maybe in a loooooong time).
var deleteMessage = function deleteMessage() {
  var textButton = this.firstChild.parentElement;
  overload_xhr(
    "DELETE", 
    `/api/simple-messages/${textButton.id}`,
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
    "/api/simple-messages",
    function(xhr){
      var json = JSON.parse(xhr.responseText);
      doc_refreshMessages(json);
    }
  );
}

function sendSimpleMessage() {
  var channel = document.getElementById("message-channel").value;
  var content = document.getElementById("message-text").value;

  overload_xhr(
    "POST", 
    "/api/simple-messages/send",
    function(xhr){
      var json = JSON.parse(xhr.responseText);
      doc_refreshMessages(json);
    },
    function(xhr){
      xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    },
    function(){},
    `channel=${channel}&message=${content}`
  );
};

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
    //button = document.createElement("button");
    //button.appendChild(document.createTextNode("Delete"));
    //button.id = message._id;
    //button.onclick = deleteMessage;
    //cellSpan.appendChild(button);
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
