// divides subjects into equal groups, "groupSize" subjects per group
// if there aren't enough subjects to fill out all groups, the last group will have
// the remaining subjects
function setupGroups(groupSize) {
  if (Object.size(r.subjects) === 0 || Object.size(r.subjects) % groupSize !== 0) {
    return;
  }
  var group = Object.size(r.groups) + 2;
  var lastGroupSize = 0;
  var i;
  for (i in r.subjects) {
    if (r.groups[r.subjects[i]] == group - 1) {
      lastGroupSize++;
    }
  }
  if (lastGroupSize < groupSize) {
    group--;
  }
  var count = 0;
  for (i in r.subjects) {
    var subject = r.subjects[i];
    if (!(subject in r.groups)) {
      r.set_group(group, subject);
      count++;
      if (count == groupSize) {
        count = 0;
        group++;
      }
    }
  }
}

// update the subject table when new progress messages are received, showing the
// subject's current period, group, and subperiod, 
function update(grid) {
  var rows = [];
  var all_done = true;
  for (var i in r.subjects) {
    var subject = r.subjects[i];
    var period = r.periods[subject];
    var group = r.groups[subject];
    var subperiod = "?";
    var time = "?";
    var subperiods;
    var j, config;
    for (j in r.configs) {
      config = r.configs[j];
      if ((config.period === 0 || config.period === period) && (config.group === 0 || config.group === group)) {
        if ("subperiods" in config) {
          subperiods = config.subperiods;
        }
      }
    }
    for (j in r.configs) {
      config = r.configs[j];
      if ((config.period === 0 || config.period === period) && (config.group === 0 || config.group === group)) {
        if ("allowed_time" in config) {
          if (period in last_progress && group in last_progress[period]) {
            var last = last_progress[period][group];
            var personal = personal_progress[subject];
            subperiod = last.Value.subperiod;
            if (subperiod === 0) {
              subperiod = 1;
            }
            if (subperiod > subperiods) {
              time = "Waiting";
              subperiod = "Last";
            } else if (personal !== undefined && last.Value.period === personal.Value.period && last.Value.subperiod === personal.Value.subperiod) {
              time = "Waiting";
              all_done = false;
            } else {
              var elapsed = curr_time_diff(last.Time);
              var allowed_time = config.allowed_time;
              if (last.Value.subperiod >= 10) {
                allowed_time -= 15;
              }
              time = allowed_time - Math.round(elapsed / 1000);
              if (time < 0) {
                time = 0;
              }
              all_done = false;
            }
          }
        }
      }
    }
    rows.push({
      period: period,
      group: group,
      page: r.pages[subject],
      subject: subject.split("@")[0],
      subperiod: subperiod,
      time: time
    });
    all_done = all_done & subperiod !== "?" & time !== "?";
  }
  grid.setData(rows);
  grid.updateRowCount();
  grid.render();
  if (all_done && session_started) {
    $("#next-period").attr("disabled", null);
  } else {
    $("#next-period").attr("disabled", "disabled");
  }
}

function setupSubjectList() {
  var cols = [
    {
      name: "Period",
      field: "period",
      id: "period"
    },
    {
      name: "Group",
      field: "group",
      id: "group"
    },
    {
      name: "Page",
      field: "page",
      id: "page"
    },
    {
      name: "Subject",
      field: "subject",
      id: "subject",
      width: 100
    },
    {
      name: "Subperiod",
      field: "subperiod",
      id: "subperiod",
      width: 100
    },
    {
      name: "Time",
      field: "time",
      id: "time",
      width: 100
    } 
  ];
  var opts = {
    editable: false,
    enableCellNavigation: true,
    enableColumnReorder: false
  };
  subjectGrid = new Slick.Grid("#subject-list", [], cols, opts);
  r.recv("__register__", function() { update(subjectGrid); });
  r.recv("__set_period__", function() { update(subjectGrid); });
  r.recv("__set_group__", function() { update(subjectGrid); });
  r.recv("__set_page__", function() { update(subjectGrid); });
}

var session_started = false;
$(function() {
  $("#start-session").click(function() {
    $.ajaxSetup({async:false});
    for (var i in r.subjects) { 
      var period = r.periods[r.subjects[i]];
      if (period === undefined) {
        period = 0;
      }
      r.set_period(period+1, r.subjects[i]);
    }
    return false;
  });
  
  $("#reset-session").click(function() {
    r.send("__reset__");
    return false;
  });
  
  $("#regroup").click(function() {
    var groupsize = parseInt($("#groupsize").val(), 10);
    setupGroups(groupsize);
    r.send("groupsize", groupsize);
  });
  
  $("#download").attr("href", r.instance + "/session/" + r.session + "/api/get_data_csv");
  
  $("#next-period").click(function() {
    for (var i in r.subjects) {
      r.set_period(r.periods[r.subjects[i]] + 1, r.subjects[i]);
      r.set_page("start", r.subjects[i]);
    }
    $("#next-period").attr("disabled", "disabled");
  });
  
  r.recv("__router_status__", function(msg) {
    var status = $("#router-status");
    if (r.ws.readyState === WebSocket.OPEN) {
      status.text("Router: Connected");
      status.removeClass("badge-important");
      status.addClass("badge-success");
    } else {
      status.text("Router: Disconnected");
      status.removeClass("badge-success");
      status.addClass("badge-important");
    }
  });
  
  r.recv("groupsize", function(msg) {
    $("#groupsize").val(msg.Value);
  });
  
  r.recv("__set_period__", function(msg) {
    $("#start-session").attr("disabled", "disabled");
    $("#groupsize").attr("disabled", "disabled");
    $("#regroup").attr("disabled", "disabled");
    session_started = true;
  });
  
  last_progress = {};
  personal_progress = {};
  r.recv("progress", function(msg) {
    r.send("admin_progress", {
      subject: msg.Sender,
      period: r.periods[msg.Sender],
      group: r.groups[msg.Sender],
      subperiod: msg.Value.subperiod,
      forecast: msg.Value.forecast
    });
  });
  
  r.recv("admin_progress", function(msg) {
    if (msg.Value.forecast) {
      personal_progress[msg.Value.subject] = msg;
    } else {
      if (last_progress[msg.Value.period] === undefined) {
        last_progress[msg.Value.period] = {};
      }
      last_progress[msg.Value.period][msg.Value.group] = msg;
      personal_progress = {};
    }
  });
  
  setTimeout(setupSubjectList, 500);
  setInterval(function() { update(subjectGrid); }, 1000);
});