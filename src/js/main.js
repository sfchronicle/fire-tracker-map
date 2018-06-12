require("./lib/social"); //Do not delete
var d3 = require('d3');
require("./lib/leaflet-mapbox-gl");

// format numbers
var formatthousands = d3.format(",");

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

var sf_lat = 38.45;
var sf_long = -123.5;
var zoom_deg = 9;
var max_zoom_deg = 16;
var min_zoom_deg = 4;

var offset_top = 900;
var bottomOffset = 200;

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
     position:'topright'
}).addTo(map);
