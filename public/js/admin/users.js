// eslint-disable-next-line no-unused-vars
function refresh() {
  var url = new URL(window.location.href);
  var id = url.searchParams.get("id");
  var textButton = document.getElementById("refresh");
  overload_xhr(
    "GET", 
    `/api/workspaces/${id}`,
    function(){
      textButton.style["backgroundColor"] = "greenyellow";
    },
    function(){},
    function(){
      textButton.style["backgroundColor"] = "red";
    }
  );
}

// eslint-disable-next-line no-unused-vars
function reload() {
  var url = new URL(window.location.href);
  var id = url.searchParams.get("id");
  var textButton = document.getElementById("reload");
  overload_xhr(
    "POST", 
    `/api/workspaces/${id}/reload`,
    function(){
      textButton.style["backgroundColor"] = "greenyellow";
    },
    function(){},
    function(){
      textButton.style["backgroundColor"] = "red";
    }
  );
}

function doc_refresh(elements) {
  var table = document
    .getElementById("users")
    .getElementsByTagName("tbody")[0];

  // Hide table when updating it
  table.style.display = "none";

  // Delete previous entries
  var rowCount = table.childNodes.length;
  for (var x = rowCount - 1; x >= 0; x--) {
    table.removeChild(table.childNodes[x]);
  }

  // Append new entries
  var elementId, element, newEntry, cell;
  for (elementId in elements) {
    element = elements[elementId];
    newEntry = document.createElement("tr");
    newEntry.id = element.id;

    // Provider ID
    cell = document.createElement("td");
    cell.textContent = element.id;
    newEntry.appendChild(cell);

    table.appendChild(newEntry);
  }

  // Show table when update is finished
  table.style.display = "table-row-group";
}