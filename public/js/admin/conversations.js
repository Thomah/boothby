// eslint-disable-next-line no-unused-vars
function add() {
  overload_xhr(
    "POST", 
    "/api/conversations",
    function(){
      refresh();
    }
  );
}

function refresh(){
  overload_xhr(
    "GET", 
    "/api/conversations",
    function(xhr){
      var json = JSON.parse(xhr.responseText);
      doc_refresh(json);
    }
  );
}

var play = function play() {
  var textButton = this.firstChild.parentElement;
  var row = textButton.parentElement.parentElement.parentElement;
  overload_xhr(
    "GET", 
    `/api/conversations/${row.id}/play`,
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
  window.location.href = `/admin/edit-conversations.html?id=${row.id}`;
};

var remove = function remove() {
  var textButton = this.firstChild.parentElement;
  var row = textButton.parentElement.parentElement.parentElement;
  var table = row.parentElement;

  overload_xhr(
    "DELETE",
    `/api/conversations/${row.id}`,
    function(){
      table.removeChild(row);
    },
    function(){},
    function(){
      textButton.style["backgroundColor"] = "red";
    }
  );
};

function doc_refresh(resources) {
  var table = document
    .getElementById("conversations")
    .getElementsByTagName("tbody")[0];

  // Hide table when updating it (Green IT Best Practice)
  table.style.display = "none";

  // Delete previous entries
  var rowCount = table.childNodes.length;
  for (var x = rowCount - 1; x >= 0; x--) {
    table.removeChild(table.childNodes[x]);
  }

  // Append new entries
  var resourceId, resource, newEntry, cell, button, cellSpan;
  for (resourceId in resources) {
    resource = resources[resourceId];
    newEntry = document.createElement("tr");
    newEntry.id = resource._id;

    // Scheduling
    cell = document.createElement("td");
    cell.textContent = resource.scheduling;
    newEntry.appendChild(cell);

    // Category
    cell = document.createElement("td");
    cell.textContent = resource.category;
    newEntry.appendChild(cell);

    // Name
    cell = document.createElement("td");
    cell.textContent = resource.name;
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

    table.appendChild(newEntry);
  }

  // Show table when update is finished
  table.style.display = "table-row-group";
}