dataset.push({
  label: "Median Forecast (Inflation)",
  data: []
});
for (var i in r.queue) {
  var msg = r.queue[i];
  if (msg.Key === "forecast") {
    var label = msg.Sender.split("@")[0] + "(Inflation)";
    var series = null;
    for (var j in dataset) {
      if (dataset[j].label === label) {
        series = dataset[j];
      }
    }
    if (series === null) {
      series = {
        label: label,
        data: [],
        lines: { show: false },
        points: { show: true }
      };
      dataset.push(series);
    }
    series.data.push([series.data.length, msg.Value.inflation]);
  } else if (msg.Key === "summary") {
    dataset[0].data.push([dataset[0].data.length, msg.Value.e_i]);
  }
}

