require("./lib/social"); //Do not delete
var d3 = require('d3');
require("./lib/leaflet-mapbox-gl");

// format numbers
var formatthousands = d3.format(",");

var timer5minutes = 600000;
var timer30minutes = timer5minutes*6;

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

var sf_lat = 38.6;
var sf_long = -123.6;
var zoom_deg = 8;
var max_zoom_deg = 16;
var min_zoom_deg = 4;

var offset_top = 900;
var bottomOffset = 200;

// load fire scrollbar------------------------------------------------------------------------------------------
var calfireDataURL = "https://extras.sfgate.com/editorial/sheetsdata/firetracker.json";
var overlayString=``;
var overlayTimer;
var blockdata;

function loadSidebar(){
  console.log("are we getting here");
  d3.json(calfireDataURL).then(function(caldata){
    blockdata = caldata;
    caldata.forEach(function(c,cIDX){
      // center map on top fire
      if (cIDX == 0){
        map.setView([c.Lat,c.Lon], c.Zoom);
      }
      overlayString += `
        ${(cIDX == 0) ? `<div class="fire-block active" id="block${cIDX}">` : `<div class="fire-block" id="block${cIDX}">`}
          <div class="fire-name">${c.FireName}</div>
          <div class="fire-desc">${c.Description}</div>
          <div class="fire-acreage"><span class="fire-info-type">Acreage:</span>${c.Acreage}</div>
          <div class="fire-containment"><span class="fire-info-type">Containment:</span>${c.Containment}</div>
          ${c.Damage ? `<div class="fire-damage"><span class="fire-info-type">Damage:</span>${c.Damage}</div>` : ''}
          <div class="fire-damage"><span class="fire-info-type">Fire began:</span>${c.StartDate}</div>
        </div>
      `;
    })
    document.getElementById("list-of-fires").innerHTML = overlayString;
  });

  // event listeners to center on any fire ------------------------------------------------------------------------

  // I am doing a hack here to make sure that the sidebar exists before I set event listeners on it
  setTimeout(function(){
    var fireboxes = document.getElementsByClassName("fire-block");
    var currentblock,blockIDX;
    for (var fidx=0; fidx<fireboxes.length; fidx++){
      currentblock = fireboxes[fidx];
      // we need a closure to get event listeners incremented properly
      (function(_currentblock){
        _currentblock.addEventListener("click",function(){
          $(".fire-block").removeClass("active");
          this.classList.add("active");
          blockIDX = _currentblock.id.split("block")[1];
          map.setView([blockdata[blockIDX].Lat,blockdata[blockIDX].Lon], blockdata[blockIDX].Zoom);
        });
      })(currentblock);
    }
  },0);
}

loadSidebar();
overlayTimer = setInterval(function() {
  loadSidebar();
}, timer30minutes);

// build map ----------------------------------------------------------------------------------------------------

// initialize map with center position and zoom levels
var map = L.map("map-leaflet", {
  minZoom: min_zoom_deg,
  maxZoom: max_zoom_deg,
  zoomControl: false,
  scrollWheelZoom: false,
  attributionControl: false
}).setView([sf_lat,sf_long], zoom_deg);

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

L.control.zoom({
     position:'bottomright'
}).addTo(map);


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
    // if (document.getElementById("updateIDmobile")) {
    //   document.getElementById("updateIDmobile").innerHTML = e;
    // }
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
      // if (document.getElementById("updateIDmobile")) {
      //   document.getElementById("updateIDmobile").innerHTML = e;
      // }
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

var nasaDataURL = "https://extras.sfgate.com/editorial/wildfires/overtime/2018-06-15.sim.json";
var nasa_timer;
var layers = [];

d3.json(nasaDataURL).then(function(nasa){
  console.log(nasa);
  var daystyle = {"color": "#F2A500","fill-opacity": 0.4,"weight": 3};
  // tempstyle = {"color": colorsList[i],"fill-opacity": 0.8,"weight": 3};
  layers = L.geoJSON(nasa,{style: daystyle}).addTo(map);
});


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

      console.log(urlpathPollution);

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
