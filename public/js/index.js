function refresh() {
  getLinks();
}

function getLinks() {
  overload_xhr(
    "GET",
    "/api/links",
    function(xhr){
      var json = JSON.parse(xhr.responseText);
      doc_refreshLinks(json);
    }
  );
}

function doc_refreshLinks(links) {
  var linkSlack = document.getElementsByClassName("link-slack");
  var count = linkSlack.length;
  for (var x = count - 1; x >= 0; x--) {
    linkSlack[x].href = links.slack;
  }
  linkSlack.href = links.slack;
}

