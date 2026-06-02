window.renderPharmaMvtr = function () {
  var c = document.getElementById('app-content');
  if (!c) return;
  c.innerHTML = '<iframe src="pharma_mvtr.html" ' +
    'style="width:100%;height:calc(100vh - 120px);' +
    'border:none;display:block;"></iframe>';
};
