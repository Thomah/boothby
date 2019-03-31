function refresh() {
  var url = new URL(window.location.href);
  var id = url.searchParams.get("id");
  overload_xhr(
    "GET", 
    `/api/dialogs/${id}`,
    function(xhr){
      var json = JSON.parse(xhr.responseText);
      doc_refreshDialog(json);
    },
    function(){},
    function(){}
  );
}

function save() {
  var dialog = doc_getDialog();
  var textButton = document.getElementById("save");

  overload_xhr(
    "PUT", 
    `/api/dialogs/${dialog._id}`,    
    function(){
      textButton.style["backgroundColor"] = "greenyellow";
    },
    function(xhr){
      xhr.setRequestHeader("Content-type", "application/json; charset=utf-8");
    },
    function(){
      textButton.style["backgroundColor"] = "red";
    },
    JSON.stringify(dialog)
  );
}

function addMessage() {
  doc_addMessage();
}

var deleteMessage = function deleteMessage() {
  var row = this.firstChild.parentElement.parentElement.parentElement
    .parentElement;
  var table = row.parentElement;
  table.removeChild(row);
};

var onChangeMessage = function onChangeMessage() {
  var wordsCount = (this.value.match(/\s/g) || []).length + 1;
  var wait = wordsCount * 1000 * 60 / 150;
  var row = this.parentElement.parentElement;
  var nextRow = row.nextElementSibling;
  if(nextRow != null) {
    nextRow.childNodes[0].childNodes[0].value = wait;
  }
};

// Called when a attachment selection changes
var onChangeAttachment = function onChangeAttachment() {
  var button = this.firstChild.parentElement;
  var div = button.parentElement;
  var attachment = {
    callback_id: ''
  };
  if (button.value == "survey") {
    attachment.callback_id = 'survey_';
  } else if(button.value == "file") {
    attachment.callback_id = 'file_';
  }
  doc_updateAttachment(div, attachment);
};

// One type of attachment for now : surveys
var addAttachment = function addAttachment() {
  var button = this.firstChild.parentElement;
  var cell = button.parentElement;
  var attachment = {
    callback_id: ''
  };
  var div = document.createElement("div");
  div.className = "attachment"
  doc_createAttachment(div, attachment);
  cell.insertBefore(document.createElement("hr"), cell.firstChild);    
  cell.insertBefore(div, cell.firstChild);
};

// One type of attachment for now : surveys
var deleteAttachment = function deleteAttachment() {
  var button = this.firstChild.parentElement;
  var div = button.parentElement;
  div.remove();
};

// One type of attachment for now : surveys
var addAttachmentSurveyAnswer = function addAttachmentSurveyAnswer() {
  var button = this.firstChild.parentElement;
  var tbody = button.parentElement.parentElement.parentElement.parentElement.getElementsByTagName("tbody")[0];
  var attachment = {
    actions: [
      {
        text: ''
      }
    ]
  };
  doc_appendAttachmentSurveyAnswer(tbody, attachment);
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
function doc_appendAttachmentSurvey(div, attachment) {

  // Add form for survey attachment
  var inputName = document.createElement("input");
  inputName.value = attachment.callback_id.replace("survey_","");
  inputName.className = "survey-name";
  inputName.placeholder = "Name (unique)";
  div.appendChild(inputName);
  
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
  div.appendChild(tableAnswer);

  // Add button to delete attachment
  var buttonDelete = document.createElement("button");
  buttonDelete.appendChild(document.createTextNode("-"));
  buttonDelete.onclick = deleteAttachment;
  div.appendChild(buttonDelete);
}

// Prepend each element to preserve add button
function doc_appendAttachmentFile(div, attachment) {

  // Add form for survey attachment
  var inputName = document.createElement("input");
  inputName.value = attachment.callback_id.replace("file_","");
  inputName.className = "file-name";
  inputName.placeholder = "Name (unique)";
  div.appendChild(inputName);

  var inputFile = document.createElement("input");
  inputFile.type = "file";
  inputFile.className = "file-file";
  div.appendChild(inputFile);
  
  // Add button to delete attachment
  var buttonDelete = document.createElement("button");
  buttonDelete.appendChild(document.createTextNode("-"));
  buttonDelete.onclick = deleteAttachment;
  div.appendChild(buttonDelete);
}

function doc_updateAttachment(div, attachment) {
  div.style.display = "none";
  while (div.firstChild) {
    div.removeChild(div.firstChild);
  }
  doc_createAttachment(div, attachment);
  div.style.display = "block";
}

function doc_createAttachment(div, attachment) {

  // Add select to adapt div according to attachment type
  var select = document.createElement("select");

  // -- Option 0 : Nothing
  var option = document.createElement("option");
  option.value = "nothing";
  option.appendChild(document.createTextNode("--"));
  select.appendChild(option);

  option = document.createElement("option");
  option.value = "survey";
  option.appendChild(document.createTextNode("Survey"));
  select.appendChild(option);

  // -- Option 2 : Find errors
  option = document.createElement("option");
  option.value = "file";
  option.appendChild(document.createTextNode("File"));
  select.appendChild(option);
  select.onchange = onChangeAttachment;
  div.appendChild(select);

  if (attachment.callback_id != undefined && attachment.callback_id.startsWith("survey_")) {
    select.selectedIndex = 1;
    doc_appendAttachmentSurvey(div, attachment);
  } else if(attachment.callback_id != undefined && attachment.callback_id.startsWith("file_")) {
    select.selectedIndex = 2;
    doc_appendAttachmentFile(div, attachment);
  }
}

function doc_appendAttachments(cell, attachments) {
  if(attachments !== undefined) {
    for (var numAttachment in attachments) {
      var div = document.createElement("div");
      div.className = "attachment"
      doc_createAttachment(div, attachments[numAttachment]);
      cell.insertBefore(document.createElement("hr"), cell.firstChild);    
      cell.insertBefore(div, cell.firstChild);
    }
  }
  var cellContent = document.createElement("button");
  cellContent.appendChild(document.createTextNode("+"));
  cellContent.onclick = addAttachment;
  cell.appendChild(cellContent);
}

function doc_addRow(table, message) {
  var row = document.createElement("tr");

  // Wait
  var cell = document.createElement("td");
  var cellContent = document.createElement("input");
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
  cellContent.onchange = onChangeMessage;
  cell.appendChild(cellContent);
  row.appendChild(cell);

  // Attachments
  cell = document.createElement("td");
  doc_appendAttachments(cell, message.attachments);
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
  document.getElementById("channel").value = dialog.channel;
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
  var attachments = [];
  var actions = [];

  // Get global data
  dialog.scheduling = parseInt(document.getElementById("scheduling").value);
  dialog.name = document.getElementById("new-name").value;
  dialog.channel = document.getElementById("channel").value;
  dialog.category = document.getElementById("category").value;
  dialog._id = document.getElementById("id").value;

  var dialogsTable = document
    .getElementById("edit-dialog")
    .getElementsByTagName("tbody")[0];

  // Get each entries
  var rowCount = dialogsTable.childNodes.length;
  var row, divAttachment, divsAttachment, divsAttachmentCount, selectTypeAttachment, inputsAnswer, inputsAnswerCount, inputAnswer;
  var inputFile;
  var callback_id;
  for (var x = 0; x < rowCount; x++) {
    attachments = [];
    row = dialogsTable.childNodes[x];
    divsAttachment = row.getElementsByClassName("attachment");
    divsAttachmentCount = divsAttachment.length;
    for(var y = 0 ; y < divsAttachmentCount ; y++) {
      actions = [];
      divAttachment = divsAttachment[y];
      selectTypeAttachment = divAttachment.getElementsByTagName("select")[0];
      if(selectTypeAttachment.value === "survey") {
        inputsAnswer = divAttachment.getElementsByClassName("survey-answer-text");
        inputsAnswerCount = inputsAnswer.length;
        callback_id = "survey_" + divAttachment.getElementsByClassName("survey-name")[0].value;
        for(var z = 0 ; z < inputsAnswerCount ; z++) {
          inputAnswer = inputsAnswer[z];
          actions[z] = {
            name: callback_id,
            text: inputAnswer.value,
            type: "button",
            value: dialog._id + "-" + x + "-" + convertToHex(inputAnswer.value)
          }
        }
        attachments[y] = {
          text: "Choisissez une valeur",
          fallback: "Vous ne pouvez pas choisir d'action",
          attachment_type: "default",
          callback_id: callback_id,
          actions: actions
        };
      } else if(selectTypeAttachment.value === "file") {
        inputFile = divAttachment.querySelector(".file-file");
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/files/upload');
        xhr.addEventListener('load', function() {
            alert('Upload terminé !');
        });
        var form = new FormData();
        form.append('file', inputFile.files[0]);
        xhr.send(form);
      }
    }

    dialog[x] = {
      channel: dialog.channel,
      wait: parseInt(row.getElementsByClassName("wait")[0].value),
      text: row.getElementsByClassName("text")[0].value,
      attachments: attachments,
      next: `${x + 1}`
    };
  }
  delete dialog[x - 1].next;

  return dialog;
}

function convertToHex(str) {
  var hex = '';
  for(var i=0;i<str.length;i++) {
      hex += ''+str.charCodeAt(i).toString(16);
  }
  return hex;
}