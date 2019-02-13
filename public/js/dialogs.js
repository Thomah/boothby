function add() {
  overload_xhr(
    "POST", 
    "/api/dialogs",
    function(){
      refresh();
    }
  );
}

function refresh(){
  overload_xhr(
    "GET", 
    "/api/dialogs",
    function(xhr){
      var json = JSON.parse(xhr.responseText);
      doc_refreshDialogs(json);
    }
  );
};

var play = function play() {
  var textButton = this.firstChild.parentElement;
  var row = textButton.parentElement.parentElement.parentElement;
  overload_xhr(
    "GET", 
    `/api/dialogs/${row.id}/play`,
    function(){
      textButton.style["backgroundColor"] = "greenyellow";
    },
    function(){},
    function(){
      textButton.style["backgroundColor"] = "red";
    }
  );
};

var edit = function edit() {
  var textButton = this.firstChild.parentElement;
  var row = textButton.parentElement.parentElement.parentElement;
  window.location.href = `/edit-dialog.html?id=${row.id}`;
};

var remove = function remove() {
  var textButton = this.firstChild.parentElement;
  var row = textButton.parentElement.parentElement.parentElement;
  var table = row.parentElement;

  overload_xhr(
    "DELETE",
    `/api/dialogs/${row.id}`,
    function(){    
      table.removeChild(row);    
    },
    function(){},
    function(){
      textButton.style["backgroundColor"] = "red";
    }
  );
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
};