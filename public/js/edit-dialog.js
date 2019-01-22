function refresh() {
  var url = new URL(window.location.href);
  var id = url.searchParams.get("id");
  var xhr = new XMLHttpRequest();
  xhr.open("GET", `/api/dialogs/${id}`);
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
  var dialog = doc_getDialog();
  var xhr = new XMLHttpRequest();
  var textButton = document.getElementById("save");
  xhr.open("PUT", `/api/dialogs/${dialog._id}`, true);
  xhr.setRequestHeader("Content-type", "application/json; charset=utf-8");
  xhr.onload = function() {
    if (xhr.status === 200) {
      textButton.style["backgroundColor"] = "greenyellow";
    } else {
      textButton.style["backgroundColor"] = "red";
      alert("Request failed.  Returned status of " + xhr.status);
    }
  };
  xhr.send(JSON.stringify(dialog));
}

var addMessage = function addMessage() {
  doc_addMessage();
};

var deleteMessage = function deleteMessage() {
  var row = this.firstChild.parentElement.parentElement.parentElement
    .parentElement;
  var table = row.parentElement;
  table.removeChild(row);
};

// One type of attachment for now : surveys
var addAttachment = function addAttachment() {
  var button = this.firstChild.parentElement;
  var cell = button.parentElement;
  doc_appendAttachmentSurvey(cell);
};

// One type of attachment for now : surveys
var addAttachmentSurveyAnswer = function addAttachmentSurveyAnswer() {
  var button = this.firstChild.parentElement;
  var tbody = button.parentElement.parentElement.parentElement.parentElement.getElementsByTagName("tbody")[0];
  doc_appendAttachmentSurveyAnswer(tbody);
};

function doc_appendAttachmentSurveyAnswer(tbody, attachment) {

  for(var numAction in attachment.actions) {

    var action = attachment.actions[numAction];

    // Create new row
    var rowAnswer = document.createElement("tr");

    // Answer Text
    var cellAnswer = document.createElement("td");
    var textAnswer = document.createElement("input");
    textAnswer.className = "survey-answer-text";
    textAnswer.placeholder = "Answer";
    textAnswer.value = action.text;
    cellAnswer.appendChild(textAnswer);
    rowAnswer.appendChild(cellAnswer);

    // Append new row
    tbody.appendChild(rowAnswer);
  }
}

// Prepend each element to preserve add button
function doc_appendAttachmentSurvey(cell, attachment) {

  // Hide cell when updating it (Green IT Best Practice)
  cell.style.display = "none";

  // Add hr and restore button add
  cell.insertBefore(document.createElement("hr"), cell.firstChild);

  // Add table for answers
  var tableAnswer = document.createElement("table");
  tableAnswer.className = "survey-answer";

  // -- Body with answer
  var bodyAnswer = document.createElement("tbody");
  doc_appendAttachmentSurveyAnswer(bodyAnswer, attachment);
  tableAnswer.appendChild(bodyAnswer);

  // -- Foot with add button
  var footAnswer = document.createElement("tfoot");
  var rowFoot = document.createElement("tr");
  var cellFoot = document.createElement("td");
  cellFoot.colSpan = 2;
  var buttonFoot = document.createElement("button");
  buttonFoot.appendChild(document.createTextNode("+"));
  buttonFoot.onclick = addAttachmentSurveyAnswer;
  cellFoot.appendChild(buttonFoot);
  rowFoot.appendChild(cellFoot);
  footAnswer.appendChild(rowFoot);
  tableAnswer.appendChild(footAnswer);
  cell.insertBefore(tableAnswer, cell.firstChild);

  // Add form for survey attachment
  var inputName = document.createElement("input");
  inputName.value = attachment.callback_id.replace("survey_","");
  inputName.className = "survey-name";
  inputName.placeholder = "Name (unique)";
  cell.insertBefore(inputName, cell.firstChild);

  // Add select to adapt cell according to attachment type
  var select = document.createElement("select");
  var option = document.createElement("option");
  option.value = "nothing";
  option.appendChild(document.createTextNode("Survey"))
  select.appendChild(option);
  cell.insertBefore(select, cell.firstChild);

  // Show cell when update is finished
  cell.style.display = "table-cell";
}

function doc_appendAttachmentContent(cell, attachments) {
  if(attachments === undefined) {
    var cellContent = document.createElement("button");
    cellContent.appendChild(document.createTextNode("+"));
    cellContent.onclick = addAttachment;
    cell.appendChild(cellContent);
  } else {
    for (numAttachment in attachments) {
      var attachment = attachments[numAttachment];
      if (attachment.callback_id != undefined && attachment.callback_id.startsWith("survey_")) {
        doc_appendAttachmentSurvey(cell, attachment);
      }
    }
  }
}

function doc_addRow(table, message) {
  var row = document.createElement("tr");

  // Channel
  var cell = document.createElement("td");
  var cellContent = document.createElement("input");
  cellContent.value = message.channel;
  cellContent.className = "channel";
  cell.appendChild(cellContent);
  row.appendChild(cell);

  // Wait
  cell = document.createElement("td");
  cellContent = document.createElement("input");
  cellContent.value = message.wait;
  cellContent.type = "number";
  cellContent.className = "wait";
  cell.appendChild(cellContent);
  row.appendChild(cell);

  // Message
  cell = document.createElement("td");
  cellContent = document.createElement("textarea");
  cellContent.value = message.text;
  cellContent.className = "text";
  cellContent.cols = "120";
  cell.appendChild(cellContent);
  row.appendChild(cell);

  // Attachments
  var cell = document.createElement("td");
  doc_appendAttachmentContent(cell, message.attachments);
  row.appendChild(cell);

  // Actions
  cell = document.createElement("td");
  cellContent = document.createElement("span");
  var button = document.createElement("button");
  button.appendChild(document.createTextNode("Delete"));
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
  document.getElementById("id").value = dialog._id;
  document.getElementById("scheduling").value = dialog.scheduling;
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
  doc_refreshDialogRecurse(dialogsTable, dialog, "0");

  // Show table when update is finished
  dialogsTable.style.display = "table-row-group";
}

function doc_getDialog() {
  var dialog = {};

  // Get global data
  dialog.scheduling = document.getElementById("scheduling").value;
  dialog.name = document.getElementById("new-name").value;
  dialog.category = document.getElementById("category").value;
  dialog._id = document.getElementById("id").value;

  var dialogsTable = document
    .getElementById("edit-dialog")
    .getElementsByTagName("tbody")[0];

  // Get each entries
  var rowCount = dialogsTable.childNodes.length;
  var row;
  for (var x = 0; x < rowCount; x++) {
    row = dialogsTable.childNodes[x];
    dialog[x] = {
      channel: row.getElementsByClassName("channel")[0].value,
      wait: parseInt(row.getElementsByClassName("wait")[0].value),
      text: row.getElementsByClassName("text")[0].value,
      next: `${x + 1}`
    };
  }
  delete dialog[x - 1].next;

  return dialog;
}
