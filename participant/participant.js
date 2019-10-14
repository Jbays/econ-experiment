/*
  Basic Idea:
    1. All subjects see an initial shock value, which unlocks their inputs.
    2. Each subject inputs their forecast of interest rate and output.
    3. Once all subjects in the group have input their forecasts, actual
       interest and output are calculated, as well as payoffs.
    4. Subjects see a new shock, and go back to (2) until all sub-periods have finished.
*/

ROBOTS = false;
var rand;

// helper function to append point p to array a
// used in charts where points must be sequential, e.g.
// [[0, y1], [1, y2], [2, y3], ...]
var append = function(a, p, s) {
  if (a.length === 0) {
    if (s !== undefined) {
      a.push([s, p]);
    } else {
      a.push([0, p]);
    }
  } else {
    a.push([a[a.length-1][0]+1, p]);
  }
};

// disables input, only re-enabling it if you have not input a forecast yet
function update_input_state_ticker() {
  $("input").attr("disabled", "disabled");
  $("#submit_input").attr("disabled", "disabled");
  if (forecasts[r.username] === undefined) {
    $("form p").text("Please review the information above.");
    var review_timeout = 0;
    setTimeout(function() {
      if (forecasts[r.username] === undefined) {
        setTimeout(function() {
          $("#inflation_input").focus();
        }, 100);
        $("form p").text("Please input your forecasts.");
        $("input").attr("disabled", null);
        $("#submit_input").attr("disabled", null);
      }
    }, review_timeout);
  } else {
    $("form p").text("Please wait for others to submit their forecasts.");
  }
}
// returns the median of the given array
function median(array) {
  console.log('median invoked!');
  console.log('medians array parameter>>>',array.toString());
  a = [];
  for (var i = 0; i < array.length; i++) {
    a.push(parseInt(array[i], 10));
  }
  a.sort(function(a, b) { return a-b; });
  
  if (a.length % 2 === 0) {
    console.log('(a[a.length/2] + a[(a.length/2)-1]) / 2>>>',(a[a.length/2] + a[(a.length/2)-1]) / 2);
  } else {
    console.log('a[(a.length-1)/2]>>>',a[(a.length-1)/2]);
  }

  if (a.length % 2 === 0) {
    return (a[a.length/2] + a[(a.length/2)-1]) / 2;
  } else {
    return a[(a.length-1)/2];
  }
}

// normal distribution, mean=0, variance=r.config.shock_stddev
function rand_shock() {
  return rand.normal(0, r.config.shock_stddev);
}

// return true iff you have the minimum username of your group
// useful so that only one person (the minimum) in a group send a message for the
// whole group, acting as a sort of coordinator
function min_group() {
  group = [];
  for (var subject in r.groups) {
    if (r.groups[subject] === r.group) {
      group.push(subject);
    }
  }
  var min;
  for (var i in group) {
    if (min === undefined || group[i] < min) {
      min = group[i];
    }
  }
  return r.username === min;
}

// sends a summary message with how long subjects has been on each of the three tabs
function send_tab_summary() {
  var last_time;
  var tab_times = {
    "forecast": 0,
    "history": 0,
    "instructions": 0
  };
  var current_tab = "forecast";
  for (var i in r.queue) {
    var msg = r.queue[i];
    if (msg.Sender === r.username) {
      if (msg.Key === "__set_period__") {
        last_time = msg.ClientTime;
      } else if (msg.Key === "tab_click") {
        tab_times[current_tab] += msg.ClientTime - last_time;
        last_time = msg.ClientTime;
        current_tab = msg.Value;
      }
    }
  }
  tab_times[current_tab] += new Date().getTime() - last_time;
  r.send("tab_times", {
    "forecast_tab": tab_times.forecast / 1000.0,
    "history_tab": tab_times.history / 1000.0,
    "instructions_tab": tab_times.instructions / 1000.0
  });
}

// displayes the plot tooltip when a point is hovered over
function showTooltip(x, y, contents) {
  $('<div id="tooltip">' + contents + '</div>').css({
    position: 'absolute',
    display: 'none',
    top: y + 5,
    left: x + 5,
    border: '1px solid #fdd',
    padding: '2px',
    'background-color': '#fee',
    opacity: 0.80
  }).appendTo("body").fadeIn(200);
}

// Expected inflation
var e_i_series = [[0, 0]];
// Expected output
var e_o_series = [[0, 0]];
// Actual (realized) inflation
var inflation_series = [[-4, 0], [-3, 0], [-2, 0], [-1, 0], [0, 0]];
// Personal (our) inflation forecast
var inflation_forecast_series = [];
// Personal 4-step ahead inflation forecast
var inflationfour_forecast_series = [];


// Actual (realized) output
var output_series = [[-4, 0], [-3, 0], [-2, 0], [-1, 0], [0, 0]];
// Personal (our) output forecast
var output_forecast_series = [];
// Interest rate and shock
var interest_rate_series = [[-4, 0], [-3,0], [-2, 0], [-1, 0], [0, 0]];


var shockarray;


//PRACTICE SEQUENCE:
//CHANGE THE SHOCK ARRAY AND PERIOD 1 OF THE SHOCK_SERIES:
shockarray = [8,83,-131,-29,-40,-146,-88,-299,-449,-410,-364,-361,-432,-208,-328,-172,5,3,14,-42,-218,-130,52,257,90,-162,-70,9,-25,-164];

var shock_series = [[-4, 0], [-3, 0], [-2, 0], [-1, 0], [0,0], [1,8]];

//SHOCK SEQUENCE 1:
//Sequence 1a:
//shockarray = [133,59,-60,143,52,-48,-66,-148,-231,199,330,229,-34,-133,-99,47,-148,-389,-412,-191,-58,26,-2,23,-49,85,-130,-15,-119,-112];
//var shock_series = [[-4, 0], [-3, 0], [-2, 0], [-1, 0], [0,0], [1,133]];

//Sequence 1b:
//shockarray = [24,-191,-120,142,94,59,-63,-40,8,60,-14,-39,243,-157,202,160,222,-92,-129,-110,-7,-223,-65,-196,-103,27,58,175,231,47];
//var shock_series = [[-4, 0], [-3, 0], [-2, 0], [-1, 0], [0,0], [1,24]];


//SHOCK SEQUENCE 3:
//Sequence 3a:
//shockarray = [-70,181,-12,-70,-133,-230,-156,-125,129,41,-116,144,244,109,-135,-135,-98,-19,-45,32,70,-124,-195,-208,-185,-148,-82,-444,-313,-16];
//var shock_series = [[-4, 0], [-3, 0], [-2, 0], [-1, 0], [0,0], [1,-70]];

//Sequence 3b:
//shockarray = [-140,43,70,36,45,-180,-113,145,96,60,-62,-39,8,60,-14,-39,243,-157,202,160,222,-91,-129,-110,-7,-223,-65,-196,-103,27];
//var shock_series = [[-4, 0], [-3, 0], [-2, 0], [-1, 0], [0,0], [1,-140]];

//SHOCK SEQUENCE 5:
//Sequence 5a:
//shockarray = [116,-84,-188,-213,-507,-101,-15,-107,118,-157,-103,-90,-10,36,-93,-57,-54,51,173,244,26,25,-145,-228,-131,126,-29,32,-11,140];
//var shock_series = [[-4, 0], [-3, 0], [-2, 0], [-1, 0], [0,0], [1,116]];

//Sequence 5b:
//shockarray = [10,-118,-14,81,159,0,59,47,135,147,201,98,36,153,-191,-175,-266,-202,-30,91,-81,-108,-44,-63,4,54,-91,-75,-322,-34];
//var shock_series = [[-4, 0], [-3, 0], [-2, 0], [-1, 0], [0,0], [1,10]];



//SHOCK SEQUENCE 2:
//Sequence 2a:
//shockarray = [-140,43,70,36,45,-180,-113,145,96,60,-62,-39,8,60,-14,-39,243,-157,202,160,222,-91,-129,-110,-7,-223,-65,-196,-103,27];
//var shock_series = [[-4, 0], [-3, 0], [-2, 0], [-1, 0], [0,0], [1,-140]];

//Sequence 2b:
//shockarray = [-143,-77,28,160,294,179,-94,-151,-225,180,22,110,38,138,-22,-196,-298,-106,-84,-73,144,120,95,262,44,116,176,68,67,-114];
//var shock_series = [[-4, 0], [-3, 0], [-2, 0], [-1, 0], [0,0], [1,-143]];


//SHOCK SEQUENCE 4:
//Sequence 4a:
//shockarray = [112,-179,-129,-38,-107,1,-9,-128,-52,-65,-91,-145,-74,-284,-214,-193,-230,-45,-122,1,129,53,66,122,59,104,-106,85,-81,-286];
//var shock_series = [[-4, 0], [-3, 0], [-2, 0], [-1, 0], [0,0], [1,112]];

//Sequence 4b:
//shockarray = [191,378,231,2,158,12,-54,85,-133,-332,-134,-24,-1,64,178,229,56,138,101,-8,-161,-7,-50,-23,-117,-270,-131,-83,110,168];
//var shock_series = [[-4, 0], [-3, 0], [-2, 0], [-1, 0], [0,0], [1,191]];

//SHOCK SEQUENCE 6:
//Sequence 6a:
//shockarray = [-70,181,-12,-70,-133,-230,-156,-125,129,41,-116,144,244,109,-135,-135,-98,-19,-45,32,70,-124,-195,-208,-185,-148,-82,-444,-313,-16];
//var shock_series = [[-4, 0], [-3, 0], [-2, 0], [-1, 0], [0,0], [1,-70]];

//Sequence 6b:
//shockarray = [-82,-205,-150,-273,-158,-164,192,259,-180,-45,-209,-152,-65,61,-1,206,54,74,129,85,164,136,-25,-251,100,-22,1,74,57,-86];
//var shock_series = [[-4, 0], [-3, 0], [-2, 0], [-1, 0], [0,0], [1,-82]];



//Pi-star Inflation target
var pistar_WR_series = [[-1, 0], [0, 0]];
var nextpistar_WR_series = [[-1, 0], [0, 0], [1,0]];
//Old output gap Change
var old_x_change_series = [[-2, 0], [-1, 0], [0, 0]];




// Updates the plots when series data changes
// Automatically sets axis min/max to display all data
function replot() {
  var opts = {
    series: {
      lines: { show: true },
      points: { show: true }
    },
    grid: {
      hoverable: true,
      clickable: false
    },
    xaxis: {
      min: -4,
      max: Math.max(40, inflation_series.length),
      minTickSize: 1,
      tickDecimals: 0,
      tickFormatter: function(tick) {
        return Math.round(tick);
      }
    },
    legend: {
      backgroundOpacity: 0,
      container: ""
    }
  };
  var red = "#cc0000";
  var blue = "#3465a4";
var green = "#00ff00";
var orange = "#FFA500";

  
  // the interest fan plot, yes, this is recomputed every time we replot
  var interest_fan = [];
  var interest_fanfill = [];
  for (var i in interest_rate_series) {
    if (interest_rate_series[i][0] >= 0) {
      interest_fan.push(interest_rate_series[i]);
    }
  }
  var t = shock_series[shock_series.length-1][0];
  var r_t = shock_series[shock_series.length-1] [1];
  for (var n = 1; n <= r.config.forecast_length; n++) {
    var r_tn = r.config.dide *Math.pow(r.config.p, n-1) * r_t;
    interest_fan.push([t+n, r_tn]);
    var stddev = r.config.shock_stddev * Math.sqrt(n);
    interest_fanfill.push([t+n, r_tn + stddev, r_tn - stddev]);
  }

  $.plot($("#fanplot"), [
  {
    data: interest_fan,
    color: red,
    label: "Interest Rate Forecast",
    lines: {fillBetween: true}
  },
  {
    data: interest_fanfill,
    color: red,
    lines: {show: true, lineWidth: 0, fill: 0.2},
    points: {show: false},
    hoverable: false
  }
  ], opts);
  
  // the inflation fan plot
  
  var inflation_fan = [];
  var inflation_fanfill = [];
  for (var ii in inflation_series) {
    if (inflation_series[ii][0] >= 0) {
      inflation_fan.push(inflation_series[ii]);
    }
  }
  var tt = shock_series[shock_series.length-1][0];
  var pi_t = shock_series[shock_series.length-1] [1];
  for (var nn = 1; nn <= r.config.forecast_length; nn++) {
    var pi_tn = r.config.dpide*Math.pow(r.config.p, nn-1) * pi_t;
    inflation_fan.push([tt+nn, pi_tn]);
    var pi_stddev = r.config.shock_stddev * Math.sqrt(nn);
    inflation_fanfill.push([tt+nn, pi_tn + pi_stddev, pi_tn - pi_stddev]);
  }
  
  
  $.plot($("#fanplot"), [
  {
    data: inflation_fan,
    color: red,
    label: "Inflation Forecast",
    lines: {fillBetween: true}
  },
  {
    data: inflation_fanfill,
    color: red,
    lines: {show: true, lineWidth: 0, fill: 0.2},
    points: {show: false},
    hoverable: false
  }
  ], opts);
  
  
  //The output fan plot
    var output_fan = [];
  var output_fanfill = [];
  for (var iii in output_series) {
    if (output_series[iii][0] >= 0) {
      output_fan.push(output_series[iii]);
    }
  }
var tx = shock_series[shock_series.length-1][0];
  var shock_t = shock_series[shock_series.length-1] [1];
  var x_t1 = output_series[output_series.length-1] [1];
  var pi_t1 = inflation_series[inflation_series.length-1] [1];
  var shock_t1 = shock_series[shock_series.length-2] [1];

  for (var nx = 1; nx <= r.config.forecast_length; nx++) {
if(nx==1){  
var x_tn =  r.config.AX1*shock_t1 +r.config.BX1*x_t1 + r.config.CX1*pi_t1 + r.config.DX1*(shock_t-r.config.p*shock_t1);}
 if(nx==2){  
var x_tn =  r.config.AX2*shock_t1 +r.config.BX2*x_t1 + r.config.CX2*pi_t1 + r.config.DX2*(shock_t-r.config.p*shock_t1);}
 if(nx==3){  
var x_tn = r.config.AX3*shock_t1 +r.config.BX3*x_t1 + r.config.CX3*pi_t1 + r.config.DX3*(shock_t-r.config.p*shock_t1);}
 if(nx==4){  
var x_tn = r.config.AX4*shock_t1 +r.config.BX4*x_t1 + r.config.CX4*pi_t1 + r.config.DX4*(shock_t-r.config.p*shock_t1);}
if(nx==5){  
var x_tn = r.config.AX5*shock_t1 +r.config.BX5*x_t1 + r.config.CX5*pi_t1 + r.config.DX5*(shock_t-r.config.p*shock_t1);}
   output_fan.push([tx+nx, x_tn]);
    var x_stddev = r.config.shock_stddev * Math.sqrt(nx);
   output_fanfill.push([tx+nx, x_tn + x_stddev, x_tn - x_stddev]);
  }

  $.plot($("#fanplot"), [
  {
    data: output_fan,
    color: red,
    label: "Inflation Forecast",
    lines: {fillBetween: true}
  },
  {
    data: output_fanfill,
    color: red,
    lines: {show: true, lineWidth: 0, fill: 0.2},
    points: {show: false},
    hoverable: false
  }
  ], opts);
  
  
  
  
  
//
  opts.legend.container = "#plot1-legend"; // places the legend outside the plot, in the DOM
 if(r.config.pifcst==0){ 
   $.plot($("#plot1"), [
  {
    data: inflation_series,
    color: red,
    label: "Inflation"
  },


  {
    data: inflation_forecast_series,
    color: blue,
    label: "Inflation Forecast"
  }
  ], opts);
}
 if(r.config.pifcst==1){ 
   $.plot($("#plot1"), [
     
  
  { 
    data: inflation_fan,
    color: green,
    label: "Central Bank's Inflation Forecast",
    lines: {fillBetween: true}
  },
  

  {
    data: inflation_fanfill,
    color: green,
    lines: {show: true, lineWidth: 0, fill: 0.2},
    points: {show: false},
    hoverable: false

  },
  
  {
    data: inflation_series,
    color: red,
    label: "Inflation"
  },


  {
    data: inflation_forecast_series,
    color: blue,
    label: "Inflation Forecast"
  }
  ], opts);
} 
  
  
  
  opts.legend.container = "#plot2-legend";
  
  if(r.config.xfcst==0){
  $.plot($("#plot2"), [
  {
    data: output_series,
    color: red,
    label: "Output"
  },
  {
    data: output_forecast_series,
    color: blue,
    label: "Output Forecast"
  }
  ], opts);
  }
  
    if(r.config.xfcst==1){
  $.plot($("#plot2"), [
   { 
    data: output_fan,
    color: green,
    label: "Central Bank's Output Forecast",
    lines: {fillBetween: true}
  },
  
  {
    data: output_fanfill,
    color: green,
    lines: {show: true, lineWidth: 0, fill: 0.2},
    points: {show: false},
    hoverable: false

  },
  {
    data: output_series,
    color: red,
    label: "Output"
  },
  {
    data: output_forecast_series,
    color: blue,
    label: "Output Forecast"
  }
  ], opts);
  }
  
  
  
  opts.legend.container = "#plot3-legend";


  if(r.config.irfcst==0){
  $.plot($("#plot3"), [
      {
    data: shock_series,
    label: "Shock"
  },
  {
    data: interest_rate_series,
    label: "Interest Rate"
  }
  
  ], opts);
  opts.legend.container = null;
}

  
  if(r.config.irfcst==1){
  $.plot($("#plot3"), [
    
     { 
    data: interest_fan,
    color: green,
    label: "Central Bank's Interest Rate Forecast",
    lines: {fillBetween: true}
  },
  

  {
    data: interest_fanfill,
    color: green,
    lines: {show: true, lineWidth: 0, fill: 0.2},
    points: {show: false},
    hoverable: false

  },
  
      {
    data: shock_series,
    label: "Shock"
  },
  {
    data: interest_rate_series,
    label: "Interest Rate"
  }
 
  
  ], opts);
  opts.legend.container = null;
}

}

// show the current tab, hide all others
function update_tab_nav() {
  var tab_id = document.location.hash.substr(1);
  if (tab_id !== "") {
    $(".tab").css("visibility", "hidden");
    $(".tab." + tab_id).css("visibility", "visible");
    $(".nav li").removeClass("active");
    $("a[href=" + document.location.hash + "]").closest("li").addClass("active");
  }
  $(".nav a").click(function() {
    if ($(this).parent().hasClass("active")) {
      return false;
    }
    $(this).closest("ul").children("li").removeClass("active");
    $(this).parent().addClass("active");
    var tab_id = $(this).attr("href").substr(1);
    $(".tab").css("visibility", "hidden");
    $(".tab." + tab_id).css("visibility", "visible");
    r.send("tab_click", tab_id);
  });
}

function setup_tooltip() {
  var previousPoint = null;
  $(".plot").bind("plothover", function(event, pos, item) {
    if (item) {
      if (previousPoint != item.dataIndex) {
        previousPoint = item.dataIndex;
        
        $("#tooltip").remove();
        var period = Math.round(item.datapoint[0].toFixed(2));
        var y = item.datapoint[1].toFixed(2);
        var label;
        if (item.series.label === undefined) {
          label = "Period " + period + " = " + y;
        } else if (item.series.label.indexOf("Forecast") !== -1) {
          label = item.series.label + " for Period " + period + " = " + y;
        } else {
          label = item.series.label + " at Period " + period + " = " + y;
        }
        showTooltip(item.pageX, item.pageY, label);
      }
    }
    else {
      $("#tooltip").remove();
      previousPoint = null;            
    }
  });
}

var old_forecasts = {};
var forecasts = {};

// returns true iff all subjects in group have sent in a forecast
function all_forecasts_in() {
  var all_in = true;
  var subject;
  for (subject in r.groups) {
    if (r.groups[subject] === r.group && forecasts[subject] === undefined) {
      all_in = false;
    }
  }
  return all_in;
}

// called when a new forecast comes in
// updates the plots, checks if all forecasts are now in, sending a
// new shock if subject receiving it is the "coordinator" (see min_group)
function handle_forecast(msg) {
  if (msg.Sender === r.username) {
    $("input").attr("disabled", "disabled");
    $("#submit_input").attr("disabled", "disabled");
    $(".input-state").text("Please wait for group to finish...");
    $("#inflation_input").val(parseFloat(msg.Value.inflation).toFixed(0));
$("#inflationfour_input").val(parseFloat(msg.Value.inflationfour).toFixed(0));
    $("#output_input").val(parseFloat(msg.Value.output).toFixed(0));
    $("form p").text("Please wait for others to submit their forecasts.");
    append(inflation_forecast_series, msg.Value.inflation, 2);
append(inflationfour_forecast_series, msg.Value.inflationfour, 5);
    append(output_forecast_series, msg.Value.output, 2);
    replot();
  }
  
  forecasts[msg.Sender] = msg.Value;
  if (all_forecasts_in()) {
    $("#inflation_input").val("");
$("#inflationfour_input").val("");

    $("#output_input").val("");
    var subperiod = $(".period").text();
    if (subperiod === "") {
      subperiod = 0;
    } else {
      subperiod = parseInt(subperiod, 10);
    }
    subperiod++;
    $(".period").text(subperiod);
    if (min_group()) {
      var last_shock = shock_series[shock_series.length -1][1];
      var draw = rand_shock();
r.send("shock", {subperiod: subperiod, draw: draw, shock: shockarray[subperiod-1]});
      r.send("progress", {period: r.period, subperiod: subperiod}, {period: 0, group: 0});
    } else {
      r.send("progress", {period: r.period, subperiod: subperiod}, {period: 0, group: 0});
    }
    send_tab_summary();
  }
}

// handles a new shock
// calculates variables given previous forecasts
// unlocks inputs for next forecast, unless all subperiods are finished
function handle_shock(msg) {
  
  last_shock = msg;

  var curr_shock_size = msg.Value.shock;
  var last_shock_size = Math.round(parseFloat($(".curr_shock_size").text(), 10));
  $(".curr_shock_size").text(curr_shock_size);
  $(".expected_shock_size").text(Math.round(r.config.p * curr_shock_size));
  append(shock_series, msg.Value.shock);
  
  var subperiod = parseInt($(".period").text(), 10);
  
  if (all_forecasts_in()) {
    var inflation_forecasts = [];
    var inflationfour_forecasts = [];
    var output_forecasts = [];
    //i predicted forecasts had forecasts for key-value pairs right before for-in loop
    //not true.
    //let's see if JSON.stringify helps me understand why
    console.log('this is forecasts before the for-in loop',JSON.stringify(forecasts));
    for (var subject in forecasts) {
      if (forecasts[subject].inflation !== null && forecasts[subject].output !== null) {
        console.log('forecasts[subject].inflation !== null && forecasts[subject].output !== null')

        inflation_forecasts.push(forecasts[subject].inflation);
        inflationfour_forecasts.push(forecasts[subject].inflationfour);
        output_forecasts.push(forecasts[subject].output);
      }
    }
    //inflation_forecasts is the variable i need to populate with elements to get the economy to become responsive

    console.log('inflation_forecasts.toString() right before e_i',inflation_forecasts.toString());
    var e_i = median(inflation_forecasts); 
    console.log('e_i.toString()',e_i.toString());
var e_i_four = median(inflationfour_forecasts);
    var e_o = median(output_forecasts);
    
    var last_e_i = e_i_series[e_i_series.length - 1][1];
    var last_e_o = e_o_series[e_o_series.length - 1][1];
    var last_interest_rate = interest_rate_series[interest_rate_series.length - 1][1];
    var last_inflation = inflation_series[inflation_series.length - 1][1];
    var last_output = output_series[output_series.length - 1][1];
    
    var old_x_change = last_output - output_series[output_series.length - 2][1];
     var last_pistar = pistar_WR_series[pistar_WR_series.length - 1][1];
     var pistar_WR = ((last_pistar - last_inflation)/r.config.beta)  -  (r.config.lambda/(r.config.kappa*r.config.beta))*(old_x_change) - (r.config.lambda*r.config.sigma/r.config.beta)*last_output;

var testershock = shockarray[subperiod-2];

var inflation = (r.config.D*e_o) + (r.config.E*e_i) + (r.config.F*testershock);
var output = (r.config.A*e_o) + (r.config.B*e_i) + (r.config.C*testershock);
var interest_rate =  (r.config.G*e_o) + (r.config.H*e_i) + (r.config.I*testershock);

//if(r.config.woodfordrule==1){
//var inflation = r.config.G*((r.config.H*e_i) + (r.config.B*e_o) + (r.config.D*pistar_WR) + (r.config.F*testershock));
//var output = r.config.A*((r.config.B*e_o) + (r.config.C*e_i) + (r.config.F*testershock) + (r.config.D*pistar_WR));
//var interest_rate = r.config.rstar + r.config.phi*(inflation-pistar_WR) + r.config.gamma*output;
//}
    
//if(interest_rate<0){interest_rate=0;
//var output =  e_o - (interest_rate - e_i - testershock - r.config.rstar)/r.config.sigma;
//var inflation = (r.config.beta*e_i) + (r.config.kappa*output);
//}

var nextpistar_WR = ((pistar_WR - inflation)/r.config.beta)  -  (r.config.lambda/(r.config.kappa*r.config.beta))*(output-last_output) - (r.config.lambda*r.config.sigma/r.config.beta)*output;

pistar_WR = Math.round(pistar_WR);
nextpistar_WR = Math.round(nextpistar_WR);

    interest_rate = Math.round(interest_rate);
    output = Math.round(output);
    inflation = Math.round(inflation);

    console.log('just before append e_i_series>>>>',e_i_series);
    
    append(e_i_series, e_i);
    append(e_o_series, e_o);
    append(inflation_series, inflation);
    append(output_series, output);
    append(pistar_WR_series, pistar_WR); 



    
    if (r.username in old_forecasts) {
      if (old_forecasts[r.username].inflation === null || old_forecasts[r.username].output === null) {
        r.send("points", 0, {period: 0, group: 0});
        
        $(".last_inflation_forecast").text("N/A");
$(".last_inflationfour_forecast").text("N/A");

        $(".last_output_forecast").text("N/A");
        $(".last_inflation_forecast_error").text("N/A");
        $(".last_output_forecast_error").text("N/A");
        $(".last_score").text("0");
      } else {
        // use forecast from 2 periods ago, not 1
        E_inflation = parseInt(old_forecasts[r.username].inflation, 10);
        E_output = parseInt(old_forecasts[r.username].output, 10);
E_inflationfour = 100;

        var score =
          r.config.R_0 * Math.pow(2, -r.config.alpha*Math.abs(E_inflation - inflation)) +
          r.config.R_0 * Math.pow(2, -r.config.alpha*Math.abs(E_output - output));
          
        r.set_points(r.points + score);
        r.send("points", score, {period: 0, group: 0, subperiod: subperiod});
        
        $(".last_inflation_forecast").text(E_inflation.toFixed(0));
$(".last_inflationfour_forecast").text(E_inflationfour.toFixed(0));

        $(".last_output_forecast").text(E_output.toFixed(0));
        $(".last_inflation_forecast_error").text(Math.abs(E_inflation - inflation).toFixed(0));
        $(".last_output_forecast_error").text(Math.abs(E_output - output).toFixed(0));
        $(".last_score").text(score.toFixed(2));
      }
    }
    
    for (subject in forecasts) {
      old_forecasts[subject] = forecasts[subject];
      forecasts[subject] = undefined;
    }
    $(".last_inflation").text(inflation);
    $(".last_output").text(output);

var next_interest_rate = interest_rate;


$(".nextpistar_WR").text(nextpistar_WR);
append(nextpistar_WR_series, nextpistar_WR);




    $(".curr_interest_rate").text(next_interest_rate);
    append(interest_rate_series, next_interest_rate);
    if (min_group()) {
      r.send("summary", {
        subperiod: subperiod-1,
        e_i: e_i,
        e_o: e_o,
        shock: last_shock_size,
        shockarray: shockarray[subperiod-2],
        testershock: testershock,
        interest_rate: interest_rate,
        output: output,
        inflation: inflation,
        next_interest_rate: next_interest_rate,
        pistar_WR: pistar_WR,
nextpistar_WR: nextpistar_WR,
        old_x_change: old_x_change
        

      });
    }
  }
  
  replot();
  
  if (subperiod <= r.config.subperiods) {
    update_input_state_ticker();
    if (ROBOTS && !r.__sync__.in_progress) {
      robot = setTimeout(function() {
       var inflation = rand.uniform(40, -50); 
       var inflationfour = rand.uniform(40,-50);
        var output = rand.uniform(40, -50); 
        r.send("forecast", { subperiod: subperiod, inflation: inflation, output: output });
        r.send("progress", { period: r.period, subperiod: subperiod, forecast: true}, {period: 0, group: 0});
      }, Math.round(1000 + Math.random() * 3000));
    }
  } else {
    $("form").hide();
    $(".wait").show();
    $(".period").text("Waiting...");
    $(".time_remaining").css("visibility", "hidden");
  }
}

// finish_sync is called on page refresh, when redwood is done loading the queue
// it initializes variables, inputs, and some display variables
var last_shock;
function finish_sync() {
  $("#pdf_content").attr("data", r.config.instructions_url);
  
  var c = document.location.pathname.split('/');
  $(".subject").text(c[c.length - 1].split("@")[0]);
  $("#submit_input").click(function() {
    var help;
    var inflation = $("#inflation_input").val();
    $(".help-inline").remove();
    if (inflation === "") {
      $("#inflation_input").closest(".control-group").addClass("error");
      help = $("<span>").
        addClass("help-inline").
        text("Please input your inflation estimate");
      $("#inflation_input").after(help);
    } else {
      $("#inflation_input").closest(".control-group").removeClass("error");
    }
var inflationfour = $("#inflationfour_input").val();
    $(".help-inline").remove();
    if (inflationfour === "") {
      $("#inflationfour_input").closest(".control-group").addClass("error");
      help = $("<span>").
        addClass("help-inline").
        text("Please input your 4-step ahead inflation estimate");
      $("#inflationfour_input").after(help);
    } else {
      $("#inflationfour_input").closest(".control-group").removeClass("error");
    }

    var output = $("#output_input").val();
    if (output === "") {
      $("#output_input").closest(".control-group").addClass("error");
      help = $("<span>").
        addClass("help-inline").
        text("Please input your output estimate");
      $("#output_input").after(help);
    } else {
      $("#output_input").closest(".control-group").removeClass("error");
    }
    if (help === undefined) {
      $("input").attr("disabled", "disabled");
      $("#submit_input").attr("disabled", "disabled");
      var subperiod = parseInt($(".period").text(), 10);
r.send("forecast", { subperiod: subperiod, inflation: inflation, inflationfour: inflationfour, output: output });
      r.send("progress", {period: r.period, subperiod: subperiod, forecast: true}, {period: 0, group: 0});
    }
    return false;
  });
  update_input_state_ticker();
  
  // check if we have marked this period as paid and assigned a show_up fee
  var marked_paid = false;
  var show_up_fee = false;
  for (var i in r.queue) {
    var msg = r.queue[i];
    if (msg.Key === "shock") {
      last_shock = msg;
    } else if (msg.Key === "__mark_paid__" && msg.Sender === r.username) {
      marked_paid = true;
    } else if (msg.Key === "__set_show_up_fee__" && msg.Sender === r.username) {
      show_up_fee = true;
    }
  }
  // ensure we only mark paid and set show up once period period
  if (!marked_paid) {
    r.mark_paid(true);
  }
  if (!show_up_fee) {
    r.set_show_up_fee(5);
  }
  
  // no last shock? send the initial shock for the period! 
  if (last_shock === undefined) {
    if (min_group()) {

      r.send("shock", {draw: draw, shock: r.config.firstshock});
      r.send("progress", {period: r.period, subperiod: 0}, {period: 0, group: 0});
    }
  }
  
  // sets up a ticker that automatically sends a null forecast if the subject doesn't
  // give input within r.config.allowed_time (or r.config.allowed_time - 10, if
  // the period is greater than 10
  setInterval(function() {
    var last_progress;
    for (var i in r.queue) {
      var msg = r.queue[i];
      if (msg.Key === "__set_period__" && msg.Sender === r.username) {
        last_progress = msg;
      } else if (msg.Key === "progress" && msg.Sender === r.username && !msg.Value.forecast) {
        last_progress = msg;
      }
    }
    if (last_progress === undefined) {
      secondsFromShock = 0;
    } else {
      var diff = curr_time_diff(last_progress.Time);
      secondsFromShock = Math.round(diff / 1000);
    }
    var finished = $("input").attr("disabled") === "disabled";
    var allowed_time = r.config.allowed_time;
    if (parseInt($(".period").text(), 10) >= 10) {
      allowed_time -= 15;
    }
    var secondsLeft = allowed_time - secondsFromShock;
    if (!finished && secondsLeft <= 0) {
      $(".time_remaining").text("Time Remaining: 0");
      $(".time_remaining,.prompt").toggleClass("red");
      if (r.config.block === false && secondsLeft <= -5) {
r.send("forecast", { inflation: NaN, inflationfour: NaN, output: NaN });
        var subperiod = parseInt($(".period").text(), 10);
        r.send("progress", {period: r.period, subperiod: subperiod, forecast: true}, {period: 0, group: 0});
      }
    } else if (finished && secondsLeft <= 0) {
      $(".time_remaining").text("Time Remaining: 0");
      $(".time_remaining,.prompt").removeClass("red");
    } else {
      $(".time_remaining").text("Time Remaining: " + Math.round(secondsLeft));
      $(".time_remaining,.prompt").removeClass("red");
    }
  }, 500);
  var period = parseInt($(".period").text(), 10);
  if (period <= r.config.subperiods) {
    if (ROBOTS && typeof robots === "undefined") {
      robot = setTimeout(function() {
        var inflation = last_inflation;


        var output = last_output;
r.send("forecast", { inflation: inflation, inflationfour: inflationfour, output: output });
var subperiod = parseInt($(".period").text(), 10);
        r.send("progress", {period: r.period, subperiod: subperiod, forecast: true}, {period: 0, group: 0});
      }, Math.round(1000 + Math.random() * 10000));
    }
  }
  if (r.config.hide_previous) {
    $(".previous").addClass("invisible");
  }
  if (r.config.hide_ir_chart) {
    $("#fanplot").addClass("invisible");
  }
}

// sets up random number generator and attaches handlers, called once when page
// loads
$(function() {
  rand = new Random();
  
  update_tab_nav();
  
  r.recv("forecast", handle_forecast);
  
  r.recv("shock", handle_shock);
  
  var total_points = 0;
  r.recv("points", function(msg) {
    if (msg.Sender === r.username) {
      total_points += msg.Value;
      $(".total_points").text(total_points.toFixed(2));
    }
  });
  
  r.finish_sync(finish_sync);
  
  setup_tooltip();
});





