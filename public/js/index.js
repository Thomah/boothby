// eslint-disable-next-line no-unused-vars
function refresh() {
  getLinks();
}

function getLinks() {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "/api/links");
  xhr.onload = function() {
    if (xhr.status === 200) {
      var json = JSON.parse(this.responseText);
      doc_refreshLinks(json);
    }
  };
  xhr.send();
}

function doc_refreshLinks(links) {
  var linkSlack = document.getElementsByClassName("link-slack");
  var count = linkSlack.length;
  for (var x = count - 1; x >= 0; x--) {
    linkSlack[x].href = links.slack;
  }
  linkSlack.href = links.slack;
}
