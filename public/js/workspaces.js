function refresh(){
  overload_xhr(
    "GET", 
    "/api/workspaces",
    function(xhr){
      var json = JSON.parse(xhr.responseText);
      doc_refreshWorkspaces(json);
    }
  );
};

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
    newEntry.id = workspace._id;

    // Provider ID
    cell = document.createElement("td");
    cell.textContent = workspace.team_id;
    newEntry.appendChild(cell);

    // Name
    cell = document.createElement("td");
    cell.textContent = workspace.team_name;
    newEntry.appendChild(cell);

    // User ID
    cell = document.createElement("td");
    cell.textContent = workspace.user_id;
    newEntry.appendChild(cell);

    // Actions
    cell = document.createElement("td");
    cellSpan = document.createElement("span");

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
};