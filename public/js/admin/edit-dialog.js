// eslint-disable-next-line no-unused-vars
function refresh() {
  var url = new URL(window.location.href);
  var id = url.searchParams.get("id");
  overload_xhr(
    "GET",
    `/api/dialogs/${id}`,
    function (xhr) {
      var json = JSON.parse(xhr.responseText);
      doc_refreshDialog(json);
    },
    function () { },
    function () { }
  );
}

function create_survey(callback) {
  overload_xhr(
    "POST",
    "/api/surveys",
    function (xhr) {
      var json = JSON.parse(xhr.responseText);
      callback(json);
    }
  );
}

function create_survey_answer(id, callback) {
  overload_xhr(
    "POST",
    "/api/surveys/" + id + "/answers",
    function (xhr) {
      var json = JSON.parse(xhr.responseText);
      callback(json);
    }
  );
}

function upload_file(event, callback) {
  var doc_Attachment = event.target.parentElement;
  var inputFile = doc_Attachment.querySelector(".file-file");
  var form = new FormData();
  form.append('file', inputFile.files[0]);
  overload_xhr(
    'POST',
    '/api/files',
    function (xhr) {
      callback(JSON.parse(xhr.responseText));
    },
    function (xhr) {
      xhr.setRequestHeader("Filename", inputFile.files[0].name);
    },
    function (xhr) {
      alert("Unable to send file. Returned status of " + xhr.status);
    },
    form
  );
}

// eslint-disable-next-line no-unused-vars
function save() {
  var dialog = doc_getDialog();

  var textButton = document.getElementById("save");
  overload_xhr(
    "PUT",
    `/api/dialogs/${dialog.id}`,
    function () {
      textButton.style["backgroundColor"] = "greenyellow";
    },
    function (xhr) {
      xhr.setRequestHeader("Content-type", "application/json; charset=utf-8");
    },
    function () {
      textButton.style["backgroundColor"] = "red";
    },
    JSON.stringify(dialog)
  );
}

// eslint-disable-next-line no-unused-vars
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
  if (nextRow != null) {
    nextRow.childNodes[1].childNodes[0].value = wait;
  }
};

var deleteAttachment = function deleteAttachment() {
  var button = this.firstChild.parentElement;
  var div = button.parentElement;
  div.remove();
};

var addOutput = function () {
  var button = this.firstChild.parentElement;
  var cell = button.parentElement;
  var output = {
    id: parseInt(cell.parentElement.getElementsByClassName("id")[0].value) + 1,
    text: "Default"
  }
  var div = document.createElement("div");
  div.className = "output"
  doc_appendOutput(div, output);
  cell.insertBefore(div, cell.firstChild);
}

var deleteOutput = deleteAttachment;

/* BUTTON EVENTS */

var onCreateSurveyBtnClick = function () {
  create_survey(data => {
    var row = this.firstChild.parentElement.parentElement.parentElement;
    var cell = row.getElementsByClassName("attachments")[0];
    doc_appendAttachmentSurvey(cell, [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: ""
        },
        accessory: {
          type: "button",
          text: {
            type: "plain_text",
            emoji: true,
            text: "Vote"
          },
          action_id: "survey_" + data.id + "_" + data.answers[0].id
        }
      }
    ]);
  });
  var buttonAddAttachments = event.target.parentElement.getElementsByClassName('btn-add-attachment');
  for (var btnIndex = 0; btnIndex < buttonAddAttachments.length; btnIndex++) {
    buttonAddAttachments[btnIndex].remove();
  }
};

var onCreateSurveyAnswerBtnClick = function () {
  var divAttachment = this.firstChild.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement;
  var surveyId = divAttachment.id.replace("attachment_", "");
  create_survey_answer(surveyId, data => {
    var tableAnswers = this.firstChild.parentElement.parentElement.parentElement.parentElement.parentElement;
    doc_appendAttachmentSurveyAnswer(tableAnswers.getElementsByTagName("tbody")[0], [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: ""
        },
        accessory: {
          type: "button",
          text: {
            type: "plain_text",
            emoji: true,
            text: "Vote"
          },
          action_id: "survey_" + data.survey_id + "_" + data.id
        }
      }
    ]);
  });
}

var onSelectFileBtnClick = function (event) {
  upload_file(event, data => {
    var row = event.target.parentElement.parentElement.parentElement;
    var cell = row.getElementsByClassName("attachments")[0];
    doc_appendAttachmentFile(cell, {
      file_id: data.id,
      filename: data.name
    });
    var buttonAddAttachments = event.target.parentElement.parentElement.getElementsByClassName('btn-add-attachment');
    for (var btnIndex = 0; btnIndex < buttonAddAttachments.length; btnIndex++) {
      buttonAddAttachments[btnIndex].remove();
    }
  });
};

/* ATTACHMENTS DOM UPDATES */

function doc_appendAttachmentSurveyAnswer(tbody, answers) {

  for (var answerIndex = 0; answerIndex < answers.length; answerIndex++) {

    // Answer ID
    var splitActionId = answers[answerIndex].accessory.action_id.split("_");
    var answerId = splitActionId[2];

    var action = answers[answerIndex];

    // Create new row and cell
    var rowAnswer = document.createElement("tr");
    var cellAnswer = document.createElement("td");

    // Technical ID
    var label = document.createElement("label");
    label.setAttribute("for", "answer_id_" + answerId);
    label.appendChild(document.createTextNode("Answer n°" + answerId));
    cellAnswer.appendChild(label);

    var textAnswer = document.createElement("input");
    textAnswer.id = "answer_id_" + answerId;
    textAnswer.className = "attachment-survey-answer";
    textAnswer.placeholder = "Answer";
    textAnswer.value = action.text.text;
    cellAnswer.appendChild(textAnswer);
    rowAnswer.appendChild(cellAnswer);

    // Append new row
    tbody.appendChild(rowAnswer);
  }
}

function doc_appendAttachmentSurvey(div, attachment) {

  var divAttachment = document.createElement("div");
  divAttachment.className = "attachment attachment-survey"

  // Survey ID
  var splitActionId = attachment[0].accessory.action_id.split("_");
  var surveyId = splitActionId[1];
  divAttachment.id = "attachment_" + surveyId;

  // Add technical ID
  var label = document.createElement("label");
  label.setAttribute("for", "survey_id_" + surveyId);
  label.appendChild(document.createTextNode("Survey ID"));
  divAttachment.appendChild(label);

  // Add form for survey attachment
  var inputName = document.createElement("input");
  inputName.id = "survey_id_" + surveyId;
  inputName.className = "survey_id";
  inputName.value = surveyId;
  inputName.disabled = true;
  divAttachment.appendChild(inputName);

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
  buttonFoot.onclick = onCreateSurveyAnswerBtnClick;
  cellFoot.appendChild(buttonFoot);
  rowFoot.appendChild(cellFoot);
  footAnswer.appendChild(rowFoot);
  tableAnswer.appendChild(footAnswer);
  divAttachment.appendChild(tableAnswer);

  // Add button to delete attachment
  var buttonDelete = document.createElement("button");
  buttonDelete.appendChild(document.createTextNode("-"));
  buttonDelete.onclick = deleteAttachment;
  divAttachment.appendChild(buttonDelete);

  div.appendChild(divAttachment);
}

function doc_appendAttachmentFile(div, attachment) {

  var divAttachment = document.createElement("div");
  divAttachment.className = "attachment attachment-file"

  // Technical ID
  var label = document.createElement("label");
  label.setAttribute("for", "file_id_" + attachment.file_id);
  label.appendChild(document.createTextNode("ID"));
  divAttachment.appendChild(label);

  // Add file_id field
  var inputFile = document.createElement("input");
  inputFile.id = "file_id_" + attachment.file_id;
  inputFile.type = "text";
  inputFile.className = "file-id";
  if (attachment.file_id !== undefined) {
    inputFile.value = attachment.file_id;
  }
  inputFile.disabled = true;
  divAttachment.appendChild(inputFile);

  // Technical ID
  label = document.createElement("label");
  label.setAttribute("for", "file_name_" + attachment.file_id);
  label.appendChild(document.createTextNode("Name"));
  divAttachment.appendChild(label);

  // Add file name field
  inputFile = document.createElement("input");
  inputFile.id = "file_name_" + attachment.file_id;
  inputFile.type = "text";
  inputFile.className = "file-name";
  if (attachment.file_id !== undefined) {
    inputFile.value = attachment.filename;
  }
  inputFile.disabled = true;
  divAttachment.appendChild(inputFile);

  // Add preview link
  var divPreview = document.createElement("div");
  var a = document.createElement("a");
  a.setAttribute("href", window.location.origin + "/api/files/" + attachment.file_id);
  a.appendChild(document.createTextNode("Preview"));
  divPreview.appendChild(a);
  divAttachment.appendChild(divPreview);

  // Add button to delete attachment
  var buttonDelete = document.createElement("button");
  buttonDelete.appendChild(document.createTextNode("-"));
  buttonDelete.onclick = deleteAttachment;
  divAttachment.appendChild(buttonDelete);

  div.appendChild(divAttachment);
}

function doc_appendAttachment(div, attachment) {
  if (attachment.type === "survey") {
    doc_appendAttachmentSurvey(div, attachment.content);
  } else if (attachment.type === "file") {
    doc_appendAttachmentFile(div, attachment.content);
  }
}

function doc_appendAttachments(id, cell, attachments) {

  // Add div witch will contains all attachements
  var cellContent = document.createElement("div");
  cellContent.className = "attachments";

  // Add attachments in div
  if (attachments !== undefined) {
    for (var numAttachment in attachments) {
      doc_appendAttachment(cellContent, attachments[numAttachment]);
    }
  } else {

    // Add Attachment button
    cellContent = document.createElement("button");
    cellContent.className = "btn-add-attachment";
    cellContent.appendChild(document.createTextNode("Add Survey"));
    cellContent.onclick = onCreateSurveyBtnClick;
    cell.appendChild(cellContent);

    // Add upload file button
    cellContent = document.createElement("div");
    cellContent.className = "btn-add-attachment";
    var label = document.createElement("label");
    label.setAttribute("for", "upload_" + id);
    label.className = "file-label";
    label.appendChild(document.createTextNode("Add File"));
    cellContent.appendChild(label);
    var input = document.createElement("input");
    input.id = "upload_" + id;
    input.type = "file";
    input.className = "file-file";
    input.appendChild(document.createTextNode("Add File"));
    input.onchange = onSelectFileBtnClick;
    cellContent.appendChild(input);
    cell.appendChild(cellContent);

  }

  cell.appendChild(cellContent);
}

/* OUTPUTS DOM UPDATES */

function doc_appendOutput(div, output) {
  var element = document.createElement("input");
  element.className = "output-id"
  element.placeholder = "Message ID";
  element.value = output.id;
  div.appendChild(element);

  element = document.createElement("input");
  element.className = "output-text"
  element.placeholder = "Button Text";
  element.value = output.text;
  div.appendChild(element);

  element = document.createElement("button");
  element.appendChild(document.createTextNode("-"));
  element.onclick = deleteOutput;
  div.appendChild(element);

  div.appendChild(document.createElement("hr"));
}

function doc_appendOutputs(cell, outputs) {
  if (outputs !== undefined) {
    for (var numOutput in outputs) {
      var div = document.createElement("div");
      div.className = "output"
      doc_appendOutput(div, outputs[numOutput]);
      cell.insertBefore(div, cell.firstChild);
    }
  }
  var cellContent = document.createElement("button");
  cellContent.appendChild(document.createTextNode("+"));
  cellContent.onclick = addOutput;
  cell.appendChild(cellContent);
}

/* GENERAL DOM UPDATES */

function doc_addRow(table, message) {
  var row = document.createElement("tr");

  // ID
  var cell = document.createElement("td");
  var cellContent = document.createElement("input");
  cellContent.value = message.id;
  cellContent.disabled = true;
  cellContent.className = "id";
  cell.appendChild(cellContent);
  row.appendChild(cell);

  // Wait
  cell = document.createElement("td");
  cellContent = document.createElement("input");
  cellContent.value = message.wait;
  cellContent.className = "wait";
  cell.appendChild(cellContent);
  row.appendChild(cell);

  // Message
  cell = document.createElement("td");
  cellContent = document.createElement("textarea");
  cellContent.value = message.text;
  cellContent.className = "text";
  cellContent.cols = "80";
  cellContent.onchange = onChangeMessage;
  cell.appendChild(cellContent);
  row.appendChild(cell);

  // Attachments
  cell = document.createElement("td");
  doc_appendAttachments(message.id, cell, message.attachments);
  row.appendChild(cell);

  // Outputs
  cell = document.createElement("td");
  doc_appendOutputs(cell, message.outputs);
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
  var message = dialog.messages[currentId];
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

  var lastRow = dialogsTable.childNodes[dialogsTable.childNodes.length - 1];
  var textInLastRow = lastRow.getElementsByClassName("text")[0];
  var wordsCountInLastRow = (textInLastRow.value.match(/\s/g) || []).length + 1;

  var message = {
    id: parseInt(lastRow.getElementsByClassName("id")[0].value) + 1,
    wait: wordsCountInLastRow * 1000 * 60 / 150,
    text: ""
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
  document.getElementById("id").value = dialog.id;
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
  var actions = [];
  dialog.messages = {};

  // Get DOM table object
  var dialogsTable = document
    .getElementById("edit-dialog")
    .getElementsByTagName("tbody")[0];

  // Get global data
  dialog.scheduling = parseInt(document.getElementById("scheduling").value);
  dialog.name = document.getElementById("new-name").value;
  dialog.channel = document.getElementById("channel").value;
  dialog.category = document.getElementById("category").value;
  dialog.length = dialogsTable.childNodes.length;
  dialog.id = document.getElementById("id").value;

  // Get each entries
  var row, divAttachment, divsAttachment, divsAttachmentCount, inputsAnswer, inputsAnswerCount, inputAnswer;
  var divOutput, divsOutput, divsOutputCount;
  var inputFilename, inputFileId;
  var action_id;
  for (var x = 0; x < dialog.length; x++) {
    row = dialogsTable.childNodes[x];
    divsAttachment = row.getElementsByClassName("attachment");
    divsAttachmentCount = divsAttachment.length;
    divsOutput = row.getElementsByClassName("output");
    divsOutputCount = divsOutput.length;

    dialog.messages[x] = {
      channel: dialog.channel,
      wait: parseInt(row.getElementsByClassName("wait")[0].value),
      text: row.getElementsByClassName("text")[0].value,
      blocks: [],
      attachments: [],
      outputs: [],
      next: `${x + 1}`
    };

    for (var y = 0; y < divsAttachmentCount; y++) {
      actions = [];
      divAttachment = divsAttachment[y];
      if (divAttachment.classList.contains("attachment-survey")) {
        inputsAnswer = divAttachment.getElementsByClassName("attachment-survey-answer");
        inputsAnswerCount = inputsAnswer.length;
        action_id = "survey_" + divAttachment.getElementsByClassName("survey_id")[0].value + "_";
        for (var z = 0; z < inputsAnswerCount; z++) {
          inputAnswer = inputsAnswer[z];
          actions[z] = {
            type: "section",
            text: {
              type: "mrkdwn",
              text: inputAnswer.value
            },
            accessory: {
              type: "button",
              text: {
                type: "plain_text",
                emoji: true,
                text: "Vote"
              },
              value: dialog.id + "-" + x + "-" + convertToHex(inputAnswer.value),
              action_id: action_id + inputAnswer.id.replace("answer_id_", "")
            }
          }
        }
        dialog.messages[x].attachments[y] = {
          type: "survey",
          content: []
        };
        actions.forEach(action => dialog.messages[x].attachments[y].content.push(action));
      } else if (divAttachment.classList.contains("attachment-file")) {
        inputFilename = divAttachment.getElementsByClassName("file-name")[0].value;
        inputFileId = divAttachment.getElementsByClassName("file-id")[0].value;
        dialog.messages[x].attachments[y] = {
          type: "file",
          content: {
            channels: dialog.channel,
            filename: inputFilename,
            filetype: "auto",
            initial_comment: "",
            title: inputFilename,
            file_id: inputFileId
          }
        };
      }
    }

    for (y = 0; y < divsOutputCount; y++) {
      divOutput = divsOutput[y];
      dialog.messages[x].outputs[y] = {
        id: divOutput.getElementsByClassName("output-id")[0].value,
        text: divOutput.getElementsByClassName("output-text")[0].value
      };
    }
  }
  delete dialog.messages[x - 1].next;
  return dialog;
}

function convertToHex(str) {
  var hex = '';
  for (var i = 0; i < str.length; i++) {
    hex += '' + str.charCodeAt(i).toString(16);
  }
  return hex;
}