// eslint-disable-next-line no-unused-vars
function refresh() {
  var textButton = document.getElementById("refresh");
  overload_xhr(
    "GET",
    "/api/configs",
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
    "/api/configs",
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

function doc_refreshConfig(configs) {
  for(var configNum in configs) {
    var config = configs[configNum];
    document.getElementById("cron-" + configNum).value = config.cron;
    document.getElementById("next-invocation-" + configNum).innerText = new Date(config.nextInvocation).toLocaleString();
  }
}

function doc_getConfig() {
  var configs = {};
  configs["dialog-publish"] = {
    name: "dialog-publish",
    cron: document.getElementById("cron-0").value,
    active: true
  };
  return configs;
}
