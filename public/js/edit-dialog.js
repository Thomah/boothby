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

var deleteMessage = function deleteMessage() {
  var xhr = new XMLHttpRequest();
  var textButton = this.firstChild.parentElement;
  alert("todo");
};

function doc_refreshDialogRecurse(table, dialog, currentId) {
  var message = dialog[currentId];
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
  button.id = currentId;
  button.onclick = deleteMessage;
  cellContent.appendChild(button);
  cell.appendChild(cellContent);
  row.appendChild(cell);

  table.appendChild(row);

  if (dialog[currentId].next !== undefined) {
    doc_refreshDialogRecurse(table, dialog, dialog[currentId].next);
  }
}

function doc_refreshDialog(dialog) {
  var dialogsTable = document
    .getElementById("edit-dialog")
    .getElementsByTagName("tbody")[0];

  // Add Value to name field
  document.getElementById("name").value = dialog.name;

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
