document.addEventListener("adobe_dc_view_sdk.ready", function () {
  var adobeDCView = new AdobeDC.View({ clientId: "YOUR API KEY HERE", divId: "adobe-dc-view" });
  adobeDCView.previewFile({
    content: { location: { url: '//' + window.location.host + window.embedUrl } },
    metaData: { fileName: "job-posting.pdf" }
  });
});