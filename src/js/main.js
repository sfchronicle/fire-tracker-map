require("./lib/social"); //Do not delete
var d3 = require('d3');
require("./lib/leaflet-mapbox-gl");

// format numbers
var formatthousands = d3.format(",");

var timer5minutes = 600000;
var timer30minutes = timer5minutes*6;

var maxWidth = 1000;
var windowWidth = $(window).width();

// format dates
function formatDate(date,monSTR) {
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var ampm = hours >= 12 ? 'p.m. PST' : 'a.m. PST';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? '0'+minutes : minutes;
  var strTime = hours + ':' + minutes + ' ' + ampm;
  return monSTR + ". " + date.getDate() + ", " + date.getFullYear() + ", at " + strTime;
}
var max_zoom_deg = 10;
var min_zoom_deg = 4;

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

// var offset_top = 900;
// var bottomOffset = 200;

// load fire scrollbar------------------------------------------------------------------------------------------
// var calfireDataURL = "https://extras.sfgate.com/editorial/sheetsdata/firetracker.json";
// var overlayString=``;
// var overlayTimer;
// var blockdata;
//
// function loadSidebar(){
//   console.log("are we getting here");
//   d3.json(calfireDataURL).then(function(caldata){
//     blockdata = caldata;
//     caldata.forEach(function(c,cIDX){
//       // center map on top fire
//       if (cIDX == 0){
//         map.setView([c.Lat,c.Lon], c.Zoom);
//       }
//       overlayString += `
//         ${(cIDX == 0) ? `<div class="fire-block active" id="block${cIDX}">` : `<div class="fire-block" id="block${cIDX}">`}
//           <div class="fire-name">${c.FireName}</div>
//           <div class="fire-desc">${c.Description}</div>
//           <div class="fire-acreage"><span class="fire-info-type">Acreage:</span>${c.Acreage}</div>
//           <div class="fire-containment"><span class="fire-info-type">Containment:</span>${c.Containment}</div>
//           ${c.Damage ? `<div class="fire-damage"><span class="fire-info-type">Damage:</span>${c.Damage}</div>` : ''}
//           <div class="fire-damage"><span class="fire-info-type">Fire began:</span>${c.StartDate}</div>
//         </div>
//       `;
//     })
//     document.getElementById("list-of-fires").innerHTML = overlayString;
//   });

  // event listeners to center on any fire ------------------------------------------------------------------------

  // I am doing a hack here to make sure that the sidebar exists before I set event listeners on it
  // setTimeout(function(){
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
          map.setView([blockdata[blockIDX].Lat,blockdata[blockIDX].Lon-ca_offset], blockdata[blockIDX].Zoom);
          if (screen.width >= 480){
            markerArray[blockIDX].openPopup();
          }
        });
      })(currentblock);
    }
  // },0);
// }

// loadSidebar();
// overlayTimer = setInterval(function() {
//   loadSidebar();
// }, timer30minutes);

// build map ----------------------------------------------------------------------------------------------------

// initialize map with center position and zoom levels
var map = L.map("map-leaflet", {
  minZoom: min_zoom_deg,
  maxZoom: max_zoom_deg,
  zoomControl: false,
  // scrollWheelZoom: false,
  attributionControl: false
});

// map.setView([blockdata[0].Lat,blockdata[0].Lon], blockdata[0].Zoom);
map.setView([ca_lat,(ca_long-ca_offset)],zoom_deg);

// initializing the svg layer
L.svg().addTo(map);

var gl = L.mapboxGL({
    accessToken: 'pk.eyJ1IjoiZW1ybyIsImEiOiJjaXl2dXUzMGQwMDdsMzJuM2s1Nmx1M29yIn0._KtME1k8LIhloMyhMvvCDA',
    style: 'mapbox://styles/emro/cjbib4t5e089k2sm7j3xygp50'
}).addTo(map);

var attribution = L.control.attribution();
attribution.setPrefix('');
attribution.addAttribution('Map data: <a href="http://openstreetmap.org/copyright" target="_blank">© OpenStreetMap</a> <a href="https://www.mapbox.com/about/maps/" target="_blank">© Mapbox</a> | <a href="https://www.mapbox.com/map-feedback/" target="_blank" class="mapbox-improve-map">Improve this map</a>');
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
var fireIcon = new TallMapIcon({iconUrl: './assets/graphics/fire_icon2.png?'});

var markerArray = {};
blockdata.forEach(function(c,cIDX){
  html_str = `
      <div class="fire-name">${c.FireName}</div>
      <div class="fire-acreage"><span class="fire-info-type">Acreage:</span>${c.Acreage}</div>
      <div class="fire-containment"><span class="fire-info-type">Containment:</span>${c.Containment}</div>
      ${c.Damage ? `<div class="fire-damage"><span class="fire-info-type">Damage:</span>${c.Damage}</div>` : ''}
      <div class="fire-damage"><span class="fire-info-type">Fire began:</span>${c.StartDate}</div>
  `;
  var tempmarker = L.marker([c.Lat, c.Lon], {icon: fireIcon}).addTo(map).bindPopup(html_str);
  markerArray[cIDX] = tempmarker;
})

// load NOAA data -----------------------------------------------------------------------------------------------
var fireDataURL = "https://extras.sfgate.com/editorial/wildfires/noaa.csv?";
var map_timer;

// read in fire data and create timers for re-loading it
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

function zeroFill( number, width ){
  width -= number.toString().length;
  if ( width > 0 )
  {
    return new Array( width + (/\./.test( number ) ? 2 : 1) ).join( '0' ) + number;
  }
  return number + ""; // always return a string
}
for (var idx=23; idx<(+daynum+1); idx++) {

  var nasaDataURL = "https://extras.sfgate.com/editorial/wildfires/overtime/2018-"+month+"-"+zeroFill(idx,2)+".sim.json";
  var nasa_timer;
  var layers = [];
  var layerstoggle = [];
  var daystyle = {"color": "#F2A500","fill-opacity": 0.4,"weight": 3};
  var nowstyle = {"color": "#D94100","fill-opacity": 0.8,"weight": 3};

  if (idx == +daynum){
    d3.json(nasaDataURL).then(function(nasa){
      layers.push(L.geoJSON(nasa,{style: nowstyle}).addTo(map));
      layerstoggle.push(1);
    });
  } else {
    d3.json(nasaDataURL).then(function(nasa){
      layers.push(L.geoJSON(nasa,{style: daystyle}).addTo(map));
      layerstoggle.push(1);
    });
  }

  var buttonSTR = "<span class='monthname'>"+monthName+"</span>";
  for (var i=23; i<(+daynum+1); i++){
    if (i == +daynum) {
      // when we have a variable number of days, use this ---->
      buttonSTR += "<div class='now day"+i+" button clickbutton nowbutton active' id='day"+i+"button'>Today</div>";
    } else {
      buttonSTR += "<div class='day day"+i+" button clickbutton calendarbutton active' id='day"+i+"button'>"+i+"</div>";
    }
  }
  document.getElementById("button-collection").innerHTML = buttonSTR;

  // turning these calendar buttons into actual buttons
  var dayB;
  for (var t = 23; t < (+daynum+1); t++){
    dayB = document.getElementById("day"+t+"button");
    (function (dayB) {
      dayB.addEventListener('click', function(){
        var IDX = dayB.id.split("day")[1].split("button")[0] - 23;
        var IDXdate = dayB.id.split("day")[1].split("button")[0];
        if (layerstoggle[IDX] == 1) {
          map.removeLayer(layers[IDX]);
          layerstoggle[IDX] = 0;
          dayB.classList.remove("active");
        } else {
          if (IDX == +daynum-23){
            var nasaDataURL = "https://extras.sfgate.com/editorial/wildfires/overtime/2018-"+zeroFill(month,2)+"-"+zeroFill(IDXdate,2)+".sim.json";
            d3.json(nasaDataURL).then(function(nasa){
              layers[IDX] = L.geoJSON(nasa,{style: nowstyle}).addTo(map);
            });
            layerstoggle[IDX] = 1;
          } else {
            var nasaDataURL = "https://extras.sfgate.com/editorial/wildfires/overtime/2018-"+zeroFill(month,2)+"-"+zeroFill(IDXdate,2)+".sim.json";
            d3.json(nasaDataURL).then(function(nasa){
              layers[IDX] = L.geoJSON(nasa,{style: daystyle}).addTo(map);
            });
            layerstoggle[IDX] = 1;
          }
          layerstoggle[IDX] = 1;
          dayB.classList.add("active");
        }
      });
    })(dayB);
  }

}

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
      console.log(PDTdate);
      var eAIR = formatDate(date,PDTdate.split(" ")[1]);

      // fill in when data was last updated
      if (document.getElementById("airDate")) {
        document.getElementById("airDate").innerHTML = "Air quality data updated on " + eAIR;
      }
      // if (document.getElementById("airDatemobile")) {
      //   document.getElementById("airDatemobile").innerHTML = "Air quality data updated on " + eAIR;
      // }
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
//
// //----------------------------------------------------------------------------------
// // functions to draw calendars ------------------------------------
// //----------------------------------------------------------------------------------
//
// function drawCalendarV2(month,daynum,chartID) {
//
//   if (windowWidth <= 650) {
//     var cellMargin = 2,
//         cellSize = 18;
//     var header_height = 40;
//   } else {
//     var cellMargin = 2,
//         cellSize = 20;
//     var header_height = 50;
//   }
//   var minDate = new Date("2017-06-12");
//   var maxDate = new Date("2017-"+month+"-"+daynum);
//
//   var day = d3.timeFormat("%w"), // day of the week
//       week = d3.timeFormat("%U"), // week number of the year
//       month = d3.timeFormat("%m"), // month number
//       year = d3.timeFormat("%Y"),
//       format = d3.timeFormat("%m/%d/%Y"),
//       monthName = d3.timeFormat("%B"),
//       months= d3.timeMonth.range(d3.timeMonth.ceil(minDate), d3.timeMonth.ceil(maxDate));
//
//   var num_months = 4;
//   if (windowWidth <= 650) {
//     var num_months_in_a_row = 2;
//     var num_rows = 2;
//   } else {
//     var num_months_in_a_row = 4;
//     var num_rows = 1;
//   }
//
//   // var color = d3.scaleLinear()
//   //   .range(['white', '#CF0000'])
//   //   .domain([0, 1]);
//
//   // var lookup = d3.nest()
//   //   .key(function(d) {
//   //     return format(parseFullDate(d["Date"]));
//   //   })
//   //   .rollup(function(leaves) {
//   //     return d3.sum(leaves, function(d){ return 1; });
//   //   })
//   //   .object(dateData);
//
//   // something about clearing the SVG is NOT WORKING
//   var svg = d3.select(chartID).selectAll("svg")
//       // .data(d3.range([2017,2017]))
//     .data("0")
//     .enter().append("svg")
//     .attr("width", 7*cellSize*num_months_in_a_row + 28*(num_months_in_a_row-1)) //2 months of 7 days a week with 25 px between them
//     .attr("height", 7*cellSize*num_rows + header_height)
//     .append("g")
//
//   console.log(svg);
//   console.log(minDate);
//   console.log(maxDate);
//
//   // making colored squares for dates
//   var rect = svg.selectAll(".day")
//       .data(function(d) {
//         console.log(d3.timeDays(minDate, maxDate));
//         return d3.timeDays(minDate, maxDate);
//       })
//     .enter().append("rect")
//       .attr("class", "day")
//       .attr("width", cellSize-4)
//       .attr("height", cellSize-4)
//       .attr("rx", 3).attr("ry", 3) // rounded corners
//       .attr("fill", function(d,didx) {
//         return "red";
//         // if (lookup[format(d)]) {
//         //   return color(lookup[format(d)]);
//         // } else {
//         //   return "#eaeaea";
//         // }
//       })
//       .attr("x", function(d) {
//         var month_padding = 1.2 * cellSize*7 * ((month(d)) % (num_months_in_a_row));
//         return day(d) * cellSize + month_padding;
//       })
//       .attr("y", function(d) {
//         var week_diff = week(d) - week(new Date(year(d), month(d)-1, 1) );
//         var row_level = Math.ceil(month(d) / (num_months_in_a_row));
//         var index = +month(d) - num_months;
//         if(num_rows > 1) {
//           return (week_diff*cellSize) + header_height+ Math.floor(index/num_months_in_a_row)*cellSize*8;
//         } else {
//           return (week_diff*cellSize) + header_height;
//         }
//       })
//       .datum(format);
//
//   var month_titles = svg.selectAll(".month-title")  // Jan, Feb, Mar and the whatnot
//         .data(function(d) {
//           return months; })
//       .enter().append("text")
//         .text(monthTitle)
//         .attr("x", function(d, i) {
//           var month_padding = 1.2 * cellSize*7* ((month(d)) % (num_months_in_a_row)) + 2.5*cellSize;
//           return month_padding;
//         })
//         .attr("y", function(d, i) {
//           var week_diff = week(d) - week(new Date(year(d), month(d)-1, 1) );
//           var row_level = Math.ceil(month(d) / (num_months_in_a_row));
//           if(num_rows > 1) {
//             return (week_diff*cellSize) + header_height - 5 + Math.floor(i/num_months_in_a_row)*cellSize*8;
//           } else {
//             return (week_diff*cellSize) + header_height - 20;
//           }
//         })
//         .attr("class", "month-title")
//         .attr("d", monthTitle);
//
//   //  Tooltip Object
//   var tooltip = d3.select("body")
//     .append("div").attr("id", "tooltip")
//     .style("position", "absolute")
//     .style("z-index", "10")
//     .style("visibility", "hidden")
//
//   //  Tooltip
//   // rect.on("mouseover", mouseover);
//   // rect.on("mouseout", mouseout);
//   // function mouseover(d) {
//   //   tooltip.style("visibility", "visible");
//   //   if (lookup[d]){
//   //     var text = d+" : "+lookup[d]+ " miles";
//   //   } else {
//   //     var text = "";
//   //   }
//   //   tooltip.style("opacity",1)
//   //   if (screen.width <= 480) {
//   //     tooltip.html(text)
//   //       .style("left",(d3.event.pageX)/2+10+"px")
//   //       .style("top",(d3.event.pageY+20)+"px");//(d3.event.pageY+40)+"px")
//   //   } else {
//   //     tooltip.html(text)
//   //       .style("left", (d3.event.pageX)+10 + "px")
//   //       .style("top", (d3.event.pageY) + "px");
//   //   }
//   // }
//   // function mouseout (d) {
//   //   tooltip.style("opacity",0);
//   // }
//   function monthTitle (t0) {
//     return t0.toLocaleString("en-us", { month: "long" });
//   }
// }
//
// drawCalendarV2(month,daynum,"calendar");
