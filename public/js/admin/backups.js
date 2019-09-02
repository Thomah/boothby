// eslint-disable-next-line no-unused-vars
function create() {
  overload_xhr(
    "POST", 
    "/api/backups",
    function(){
      refresh();
    }
  );
}

function refresh(){
  var textButton = document.getElementById("refresh");
  overload_xhr(
    "GET", 
    "/api/backups",
    function(xhr){
      textButton.style["backgroundColor"] = "greenyellow";
      var json = JSON.parse(xhr.responseText);
      doc_refreshBackups(json);
    },
    function(){},
    function(){
      textButton.style["backgroundColor"] = "red";
    }
  );
}

function doc_refreshBackups(backups) {
  var backupsTable = document
    .getElementById("backups")
    .getElementsByTagName("tbody")[0];

  // Hide table when updating it (Green IT Best Practice)
  backupsTable.style.display = "none";

  // Delete previous entries
  var rowCount = backupsTable.childNodes.length;
  for (var x = rowCount - 1; x >= 0; x--) {
    backupsTable.removeChild(backupsTable.childNodes[x]);
  }

  // Append new entries
  var backupNum, backup, newEntry, cell, button, cellSpan;
  for (backupNum in backups) {
    backup = backups[backupNum];
    newEntry = document.createElement("tr");
    newEntry.id = backup._id;

    // Date
    cell = document.createElement("td");
    cell.textContent = backup;
    newEntry.appendChild(cell);

    // Actions
    cell = document.createElement("td");
    cellSpan = document.createElement("span");

    // -- Download Button
    button = document.createElement("button");
    button.appendChild(document.createTextNode("Download"));
    //button.onclick = download;
    cellSpan.appendChild(button);

    // -- Delete Button
    button = document.createElement("button");
    button.appendChild(document.createTextNode("Delete"));
    //button.onclick = remove;
    cellSpan.appendChild(button);

    cell.appendChild(cellSpan);
    newEntry.appendChild(cell);

    backupsTable.appendChild(newEntry);
  }

  // Show table when update is finished
  backupsTable.style.display = "table-row-group";
}