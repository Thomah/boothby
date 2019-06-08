// eslint-disable-next-line no-unused-vars
function refresh() {
  var textButton = document.getElementById("refresh");
  overload_xhr(
    "GET",
    "/api/config",
    function (xhr) {
      textButton.style["backgroundColor"] = "greenyellow";
      var json = JSON.parse(xhr.responseText);
      doc_refreshConfig(json);
    },
    function(){},
    function(){
      textButton.style["backgroundColor"] = "red";
    }
  );
}

// eslint-disable-next-line no-unused-vars
function save() {
  var config = doc_getConfig();
  var textButton = document.getElementById("save");

  overload_xhr(
    "PUT",
    "/api/config",
    function () {
      textButton.style["backgroundColor"] = "greenyellow";
    },
    function (xhr) {
      xhr.setRequestHeader("Content-type", "application/json; charset=utf-8");
    },
    function () {
      textButton.style["backgroundColor"] = "red";
    },
    JSON.stringify(config)
  );
}

function doc_refreshConfig(config) {
  document.getElementById("cron").value = config.cron;
  document.getElementById("next-invocation").innerText = new Date(config.nextInvocation).toLocaleString();
}

function doc_getConfig() {
  var config = {
    cron: document.getElementById("cron").value
  };
  return config;
}
