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

// generate random string
function makeid() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 5; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

// format dates
function formatDate(date,monSTR) {
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var ampm = hours >= 12 ? 'p.m. PDT' : 'a.m. PDT';
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

// code for testing end date ----------------------------
// var nownow = new Date('2018-11-18T08:00:00Z');

// build map ----------------------------------------------------------------------------------------------------

// restrict panning outside of California
var corner1 = L.latLng(52.131066, -152.034853),
corner2 = L.latLng(12.117664, -54.181059),
bounds = L.latLngBounds(corner1, corner2);

// initialize map with center position and zoom levels
var map = L.map("map-leaflet", {
  minZoom: min_zoom_deg,
  maxZoom: max_zoom_deg,
  maxBounds: bounds,
  zoomControl: false,
  attributionControl: false
});

if (+blockdata[0].Zoom > 10){
  ca_offset_new = ca_offset/(+blockdata[0].Zoom-9);
} else {
  ca_offset_new = ca_offset;
}
map.setView([blockdata[0].Lat,(blockdata[0].Lon-ca_offset_new)],blockdata[0].Zoom);

// initializing the svg layer
L.svg().addTo(map);

var Wikimedia = L.tileLayer('https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}{r}.png', {
	minZoom: 1,
	maxZoom: 19
}).addTo(map);

var attribution = L.control.attribution();
attribution.addAttribution('Map data: <a href="https://wikimediafoundation.org/wiki/Maps_Terms_of_Use">Wikimedia</a>');
attribution.addTo(map);

if (screen.width <= 480){
  L.control.scale({position:"bottomleft"}).addTo(map);
  L.control.zoom({
       position:'bottomleft'
  }).addTo(map);
} else {
  L.control.scale({position:"bottomright"}).addTo(map);
  L.control.zoom({
       position:'bottomright'
  }).addTo(map);
}

// add fire icons to label fires ----------------------------------------------------------------
var smallMapIcon = L.Icon.extend({
    options: {
        iconSize:     [25,25],
        iconAnchor:   [15,10],
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
var closureIcon = new smallMapIcon({iconUrl: './assets/graphics/warning_icon.png'});

// load sidebar --------------------------------------------------------------------------------
var overlayTimer;
var markerArray = {};
var markersGroup;

var loadSidebar = function(){
  console.log("loading sidebar");

  var calfireDataURL = "https://extras.sfgate.com/editorial/sheetsdata/firetracker.json?"+makeid();
  var overlayString=``;

  document.getElementById("list-of-fires").innerHTML = "";
  return new Promise(function(ok,fail){

    d3.json(calfireDataURL).then(function(caldata){

      blockdata = caldata;
      overlayString = ``;

      caldata.forEach(function(c,cIDX){
        // center map on top fire
        if (cIDX == 0){
          map.setView([c.Lat,c.Lon-ca_offset], c.Zoom);
        }
        overlayString += `
          ${(cIDX === 0) ? `<div class="fire-block active" id="block${cIDX}">` : `<div class="fire-block" id="block${cIDX}">`}

            ${(c.Containment === "100%") ? `<div class="fire-name fire${cIDX}"><img class="fire-name-image" src="./assets/graphics/fireicon_contained_GR.png"></img>${c.FireName}<i class="fa fa-angle-double-right"></i></div>` : `<div class="fire-name fire${cIDX}"><img class="fire-name-image" src="./assets/graphics/fireicon_burning_GR.png"></img>${c.FireName}<i class="fa fa-angle-double-right"></i></div>`}

            <div class="fire-block-body firebody${cIDX}">

              ${(c.Link) ? `<div class="story-link"><a href="${c.Link}" target="_blank"><i class="fa fa-external-link"></i>${c.LinkHed}</a></div>` : ``}

              <div class="fire-desc">${c.Description}</div>

              <div class="fire-acreage"><span class="fire-info-type">Acreage:</span>${c.Acreage}</div>

              <div class="fire-containment"><span class="fire-info-type">Containment:</span>${c.Containment}</div>

              ${c.Deaths ? `<div class="fire-damage"><span class="fire-info-type">Deaths:</span>${c.Deaths}</div>` : ''}

              ${c.Injuries ? `<div class="fire-damage"><span class="fire-info-type">Injuries:</span>${c.Injuries}</div>` : ''}

              ${c.Damage ? `<div class="fire-damage"><span class="fire-info-type">Damage:</span>${c.Damage}</div>` : ''}

              <div class="fire-damage"><span class="fire-info-type">Fire began:</span>${c.StartDate}</div>

              <div class="fire-datasource"><span class="fire-info-type">Source:</span><a href="${c.Source}?" target="_blank">${c.Agency}</a></div>

            </div>
          </div>
        `;
      })
      document.getElementById("list-of-fires").innerHTML = overlayString;
      document.getElementById("spreadsheetUpdate").innerHTML = caldata[0]["Update"];

      if (markersGroup != null){
        map.removeLayer(markersGroup);
      }
      markerArray = {};
      blockdata.forEach(function(c,cIDX){
        html_str = `
            <div class="fire-name">${c.FireName}</div>
            <div class="fire-acreage"><span class="fire-info-type">Acreage:</span>${c.Acreage}</div>
            <div class="fire-containment"><span class="fire-info-type">Containment:</span>${c.Containment}</div>
            ${c.Deaths ? `<div class="fire-damage"><span class="fire-info-type">Deaths:</span>${c.Deaths}</div>` : ''}
            ${c.Injuries ? `<div class="fire-damage"><span class="fire-info-type">Injuries:</span>${c.Injuries}</div>` : ''}
            ${c.Damage ? `<div class="fire-damage"><span class="fire-info-type">Damage:</span>${c.Damage}</div>` : ''}
            <div class="fire-damage"><span class="fire-info-type">Fire began:</span>${c.StartDate}</div>
            <div class="calendar-instructions">Click on the calendar to view fire perimeters for past months, starting with the date above.</div>
        `;
        if (c.Containment == "100%"){
          var tempmarker = L.marker([c.Lat, c.Lon], {icon: containedIcon}).addTo(map).bindPopup(html_str);
        } else {
          var tempmarker = L.marker([c.Lat, c.Lon], {icon: activeIcon}).addTo(map).bindPopup(html_str);
        }
        markerArray[cIDX] = tempmarker;
      })
      markersGroup = L.layerGroup(markerArray);
      markerArray[0].openPopup();

      ok();
    });
  });
}

// make sure that sidebar elements exist before putting event listeners on them
loadSidebar().then(()=>LoadSidebarEvents());
overlayTimer = setInterval(function() {
  console.log("reloading the sidebar");
  loadSidebar();
}, timer5minutes);

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
// var monthName = months[nownow.getMonth()];
// var month = zeroFill(nownow.getMonth()+1,2);
// var daynum = zeroFill(nownow.getDate(),2);
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
var daystyle = {"color": "#f25a14","fillOpacity": 0.2,"weight": 1,"opacity":0.4};
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
        layerstoggle[calendarCount] = 0;
        // addMapLayer(nasaDataURL,idx,6,+daynum,+month,calendarCount);
        calendarCount++;
      }
      ok();
    }
  });
}
// fill in data for months after June
// var LoadOtherMonths = function(){
//   console.log("loading july");
//   if (+month > 6){
//     for (var monthIDX=7; monthIDX<(+month+1); monthIDX++){
//       console.log(daysInMonth(+monthIDX,2018));
//       if (monthIDX === +month){
//         for (var dayIDX=1; dayIDX<(+daynum+1); dayIDX++){
//           var nasaDataURL = "https://extras.sfgate.com/editorial/wildfires/overtime/2018-"+zeroFill(monthIDX,2)+"-"+zeroFill(dayIDX,2)+".sim.json?";
//           urlsList.push(nasaDataURL);
//           addMapLayer(nasaDataURL,dayIDX,monthIDX,+daynum,+month,calendarCount);
//           calendarCount++;
//         }
//       } else {
//         num_days_in_month = daysInMonth(monthIDX,2018);
//         for (var dayIDX=1; dayIDX<(+daysInMonth(+monthIDX,2018)+1); dayIDX++){
//           var nasaDataURL = "https://extras.sfgate.com/editorial/wildfires/overtime/2018-"+zeroFill(monthIDX,2)+"-"+zeroFill(dayIDX,2)+".sim.json?";
//           urlsList.push(nasaDataURL);
//           addMapLayer(nasaDataURL,dayIDX,monthIDX,+daynum,+month,calendarCount);
//           calendarCount++;
//         }
//       }
//     }
//   }
// }

var AddMonthURLs = function(monthIDX){
  return new Promise(function(ok,fail){
    num_days_in_month = daysInMonth(monthIDX,2018);
    for (var dayIDX=1; dayIDX<(+daysInMonth(+monthIDX,2018)+1); dayIDX++){
      var nasaDataURL = "https://extras.sfgate.com/editorial/wildfires/overtime/2018-"+zeroFill(monthIDX,2)+"-"+zeroFill(dayIDX,2)+".sim.json?";
      urlsList.push(nasaDataURL);
      layerstoggle[calendarCount] = 0;
      // addMapLayer(nasaDataURL,dayIDX,monthIDX,+daynum,+month,calendarCount);
      calendarCount++;
    }
    ok();
  });
}

var LoadFullMonth = function(monthIDX){
  return new Promise(function(ok,fail){
    num_days_in_month = daysInMonth(monthIDX,2018);
    for (var dayIDX=1; dayIDX<(+daysInMonth(+monthIDX,2018)+1); dayIDX++){
      var nasaDataURL = "https://extras.sfgate.com/editorial/wildfires/overtime/2018-"+zeroFill(monthIDX,2)+"-"+zeroFill(dayIDX,2)+".sim.json?";
      urlsList.push(nasaDataURL);
      addMapLayer(nasaDataURL,dayIDX,monthIDX,+daynum,+month,calendarCount);
      calendarCount++;
    }
    ok();
  });
}

var LoadCurrentMonth = function(monthIDX){
  console.log("loading current month");
  for (var dayIDX=1; dayIDX<(+daynum+1); dayIDX++){
    var nasaDataURL = "https://extras.sfgate.com/editorial/wildfires/overtime/2018-"+zeroFill(monthIDX,2)+"-"+zeroFill(dayIDX,2)+".sim.json?";
    urlsList.push(nasaDataURL);
    addMapLayer(nasaDataURL,dayIDX,monthIDX,+daynum,+month,calendarCount);
    calendarCount++;
  }
}

function range(start, end) {
    if(start === end) return [start];
    return [start, ...range(start + 1, end)];
}

var hiddenIndices = range(6,(now.getMonth()-1));
var showIndices = range(now.getMonth(),(now.getMonth()+1));
// var hiddenIndices = range(6,(nownow.getMonth()-1));
// var showIndices = range(nownow.getMonth(),(nownow.getMonth()+1));

if (hiddenIndices === 6){
  LoadJune().then(()=>LoadFullMonth(now.getMonth())).then(()=>LoadCurrentMonth(now.getMonth()+1));
} else {
  var promises = [];
  hiddenIndices.forEach(function(ind){
    if (ind !== 6){
      promises.push(AddMonthURLs(ind));
    } else {
      promises.push(LoadJune());
    }
  });
  Promise.all(promises).then(()=>LoadFullMonth(now.getMonth())).then(()=>LoadCurrentMonth(now.getMonth()+1));
}

// adding PCT closures
var pathstyle = {"color":"#333","weight":5, "dashArray":"20,15"};
var pctPath = L.geoJSON(pct,{style: pathstyle}).addTo(map);
pctPath.bindPopup("Pacific Crest Trail Closure");
L.marker([38.495835,-119.766012], {icon: closureIcon}).addTo(map).bindPopup("Pacific Crest Trail Closure");

function addMapLayer(nasaDataURL,day,month,currentday,currentmonth,calendarCount){
  if (month == currentmonth && day == currentday){
    d3.json(nasaDataURL).then(function(nasa){
      setTimeout(function(){
        layers[calendarCount] = L.geoJSON(nasa,{style: nowstyle}).addTo(map);
      },100)
      layerstoggle[calendarCount] = 1;
    });
  } else {
    d3.json(nasaDataURL).then(function(nasa){
      layers[calendarCount] = L.geoJSON(nasa,{style: daystyle}).addTo(map);
      layerstoggle[calendarCount] = 1;
    });
  }
}


// event listener to toggle layers via calendar buttons, aka event delegation is awesome
var calendarButtons = function(){
  document.getElementById("calendar").addEventListener("click",function(e){
    if (e.target && (Array.from(e.target.classList).indexOf("clickablerect") > -1)){
      var IDX = +e.target.id.split("date")[1];
      if (layerstoggle[IDX] == 1) {
        map.removeLayer(layers[IDX]);
        layerstoggle[IDX] = 0;
        e.target.classList.remove("active");
      } else {
        if (IDX === (+calendarCount-1)){
          d3.json(urlsList[IDX]).then(function(nasa){
            layers[IDX] = L.geoJSON(nasa,{style: nowstyle}).addTo(map);
          });
          layerstoggle[IDX] = 1;
        } else {
          d3.json(urlsList[IDX]).then(function(nasa){
            layers[IDX] = L.geoJSON(nasa,{style: daystyle}).addTo(map);
          });
          layerstoggle[IDX] = 1;
        }
        e.target.classList.add("active");
      }
    }
  });
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

    // code for testing end date ----------------------------
    // var nownow = new Date('2018-11-18T08:00:00Z');
    // now = new Date('2018-11-18T08:00:00Z');
    // month = +now.getMonth()+1;
    // console.log(month);
    // code for testing end date ----------------------------

    // first day of tracker
    var minDate = new Date("2018-06-01");
    // last day of tracker
    // number of months (+1 is because JS is weird, -5 is because we start in June)
    if (+now.getFullYear() > 2018 || month === 12){
      var maxDate = new Date(["2019-01-01"]);
      var no_months = 7;
      var maxMonth = 12;
    } else {
      var maxDate = new Date(["2018-"+zeroFill(+month+1,2)+"-01"]);
      var no_months = +now.getMonth()+1-5;
      var maxMonth = +now.getMonth()+1;
    }

    var width = 210*no_months,
          height = 180,
          cellSize = 25; // cell size

    // we are doing a single row
    var no_months_in_a_row = no_months;
    // we need to shift the calendar to leave room for labels
    var shift_down = 15;

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

    var svg = d3.select(chartID).selectAll("svg")
          .data(d3.range(2018,2019)) //years included in the viz
        .enter().append("svg")
          .attr("width", width)
          .attr("height", height)
        .append("g")

    var rect = svg.selectAll("g")
        .data(function(d) {
          return d3.timeDays(minDate,maxDate);
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
          } else if (d.getMonth() === now.getMonth() || d.getMonth() === (now.getMonth()-1)){
            return "daybox clickable active clickablerect";
          } else {
            return "daybox clickable clickablerect";
          }
        })
        .attr("id",function(d,dIDX){
          return "date"+(dIDX-22); // dates start on may 23
        })
        .attr("width", cellSize)
        .attr("height", cellSize)
        .attr("x", function(d) {
          var month_padding = 1.2 * cellSize*7 * (mon(d)-6)+2;
          return day(d) * cellSize + month_padding;
        })
        .attr("y", function(d) {
          var week_diff = week(d) - week(new Date(year(d), mon(d)-1, 1) );
          var row_level = 1;
          return ((week_diff * cellSize)+7+shift_down);
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
          var week_diff = week(d) - week(new Date(year(d), mon(d)-1, 1) )+1;
          var row_level = 1;
          return ((week_diff * cellSize) + shift_down);
        })
        .attr("text-anchor","middle");

    function monthTitle (t0) {
        return t0.toLocaleString("en-us", { month: "long" });
      }
    var month_titles = svg.selectAll(".month-title")  // Jan, Feb, Mar and the whatnot
          .data(function(d) {
            return d3.timeMonths(new Date(d, 5, 1), new Date(d, maxMonth, 1)); })
        .enter().append("text")
          .text(monthTitle)
          .attr("x", function(d, i) {
            var month_padding = 1.2 * cellSize*7* (mon(d)-6) + 40;
            return month_padding;
          })
          .attr("y", 10)
          .attr("class", "month-title")
          .attr("text-anchor","middle")
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

// event listener to expand sidebar fire blocks, aka event delegation is awesome
function LoadSidebarEvents(){
  console.log("loading sidebar events");
  document.getElementById("list-of-fires").addEventListener("click",function(e){
    if (e.target){
      var el = e.target;
      while (el && Array.from(el.classList).indexOf("fire-block") === -1 ) {
         el = el.parentNode;
      }
      var targetId = el.id.split("block")[1];
    }

    if (targetId){
      $(".firebody"+targetId).toggleClass("active inactive");
      $(".fire"+targetId).find("i").toggleClass("fa-angle-double-right fa-angle-double-down");

      map.closePopup();
      $(".fire-block").removeClass("active");
      document.getElementById("block"+targetId).classList.add("active");
      if (+blockdata[targetId].Zoom > 10){
        ca_offset_new = ca_offset/(+blockdata[targetId].Zoom-9);
      } else {
        ca_offset_new = ca_offset;
      }
      if (blockdata[targetId].Zoom){
        map.setView([blockdata[targetId].Lat,blockdata[targetId].Lon-ca_offset_new], blockdata[targetId].Zoom);
      } else {
        map.setView([blockdata[targetId].Lat,blockdata[targetId].Lon-ca_offset],9);
      }
      if (screen.width >= 480){
        markerArray[targetId].openPopup();
      }
    }

  });
}

// RSS parser
var Feed = require('./lib/rss');

Feed.load('https://extras.sfgate.com/editorial/wildfires/stories.xml', function(err, rss){

  var items = rss.items.splice(0,3);

  items.forEach(function(item){

    // Get title
    var title = item.title;
    // Get link
    var link = item.link;

    // check if article contains image
    if(item.media){

      // Get first image src
      var imageURL = item.media.content[0].url[0];
      var lastSlash = imageURL.lastIndexOf("/");
      imageURL = imageURL.replace(imageURL.substring(lastSlash+1), "premium_gallery_landscape.jpg");

      // push each story html
      var html = '<div class="story "><a target="_blank" href="'+link+'"><img src="'+imageURL+'"></a><div class="story-info"><h3><a target="_blank" href="'+link+'"><span class="latest-title">'+title+'</span></a></h3></div></div>';
      $('.story.loading').remove();
      $('.stories').append(html);

    }else{
      var html = '<div class="story no-img"><div class="story-info"><h3><a target="_blank" href="'+link+'"><span class="latest-title">'+title+'</span></a></h3></div></div>';
      $('.story.loading').remove();
      $('.stories').append(html);
    }

  });

});


// Close recirc and restore map height
document.getElementById("closer").addEventListener("click",function() {
  $('.latest-news').css('display', 'none');
  $('#map-leaflet').css('height','100%');
  $('#map-leaflet').css('top','0');
  $('.map-overlay').css('top','20px');
});
