// eslint-disable-next-line no-unused-vars
function refresh() {
  overload_xhr(
    "GET",
    "/api/config",
    function (xhr) {
      var json = JSON.parse(xhr.responseText);
      doc_refreshConfig(json);
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
  document.getElementById("next-daily-dialog").value = config.daily;
  document.getElementById("next-invocation").innerText = new Date(config.nextInvocation).toLocaleString();
}

function doc_getConfig() {
  var config = {
    cron: document.getElementById("cron").value,
    daily: document.getElementById("next-daily-dialog").value
  };
  return config;
}
