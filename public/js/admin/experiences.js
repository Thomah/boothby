// eslint-disable-next-line no-unused-vars
function refresh() {
  var url = new URL(window.location.href);
  var id = url.searchParams.get("id");
  var textButton = document.getElementById("refresh");
  overload_xhr(
    "GET", 
    `/api/workspaces/${id}/experiences`,
    function(xhr){
      textButton.style["backgroundColor"] = "greenyellow";
      var json = JSON.parse(xhr.responseText);
      doc_refresh(json);
    },
    function(){},
    function(){
      textButton.style["backgroundColor"] = "red";
    }
  );
}

// eslint-disable-next-line no-unused-vars
function createExperience() {
  var user = document.getElementById("experience-user").value;
  var reason = document.getElementById("experience-reason").value;
  var experience = document.getElementById("experience-experience").value;

  overload_xhr(
    "POST",
    "/api/workspaces/${id}/experiences",
    function (xhr) {
      var json = JSON.parse(xhr.responseText);
      doc_refresh(json);
    },
    function (xhr) {
      xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    },
    function () { },
    `user=${user}&reason=${reason}&experience=${experience}`
  );
}

var deleteExperience = function deleteExperience() {
  var textButton = this.firstChild.parentElement;
  overload_xhr(
    "DELETE",
    `/api/experiences/${textButton.id}`,
    function () {
      var row = textButton.parentElement.parentElement.parentElement;
      var table = row.parentElement;
      table.removeChild(row);
    },
    function () { },
    function () {
      textButton.style["backgroundColor"] = "red";
    }
  );
};

function doc_refresh(experiences) {
  var table = document
    .getElementById("incomming-experiences")
    .getElementsByTagName("tbody")[0];

  // Hide table when updating it (Green IT Best Practice)
  table.style.display = "none";

  // Delete previous entries
  util_dropTable(table);

  // Append new entries
  var experienceKey, experience, row, cell, cellSpan, button;

  for (experienceKey = experiences.length; experienceKey--;) {
    experience = experiences[experienceKey];
    row = document.createElement("tr");

    // Timestamp
    cell = document.createElement("td");
    cell.textContent = experience.obtained_at;
    row.appendChild(cell);

    // Workspace
    cell = document.createElement("td");
    cell.textContent = experience.slack_id;
    row.appendChild(cell);

    // Channel
    cell = document.createElement("td");
    cell.textContent = experience.reason;
    row.appendChild(cell);

    // User
    cell = document.createElement("td");
    cell.textContent = experience.experience;
    row.appendChild(cell);

    // Actions
    cell = document.createElement("td");
    cellSpan = document.createElement("span");
    button = document.createElement("button");
    button.appendChild(document.createTextNode("Delete"));
    button.id = experience.id;
    button.onclick = deleteExperience;
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
var input = document.getElementById("experience-experience");
input.addEventListener("keyup", function (event) {
  event.preventDefault();
  if (event.keyCode === 13) {
    document.getElementById("experience-create").click();
  }
});
