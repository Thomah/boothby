function refresh() {
  var url = new URL(window.location.href);
  var name = url.searchParams.get("name");
  var xhr = new XMLHttpRequest();
  xhr.open("GET", `/api/dialogs/${name}`);
  xhr.onload = function() {
    if (xhr.status === 200) {
      var json = JSON.parse(this.responseText);
      doc_refreshDialog(json);
    } else {
      alert("Request failed.  Returned status of " + xhr.status);
    }
  };
  xhr.send();
}

function save() {
  var newName = document.getElementById("new-name").value;
  var oldName = document.getElementById("old-name").value;
  console.log(`New Name : ${newName}`);
  console.log(`Old Name : ${oldName}`);
  doc_saveDialog();
  var xhr = new XMLHttpRequest();
};

var addMessage = function addMessage() {
  doc_addMessage();
};

var deleteMessage = function deleteMessage() {
  var row = this.firstChild.parentElement.parentElement.parentElement.parentElement;
  var table = row.parentElement;
  table.removeChild(row);
};

function doc_addRow(table, message) {
  var row = document.createElement("tr");

  // Channel
  var cell = document.createElement("td");
  var cellContent = document.createElement("input");
  cellContent.value = message.channel;
  cell.appendChild(cellContent);
  row.appendChild(cell);

  // Wait
  cell = document.createElement("td");
  cellContent = document.createElement("input");
  cellContent.value = message.wait;
  cellContent.type = "number";
  cellContent.setAttribute("max", "5");
  cell.appendChild(cellContent);
  row.appendChild(cell);

  // Message
  cell = document.createElement("td");
  cellContent = document.createElement("textarea");
  cellContent.value = message.text;
  cellContent.cols = "90";
  cell.appendChild(cellContent);
  row.appendChild(cell);

  // Actions
  cell = document.createElement("td");
  cellContent = document.createElement("span");
  var button = document.createElement("button");
  button.appendChild(document.createTextNode("Delete"));
  button.id = message.id;
  button.onclick = deleteMessage;
  cellContent.appendChild(button);
  cell.appendChild(cellContent);
  row.appendChild(cell);

  table.appendChild(row);
}

function doc_refreshDialogRecurse(table, dialog, currentId) {
  var message = dialog[currentId];
  message.id = currentId;
  doc_addRow(table, message);

  if (message.next !== undefined) {
    doc_refreshDialogRecurse(table, dialog, message.next);
  }
}

function doc_addMessage() {
  var dialogsTable = document
    .getElementById("edit-dialog")
    .getElementsByTagName("tbody")[0];

  // Hide table when updating it (Green IT Best Practice)
  dialogsTable.style.display = "none";

  var message = {
    channel: "",
    wait: 0,
    message: ""
  };
  doc_addRow(dialogsTable, message);
  
  // Show table when update is finished
  dialogsTable.style.display = "table-row-group";
}

function doc_refreshDialog(dialog) {
  var dialogsTable = document
    .getElementById("edit-dialog")
    .getElementsByTagName("tbody")[0];

  // Add Value to simple fields
  document.getElementById("old-name").value = dialog.name;
  document.getElementById("new-name").value = dialog.name;
  document.getElementById("category").value = dialog.category;

  // Hide table when updating it (Green IT Best Practice)
  dialogsTable.style.display = "none";

  // Delete previous entries
  var rowCount = dialogsTable.childNodes.length;
  for (var x = rowCount - 1; x >= 0; x--) {
    dialogsTable.removeChild(dialogsTable.childNodes[x]);
  }

  // Append new entries
  doc_refreshDialogRecurse(dialogsTable, dialog, "main");

  // Show table when update is finished
  dialogsTable.style.display = "table-row-group";
}

function doc_saveDialog() {

  var dialog = {};

  var dialogsTable = document
    .getElementById("edit-dialog")
    .getElementsByTagName("tbody")[0];

  // Delete previous entries
  var rowCount = dialogsTable.childNodes.length;
  for (var x = 0 ; x < rowCount ; x++) {
    console.log(dialogsTable.childNodes[x]);
  }

  return dialog;
}
