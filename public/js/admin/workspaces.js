// eslint-disable-next-line no-unused-vars
function refresh(){
  var textButton = document.getElementById("refresh");
  overload_xhr(
    "GET", 
    "/api/workspaces",
    function(xhr){
      textButton.style["backgroundColor"] = "greenyellow";
      var json = JSON.parse(xhr.responseText);
      doc_refreshWorkspaces(json);
    },
    function(){},
    function(){
      textButton.style["backgroundColor"] = "red";
    }
  );
}

var remove = function remove() {
  var textButton = this.firstChild.parentElement;
  var row = textButton.parentElement.parentElement.parentElement;
  var table = row.parentElement;

  overload_xhr(
    "DELETE",
    `/api/workspaces/${row.id}`,
    function(){    
      table.removeChild(row);    
    },
    function(){},
    function(){
      textButton.style["backgroundColor"] = "red";
    }
  );
};

var users = function() {
  var textButton = this.firstChild.parentElement;
  var row = textButton.parentElement.parentElement.parentElement;
  window.location.href = `/admin/users.html?id=${row.id}`;
};

function doc_refreshWorkspaces(workspaces) {
  var table = document
    .getElementById("workspaces")
    .getElementsByTagName("tbody")[0];

  // Hide table when updating it (Green IT Best Practice)
  table.style.display = "none";

  // Delete previous entries
  var rowCount = table.childNodes.length;
  for (var x = rowCount - 1; x >= 0; x--) {
    table.removeChild(table.childNodes[x]);
  }

  // Append new entries
  var workspaceId, workspace, newEntry, cell, button, cellSpan;
  for (workspaceId in workspaces) {
    workspace = workspaces[workspaceId];
    newEntry = document.createElement("tr");
    newEntry.id = workspace.id;

    // Provider ID
    cell = document.createElement("td");
    cell.textContent = workspace.team_id;
    newEntry.appendChild(cell);

    // Name
    cell = document.createElement("td");
    cell.textContent = workspace.team_name;
    newEntry.appendChild(cell);

    // Channel
    cell = document.createElement("td");
    cell.textContent = workspace.incoming_webhook_channel;
    newEntry.appendChild(cell);

    // Progression
    cell = document.createElement("td");
    cell.textContent = workspace.progression;
    newEntry.appendChild(cell);

    // Actions
    cell = document.createElement("td");
    cellSpan = document.createElement("span");

    // -- Users Button
    button = document.createElement("button");
    button.appendChild(document.createTextNode("Users"));
    button.onclick = users;
    cellSpan.appendChild(button);

    // -- Delete Button
    button = document.createElement("button");
    button.appendChild(document.createTextNode("Delete"));
    button.onclick = remove;
    cellSpan.appendChild(button);

    cell.appendChild(cellSpan);
    newEntry.appendChild(cell);

    table.appendChild(newEntry);
  }

  // Show table when update is finished
  table.style.display = "table-row-group";
}