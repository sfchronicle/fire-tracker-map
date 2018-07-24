require("./lib/social"); //Do not delete
var d3 = require('d3');

// format numbers
var formatthousands = d3.format(",");

// timers
var timer5minutes = 600000;
var timer30minutes = timer5minutes*6;

var maxWidth = 1000;
var windowWidth = $(window).width();

// number of days in a month
function daysInMonth (month, year) {
  return new Date(year, month, 0).getDate();
}

// format dates
function formatDate(date,monSTR) {
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var ampm = hours >= 12 ? 'p.m. PST' : 'a.m. PST';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? '0'+minutes : minutes;
  var strTime = hours + ':' + minutes + ' ' + ampm;
  return strTime + " "+monSTR + ". " + date.getDate() + ", " + date.getFullYear();
}
var max_zoom_deg = 12;
var min_zoom_deg = 3;

if (screen.width <= 480){
  var ca_offset = 0;
  var zoom_deg = 6;
  var ca_lat = 38.589907;
  var ca_long = -121.483433;
} else {
  var ca_offset = 0.5;
  var zoom_deg = 7;
  var ca_lat = 39.530580;
  var ca_long = -122.193457;
}

// event listeners to center on any fire ------------------------------------------------------------------------
var LoadSidebarEvents = function(){
  var fireboxes = document.getElementsByClassName("fire-block");
  var currentblock,blockIDX;
  for (var fidx=0; fidx<fireboxes.length; fidx++){
    currentblock = fireboxes[fidx];
    // we need a closure to get event listeners incremented properly
    (function(_currentblock){
      _currentblock.addEventListener("click",function(){
        map.closePopup();
        $(".fire-block").removeClass("active");
        this.classList.add("active");
        blockIDX = _currentblock.id.split("block")[1];
        if (blockdata[blockIDX].Zoom){
          map.setView([blockdata[blockIDX].Lat,blockdata[blockIDX].Lon-ca_offset], blockdata[blockIDX].Zoom);
        } else {
          map.setView([blockdata[blockIDX].Lat,blockdata[blockIDX].Lon-ca_offset],9);
        }
        if (screen.width >= 480){
          markerArray[blockIDX].openPopup();
        }
      });
    })(currentblock);
  }
};

LoadSidebarEvents();

// build map ----------------------------------------------------------------------------------------------------

// restrict panning outside of California
var corner1 = L.latLng(44.006566, -133.289785),
corner2 = L.latLng(30.711049, -110.635977),
bounds = L.latLngBounds(corner1, corner2);

// initialize map with center position and zoom levels
var map = L.map("map-leaflet", {
  minZoom: min_zoom_deg,
  maxZoom: max_zoom_deg,
  maxBounds: bounds,
  zoomControl: false,
  // scrollWheelZoom: false,
  attributionControl: false
});

map.setView([blockdata[0].Lat,(blockdata[0].Lon-ca_offset)],blockdata[0].Zoom);

// initializing the svg layer
L.svg().addTo(map);

var Wikimedia = L.tileLayer('https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}{r}.png', {
	minZoom: 1,
	maxZoom: 19
}).addTo(map);

var attribution = L.control.attribution();
// attribution.setPrefix('');
attribution.addAttribution('Map data: <a href="https://wikimediafoundation.org/wiki/Maps_Terms_of_Use">Wikimedia</a>');
attribution.addTo(map);

if (screen.width <= 480){
  L.control.zoom({
       position:'topright'
  }).addTo(map);
} else {
  L.control.zoom({
       position:'bottomright'
  }).addTo(map);
}

// add fire icons to label fires ----------------------------------------------------------------
var TallMapIcon = L.Icon.extend({
    options: {
        iconSize:     [25,40],
        iconAnchor:   [10,10],
    }
});
var MapIcon = L.Icon.extend({
    options: {
        iconSize:     [25,25],
        iconAnchor:   [10,10],
    }
});
var activeIcon = new MapIcon({iconUrl: './assets/graphics/fireicon_burning_GR.png?'});
var containedIcon = new MapIcon({iconUrl: './assets/graphics/fireicon_contained_GR.png?'});

var markerArray = {};
blockdata.forEach(function(c,cIDX){
  html_str = `
      <div class="fire-name">${c.FireName}</div>
      <div class="fire-acreage"><span class="fire-info-type">Acreage:</span>${c.Acreage}</div>
      <div class="fire-containment"><span class="fire-info-type">Containment:</span>${c.Containment}</div>
      ${c.Deaths ? `<div class="fire-damage"><span class="fire-info-type">Deaths:</span>${c.Deaths}</div>` : ''}
      ${c.Injuries ? `<div class="fire-damage"><span class="fire-info-type">Injuries:</span>${c.Injuries}</div>` : ''}
      ${c.Damage ? `<div class="fire-damage"><span class="fire-info-type">Damage:</span>${c.Damage}</div>` : ''}
      <div class="fire-damage"><span class="fire-info-type">Fire began:</span>${c.StartDate}</div>
  `;
  if (c.Containment == "100%"){
    var tempmarker = L.marker([c.Lat, c.Lon], {icon: containedIcon}).addTo(map).bindPopup(html_str);
  } else {
    var tempmarker = L.marker([c.Lat, c.Lon], {icon: activeIcon}).addTo(map).bindPopup(html_str);
  }
  markerArray[cIDX] = tempmarker;
})
markerArray[0].openPopup();

// load NOAA data -----------------------------------------------------------------------------------------------
var fireDataURL = "https://extras.sfgate.com/editorial/wildfires/noaa.csv?";
var map_timer;

// read in fire data and create timers for re-loading it
setTimeout(function(){
  d3.csv(fireDataURL).then(function(fire_data){

    console.log("initial data load");

    // creating Lat/Lon objects that d3 is expecting
    fire_data.forEach(function(d,idx) {
      d.LatLng = new L.LatLng(d.latitude,
                  d.longitude);
    });

    clearTimeout(map_timer);
    drawMap(fire_data);
    d3.text('https://extras.sfgate.com/editorial/wildfires/noaatime.txt').then(function(text) {

      var d = new Date(text);
      var e = formatDate(d,text.split(" ")[2]);

      if (document.getElementById("updateID")) {
        document.getElementById("updateID").innerHTML = e;
      }
    });

    map_timer = setInterval(function() {

      console.log("at update interval");

      drawMap(fire_data);
      d3.text('https://extras.sfgate.com/editorial/wildfires/noaatime.txt', function(text) {

        var d = new Date(text);
        var e = formatDate(d,text.split(" ")[2]);

        if (document.getElementById("updateID")) {
          document.getElementById("updateID").innerHTML = e;
        }
      });

    }, timer5minutes);

  });
},50);

// draw map with dots on it ---------------------------------------------------------------------------------
var drawMap = function(fire_data) {

  console.log("drawing dots");

  d3.select("svg").selectAll("circle").remove();
  var svg = d3.select("#map-leaflet").select("svg");
  svg.attr("class","dotsSVG")
  var g = svg.append("g");

  var circles = g.selectAll("dotsSVG")
    .data(fire_data)
    .enter()
    .append("g");

  // adding circles to the map
  circles.append("circle")
    .attr("class",function(d) {
      return "dot fireDot";
    })
    .style("opacity", 0.2)
    .style("stroke","#8C0000")
    .style("opacity",1)
    .style("stroke-width","1")
    .style("fill-opacity",0.2)
    .style("fill","#8C0000")
    .attr("r", function(d) {
      if (screen.width <= 480) {
        return 5;
      } else {
        return 8;
      }
    });

  // function that zooms and pans the data when the map zooms and pans
  function update() {
    circles.attr("transform",
    function(d) {
      return "translate("+
        map.latLngToLayerPoint(d.LatLng).x +","+
        map.latLngToLayerPoint(d.LatLng).y +")";
      }
    )
  }

  map.on("viewreset", update);
  map.on("zoom",update);
  update();
}


// load NASA data -----------------------------------------------------------------------------------------------

var now = new Date();
console.log(now);
var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
var monthName = months[now.getMonth()];
var month = zeroFill(now.getMonth()+1,2);
var daynum = zeroFill(now.getDate(),2);

var daynumplus1 = +daynum+1;

function zeroFill( number, width ){
  width -= number.toString().length;
  if ( width > 0 ){
    return new Array( width + (/\./.test( number ) ? 2 : 1) ).join( '0' ) + number;
  }
  return number + ""; // always return a string
}

var nasa_timer;
var layers = [];
var layerstoggle = [];
var urlsList = [];
var daystyle = {"color": "#f25a14","fillOpacity": 0.4,"weight": 1};
var nowstyle = {"color": "#CC3400","fillOpacity": 0.7,"weight": 3};
var calendarCount = 0;

// fill in June data starting on the 23th (first day we began fire tracker)
var LoadJune = function(){
  console.log("loading june");
  return new Promise(function(ok,fail){
    if (+month >= 6){
      for (var idx=23; idx<31; idx++) {
        var nasaDataURL = "https://extras.sfgate.com/editorial/wildfires/overtime/2018-06-"+zeroFill(idx,2)+".sim.json";
        urlsList.push(nasaDataURL);
        addMapLayer(nasaDataURL,idx,6,+daynum,+month,calendarCount);
        calendarCount++;
      }
      ok();
    }
  });
}
// fill in data for months after June
var LoadJuly = function(){
  console.log("loading july");
  if (+month > 6){
    for (var monthIDX=7; monthIDX<(+month+1); monthIDX++){
      console.log(daysInMonth(+monthIDX,2018));
      if (monthIDX === +month){
        for (var dayIDX=1; dayIDX<(+daynum+1); dayIDX++){
          var nasaDataURL = "https://extras.sfgate.com/editorial/wildfires/overtime/2018-"+zeroFill(monthIDX,2)+"-"+zeroFill(dayIDX,2)+".sim.json?";
          urlsList.push(nasaDataURL);
          addMapLayer(nasaDataURL,dayIDX,monthIDX,+daynum,+month,calendarCount);

          calendarCount++;
        }
      } else {
        num_days_in_month = daysInMonth(monthIDX,2018);
        for (var dayIDX=1; dayIDX<(+daynum+1); dayIDX++){
          var nasaDataURL = "https://extras.sfgate.com/editorial/wildfires/overtime/2018-"+zeroFill(monthIDX,2)+"-"+zeroFill(dayIDX,2)+".sim.json?";
          urlsList.push(nasaDataURL);
          addMapLayer(nasaDataURL,dayIDX,monthIDX,+daynum,+month,calendarCount);
          calendarCount++;
        }
      }
    }
  }
}

LoadJune().then(()=>LoadJuly());

function addMapLayer(nasaDataURL,day,month,currentday,currentmonth,calendarCount){
  if (month == currentmonth && day == currentday){
    d3.json(nasaDataURL).then(function(nasa){
      layers[calendarCount] = L.geoJSON(nasa,{style: nowstyle}).addTo(map);
      layerstoggle[calendarCount] = 1;
    });
  } else {
    d3.json(nasaDataURL).then(function(nasa){
      layers[calendarCount] = L.geoJSON(nasa,{style: daystyle}).addTo(map);
      layerstoggle[calendarCount] = 1;
    });
  }
}

// turning these calendar buttons into actual buttons
var calendarButtons = function(){
  var dayB;
  var calendar_buttons = document.getElementsByClassName("clickablerect");
  for (var t = 0; t <calendar_buttons.length; t++){
    dayB = calendar_buttons[t];
    (function (dayB) {
      dayB.addEventListener('click', function(){
        var IDX = +dayB.id.split("date")[1];
        if (layerstoggle[IDX] == 1) {
          map.removeLayer(layers[IDX]);
          layerstoggle[IDX] = 0;
          dayB.classList.remove("active");
        } else {
          if (IDX === (+calendarCount-1)){
            d3.json(urlsList[IDX]).then(function(nasa){
              setTimeout(function(){
                layers[IDX] = L.geoJSON(nasa,{style: nowstyle}).addTo(map);
              },100)
            });
            layerstoggle[IDX] = 1;
          } else {
            d3.json(urlsList[IDX]).then(function(nasa){
              layers[IDX] = L.geoJSON(nasa,{style: daystyle}).addTo(map);
            });
            layerstoggle[IDX] = 1;
          }
          dayB.classList.add("active");
        }
      });
    })(dayB);
  }
};


// air quality layer ----------------------------------------------------------------------
var pollution_toggle = 0;
var pollutionLayer, contourLayer;

// adding and removing the air quality layer on button click
document.getElementById("airquality").addEventListener("click",function() {
  // remove air quality layer
  if (pollution_toggle == 1) {
    map.removeLayer(pollutionLayer);
    map.removeLayer(contourLayer);
    pollution_toggle = 0;
    this.classList.remove("active");
    document.getElementById("airquallegend").classList.remove("active");
  // add air quality layer
  } else {
    this.classList.add("active");
    // zoom out so that reader can actually see the data they requested
    if (map.getZoom() > 10) {
      map.setZoom(10);
    }
    // obtain most recent dataset based on file on server
    d3.text('https://extras.sfgate.com/editorial/wildfires/airquality_date.txt?').then(function(text) {
      var urlpathPollution = "http://berkeleyearth.lbl.gov/air-quality/maps/hour/"+text.substring(0,6)+"/"+text+"/tiles/health/{z}/{x}/{y}.png";
      var urlpathContours = "http://berkeleyearth.lbl.gov/air-quality/maps/hour/"+text.substring(0,6)+"/"+text+"/tiles/contour/{z}/{x}/{y}.png";

      // add layer with colors
      pollutionLayer = L.tileLayer(urlpathPollution,{transparent: true,opacity: 0.7})
      pollutionLayer.addTo(map);
      // add layer with contour lines
      contourLayer = L.tileLayer(urlpathContours,{transparent: true,opacity: 0.7})
      contourLayer.addTo(map);
      // now we are showing the air quality layer
      pollution_toggle = 1;

      document.getElementById("airquallegend").classList.add("active");

      var airSTR = text.substring(4,6)+"/"+text.substring(6,8)+"/"+text.substring(0,4)+" "+text.substring(8,10)+":00 UTC";
      var date = new Date(airSTR);
      var PDTdate = date.toString();
      var eAIR = formatDate(date,PDTdate.split(" ")[1]);

      // fill in when data was last updated
      if (document.getElementById("airDate")) {
        document.getElementById("airDate").innerHTML = "Air quality data updated on " + eAIR;
      }

    });
  }
});

// pop up information about the data ---------------------------------------------------------

// show NOAA data
document.getElementById("popup-noaa-explanation").addEventListener("click",function() {
  document.getElementById("aboutthedata-box").classList.add("active");
  document.getElementById("aboutthedata-overlay").classList.add("active");
  document.getElementById("about-noaa").classList.remove("hide");
  document.getElementById("about-airquality").classList.add("hide");
  document.getElementById("about-nasa").classList.add("hide");
});

// show air quality data
document.getElementById("popup-airquality-explanation").addEventListener("click",function() {
  document.getElementById("aboutthedata-box").classList.add("active");
  document.getElementById("aboutthedata-overlay").classList.add("active");
  document.getElementById("about-airquality").classList.remove("hide");
  document.getElementById("about-noaa").classList.add("hide");
  document.getElementById("about-nasa").classList.add("hide");
});

// show NASA data
document.getElementById("popup-nasa-explanation").addEventListener("click",function() {
  document.getElementById("aboutthedata-box").classList.add("active");
  document.getElementById("aboutthedata-overlay").classList.add("active");
  document.getElementById("about-nasa").classList.remove("hide");
  document.getElementById("about-noaa").classList.add("hide");
  document.getElementById("about-airquality").classList.add("hide");
});

// hide the about the data box
document.getElementById("close-data-box").addEventListener("click",function() {
  document.getElementById("aboutthedata-box").classList.remove("active");
  document.getElementById("aboutthedata-overlay").classList.remove("active");
});

//----------------------------------------------------------------------------------
// functions to draw calendars ------------------------------------
//----------------------------------------------------------------------------------

var drawCalendarV2 = function(month,daynum,chartID) {

  console.log("drawing calendar");

  return new Promise(function(ok,fail){

    var no_months = +now.getMonth()+1-5;

    var width = 200*no_months,
          height = 165,
          cellSize = 25; // cell size

    var no_months_in_a_row = no_months;//Math.floor(width / (cellSize * 7 + 50));
    var shift_up = cellSize * 2.2;

    var day = d3.timeFormat("%w"), // day of the week
        day_of_month = d3.timeFormat("%e") // day of the month
        day_of_year = d3.timeFormat("%j")
        week = d3.timeFormat("%U"), // week number of the year
        mon = d3.timeFormat("%m"), // month number
        year = d3.timeFormat("%Y"),
        percent = d3.format(".1%"),
        format = d3.timeFormat("%Y-%m-%d");

    var color = d3.scaleQuantize()
        .domain([0, 10])
        .range(d3.range(11).map(function(d) { return "q" + d + "-11"; }));

    var minDate = new Date("2017-06-01");
    var maxDate = new Date(["2017-"+zeroFill(+month+1,2)+"-01"]);
    // var maxDate = new Date(["2017-"+month+"-"+daynum]);

    var svg = d3.select(chartID).selectAll("svg")
          // .data(d3.range(minDate,maxDate)) //years included in the viz
          .data(d3.range(2018,2019)) //years included in the viz
        .enter().append("svg")
          .attr("width", width)
          .attr("height", height)
        .append("g")

    var rect = svg.selectAll("g")
        .data(function(d) {
          return d3.timeDays(minDate,maxDate);
          // return d3.timeDays(new Date(d, 0, 1), new Date(d + 1, 0, 1));
        })
      .enter().append("g");

    rect.append("rect")
        .attr("class", function(d){
          if (d.getMonth() === 5 && d.getDate() < 23){
            return "daybox nodatabox active";
          } else if (d.getMonth() === now.getMonth() && d.getDate() === now.getDate()){
            return "daybox nowbox clickable active clickablerect";
          } else if (d.getMonth() === now.getMonth() && d.getDate() > now.getDate()){
            return "daybox nodatabox active";
          } else {
            return "daybox clickable active clickablerect";
          }
        })
        .attr("id",function(d,dIDX){
          return "date"+(dIDX-22);
          // return "date"+(+d.getMonth()+1)+d.getDate();
        })
        .attr("width", cellSize)
        .attr("height", cellSize)
        .attr("x", function(d) {
          var month_padding = 1.2 * cellSize*7 * (mon(d)-6)+2;
          return day(d) * cellSize + month_padding;
        })
        .attr("y", function(d) {
          var week_diff = week(d) - week(new Date(year(d), mon(d), 1) );
          var row_level = 1;//Math.ceil((mon(d)-5) / (no_months_in_a_row));
          return (week_diff*cellSize) + row_level*cellSize*8 - cellSize/2 - shift_up;
        })
        .attr("rx","5")
        .attr("ry","5")
        .attr("fill","#F2A500")
        .datum(format);

    rect.append("text")
        .attr("class", function(d){
          if (d.getMonth() === 5 && d.getDate() < 23){
            return "textclass";
          } else if (d.getMonth() === now.getMonth() && d.getDate() === now.getDate()){
            return "textclass clickable";
          } else if (d.getMonth() === now.getMonth() && d.getDate() > now.getDate()){
            return "textclass";
          } else {
            return "textclass clickable";
          }
        })
        .text(function(d) {
          return d.getDate();
        })
        .attr("x", function(d) {
          var month_padding = 1.2 * cellSize*7 * (mon(d)-6)+2;
          return day(d) * cellSize + month_padding+12;
        })
        .attr("y", function(d) {
          var week_diff = week(d) - week(new Date(year(d), mon(d), 1) );
          var row_level = 1;//Math.ceil((mon(d)-5) / (no_months_in_a_row));
          return (week_diff*cellSize) + row_level*cellSize*8 - shift_up+5;
        })
        .attr("text-anchor","middle");

    function monthTitle (t0) {
        return t0.toLocaleString("en-us", { month: "long" });
      }
    var month_titles = svg.selectAll(".month-title")  // Jan, Feb, Mar and the whatnot
          .data(function(d) {
            var maxMonth = +now.getMonth()+1;// CHANGE BACK TO +1 !!!!!
            return d3.timeMonths(new Date(d, 5, 1), new Date(d, maxMonth, 1)); })
        .enter().append("text")
          .text(monthTitle)
          .attr("x", function(d, i) {
            var month_padding = 1.2 * cellSize*7* (mon(d)-6);
            return month_padding;
          })
          .attr("y", 10)
          .attr("class", "month-title")
          .attr("d", monthTitle);

    ok();
  });
}

// draw calendar, then set event listeners on calendar days
drawCalendarV2(month,daynumplus1,"#calendar").then(()=>calendarButtons());

// toggle calendar
$("#calendar-toggle").click(function() {
  $("#calendar").toggle();
})

// expand map on mobile
var expand_toggle = 0;
document.getElementById("map-expand").addEventListener("click",function(e){
  if (expand_toggle == 1){
    document.getElementById("map-leaflet").classList.remove("big-leaflet-map");
    document.getElementById("map-overlay").classList.remove("big-leaflet-map");
    this.classList.remove("big-leaflet-map");
    expand_toggle = 0;
  } else {
    document.getElementById("map-leaflet").classList.add("big-leaflet-map");
    document.getElementById("map-overlay").classList.add("big-leaflet-map");
    this.classList.add("big-leaflet-map");
    expand_toggle = 1;
  }
  $('.fa').toggleClass('fa-expand fa-compress');
  setTimeout(function(){ map.invalidateSize()}, 500);
})

// event listener to expland sidebar fire blocks
document.getElementById("list-of-fires").addEventListener("click",function(e){
  if (e.target && e.target.matches("div.fire-name")){
    var targetId = e.target.classList[1].split("fire")[1];
    $(".firebody"+targetId).toggleClass("active inactive");
    $(".fire"+targetId).find("i").toggleClass("fa-angle-double-right fa-angle-double-down");
  }
});
