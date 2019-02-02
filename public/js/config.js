function refresh() {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "/api/config");
  xhr.onload = function() {
    if (xhr.status === 200) {
      var json = JSON.parse(this.responseText);
      doc_refreshConfig(json);
    } else {
      alert("Request failed.  Returned status of " + xhr.status);
    }
  };
  xhr.send();
}

function save() {
  var config = doc_getConfig();
  var xhr = new XMLHttpRequest();
  var textButton = document.getElementById("save");
  xhr.open("PUT", "/api/config", true);
  xhr.setRequestHeader("Content-type", "application/json; charset=utf-8");
  xhr.onload = function() {
    if (xhr.status === 200) {
      textButton.style["backgroundColor"] = "greenyellow";
    } else {
      textButton.style["backgroundColor"] = "red";
      alert("Request failed.  Returned status of " + xhr.status);
    }
  };
  xhr.send(JSON.stringify(config));
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
