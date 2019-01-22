function add() {
  var xhr = new XMLHttpRequest();
  xhr.open("POST", "/api/dialogs");
  xhr.onload = function() {
    if (xhr.status === 200) {
      refresh();
    } else {
      alert("Request failed.  Returned status of " + xhr.status);
    }
  };
  xhr.send();
}

function refresh() {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "/api/dialogs");
  xhr.onload = function() {
    if (xhr.status === 200) {
      var json = JSON.parse(this.responseText);
      doc_refreshDialogs(json);
    } else {
      alert("Request failed.  Returned status of " + xhr.status);
    }
  };
  xhr.send();
}

var play = function play() {
  var xhr = new XMLHttpRequest();
  var textButton = this.firstChild.parentElement;
  var row = textButton.parentElement.parentElement.parentElement;
  xhr.open("GET", `/api/dialogs/${row.id}/play`);
  xhr.onload = function() {
    if (xhr.status === 200) {
      textButton.style["backgroundColor"] = "greenyellow";
    } else {
      textButton.style["backgroundColor"] = "red";
      alert("Request failed.  Returned status of " + xhr.status);
    }
  };
  xhr.send();
};

var edit = function edit() {
  var textButton = this.firstChild.parentElement;
  var row = textButton.parentElement.parentElement.parentElement;
  window.location.href = `/edit-dialog.html?id=${row.id}`;
};

var remove = function remove() {
  var xhr = new XMLHttpRequest();
  var textButton = this.firstChild.parentElement;
  var row = textButton.parentElement.parentElement.parentElement;
  xhr.open("DELETE", `/api/dialogs/${row.id}`);
  xhr.onload = function() {
    if (xhr.status === 200) {
      var table = row.parentElement;
      table.removeChild(row);
    } else {
      textButton.style["backgroundColor"] = "red";
      alert("Request failed.  Returned status of " + xhr.status);
    }
  };
  xhr.send();
};

function doc_refreshDialogs(dialogs) {
  var dialogsTable = document
    .getElementById("dialogs")
    .getElementsByTagName("tbody")[0];

  // Hide table when updating it (Green IT Best Practice)
  dialogsTable.style.display = "none";

  // Delete previous entries
  var rowCount = dialogsTable.childNodes.length;
  for (var x = rowCount - 1; x >= 0; x--) {
    dialogsTable.removeChild(dialogsTable.childNodes[x]);
  }

  // Append new entries
  var dialogId, dialog, newEntry, cell, button, cellSpan;
  for (dialogId in dialogs) {
    dialog = dialogs[dialogId];
    newEntry = document.createElement("tr");
    newEntry.id = dialog._id;

    // Scheduling
    cell = document.createElement("td");
    cell.textContent = dialog.scheduling;
    newEntry.appendChild(cell);

    // Category
    cell = document.createElement("td");
    cell.textContent = dialog.category;
    newEntry.appendChild(cell);

    // Name
    cell = document.createElement("td");
    cell.textContent = dialog.name;
    newEntry.appendChild(cell);

    // Actions
    cell = document.createElement("td");
    cellSpan = document.createElement("span");

    // -- Play Button
    button = document.createElement("button");
    button.appendChild(document.createTextNode("Play"));
    button.onclick = play;
    cellSpan.appendChild(button);

    // -- Edit Button
    button = document.createElement("button");
    button.appendChild(document.createTextNode("Edit"));
    button.onclick = edit;
    cellSpan.appendChild(button);

    // -- Delete Button
    button = document.createElement("button");
    button.appendChild(document.createTextNode("Delete"));
    button.onclick = remove;
    cellSpan.appendChild(button);

    cell.appendChild(cellSpan);
    newEntry.appendChild(cell);

    dialogsTable.appendChild(newEntry);
  }

  // Show table when update is finished
  dialogsTable.style.display = "table-row-group";
}
