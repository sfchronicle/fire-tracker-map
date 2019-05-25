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
  var zoom_deg = 5;
  var ca_lat = 37.50;
  var ca_long = -120.483433;
} else {
  var ca_offset = 0.5;
  var zoom_deg = 6;
  var ca_lat = 37.38;
  var ca_long = -123.3114;
}

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


// zoom map to first fire on sheets data
var calfireDataURL = "https://sfc-project-files.s3.amazonaws.com/project-feeds/fire_tracker_firedata.json";

d3.json(calfireDataURL).then(function(blockdata){

  ca_offset_new = ca_offset;
  map.setView([ca_lat,ca_long],zoom_deg);

});


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
        iconSize:     [17,17],
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

  var overlayString=``;

  document.getElementById("list-of-fires").innerHTML = "";
  return new Promise(function(ok,fail){

    d3.json(calfireDataURL).then(function(caldata){

      blockdata = caldata;
      overlayString = ``;

      caldata.forEach(function(c,cIDX){
       
        c.Containment = c.Containment*100+"%";
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
        `;
        if (c.Containment == "100%"){
          var tempmarker = L.marker([c.Lat, c.Lon], {icon: containedIcon}).addTo(map).bindPopup(html_str);
        } else {
          var tempmarker = L.marker([c.Lat, c.Lon], {icon: activeIcon}).addTo(map).bindPopup(html_str);
        }
        markerArray[cIDX] = tempmarker;
      })
      // markersGroup = L.layerGroup(markerArray);
      // markerArray[0].openPopup();

      ok();
    });
  });
}

// make sure that sidebar elements exist before putting event listeners on them
loadSidebar().then(()=>LoadSidebarEvents());
overlayTimer = setInterval(function() {
  loadSidebar();
}, timer5minutes);

// load NOAA data -----------------------------------------------------------------------------------------------
// var fireDataURL = "https://extras.sfgate.com/editorial/wildfires/noaa.csv?";
// var map_timer;

// read in fire data and create timers for re-loading it
// setTimeout(function(){
//   d3.csv(fireDataURL).then(function(fire_data){

//     // creating Lat/Lon objects that d3 is expecting
//     fire_data.forEach(function(d,idx) {
//       d.LatLng = new L.LatLng(d.latitude,
//                   d.longitude);
//     });

//     clearTimeout(map_timer);
//     drawMap(fire_data);
//     d3.text('https://extras.sfgate.com/editorial/wildfires/noaatime.txt').then(function(text) {

//       var d = new Date(text);
//       var e = formatDate(d,text.split(" ")[2]);

//       if (document.getElementById("updateID")) {
//         document.getElementById("updateID").innerHTML = e;
//       }
//     });

//     map_timer = setInterval(function() {

//       drawMap(fire_data);
//       d3.text('https://extras.sfgate.com/editorial/wildfires/noaatime.txt', function(text) {

//         var d = new Date(text);
//         var e = formatDate(d,text.split(" ")[2]);

//         if (document.getElementById("updateID")) {
//           document.getElementById("updateID").innerHTML = e;
//         }
//       });

//     }, timer5minutes);

//   });
// },50);

// draw map with dots on it ---------------------------------------------------------------------------------
// var drawMap = function(fire_data) {

//   d3.select("svg").selectAll("circle").remove();
//   var svg = d3.select("#map-leaflet").select("svg");
//   svg.attr("class","dotsSVG")
//   var g = svg.append("g");

//   var circles = g.selectAll("dotsSVG")
//     .data(fire_data)
//     .enter()
//     .append("g");

//   // adding circles to the map
//   circles.append("circle")
//     .attr("class",function(d) {
//       return "dot fireDot";
//     })
//     .style("opacity", 0.2)
//     .style("stroke","#8C0000")
//     .style("opacity",1)
//     .style("stroke-width","1")
//     .style("fill-opacity",0.2)
//     .style("fill","#8C0000")
//     .attr("r", function(d) {
//       if (screen.width <= 480) {
//         return 5;
//       } else {
//         return 8;
//       }
//     });

//   // function that zooms and pans the data when the map zooms and pans
//   function update() {
//     circles.attr("transform",
//     function(d) {
//       return "translate("+
//         map.latLngToLayerPoint(d.LatLng).x +","+
//         map.latLngToLayerPoint(d.LatLng).y +")";
//       }
//     )
//   }

//   map.on("viewreset", update);
//   map.on("zoom",update);
//   update();
// }


// load NASA data -----------------------------------------------------------------------------------------------

// var now = new Date();
// var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
// var monthName = months[now.getMonth()];
// var month = zeroFill(now.getMonth()+1,2);
// var daynum = zeroFill(now.getDate(),2);

// var daynumplus1 = +daynum+1;

// function zeroFill( number, width ){
//   width -= number.toString().length;
//   if ( width > 0 ){
//     return new Array( width + (/\./.test( number ) ? 2 : 1) ).join( '0' ) + number;
//   }
//   return number + ""; // always return a string
// }

// var nasa_timer;
// var layers = [];
// var layerstoggle = [];
// var urlsList = [];
// var daystyle = {"color": "#f25a14","fillOpacity": 0.2,"weight": 1,"opacity":0.4};
// var nowstyle = {"color": "#CC3400","fillOpacity": 0.7,"weight": 3};
// var calendarCount = 0;


// air quality layer ----------------------------------------------------------------------
var pollution_toggle = 0;
var pollutionLayer;

// adding and removing the air quality layer on button click
document.getElementById("airquality").addEventListener("click",function() {

  // remove air quality layer
  if (pollution_toggle == 1) {
    // remove layer and toggle air quality indicator and legend
    map.removeLayer(pollutionLayer);
    pollution_toggle = 0;
    this.classList.remove("active");
    document.getElementById("airquallegend").classList.remove("active");

  // add air quality layer
  } else {
    // add air quality data to map and toggle air quality indicator and legend
    var urlpathPollution = "https://hwp-viz.gsd.esrl.noaa.gov/wmts/image/hrrr_smoke?var=vi_smoke&x={x}&y={y}&z={z}&time=&modelrun=&level=0";
    pollutionLayer = L.tileLayer(urlpathPollution,{transparent: true,opacity: 0.6})
    pollutionLayer.addTo(map);
    pollution_toggle = 1;
    this.classList.add("active");
    document.getElementById("airquallegend").classList.add("active");

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
  document.getElementById("map-overlay").classList.add("noscroll");
});

// show air quality data
document.getElementById("popup-airquality-explanation").addEventListener("click",function() {
  document.getElementById("aboutthedata-box").classList.add("active");
  document.getElementById("aboutthedata-overlay").classList.add("active");
  document.getElementById("about-airquality").classList.remove("hide");
  document.getElementById("about-noaa").classList.add("hide");
  document.getElementById("about-nasa").classList.add("hide");
  document.getElementById("map-overlay").classList.add("noscroll");

});

// show NASA data
document.getElementById("popup-nasa-explanation").addEventListener("click",function() {
  document.getElementById("aboutthedata-box").classList.add("active");
  document.getElementById("aboutthedata-overlay").classList.add("active");
  document.getElementById("about-nasa").classList.remove("hide");
  document.getElementById("about-noaa").classList.add("hide");
  document.getElementById("about-airquality").classList.add("hide");
  document.getElementById("map-overlay").classList.add("noscroll");
});

// hide the about the data box
document.getElementById("close-data-box").addEventListener("click",function() {
  document.getElementById("aboutthedata-box").classList.remove("active");
  document.getElementById("aboutthedata-overlay").classList.remove("active");
  document.getElementById("map-overlay").classList.remove("noscroll");
});

//----------------------------------------------------------------------------------
// functions to draw calendars ------------------------------------
//----------------------------------------------------------------------------------




// Add click event to close button
$(".expand-sidebar").click(function(){

  $("#map-overlay").toggleClass("collapsed");

  if ($("#map-overlay").hasClass("collapsed")){
    $(".expand-sidebar i").addClass("fa-expand");
    $(".expand-sidebar i").removeClass("fa-compress");
  } else {
    $(".expand-sidebar i").removeClass("fa-expand");
    $(".expand-sidebar i").addClass("fa-compress");
  }

});


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
      // if (screen.width >= 480){
        markerArray[targetId].openPopup();
      // }
    }

  });
}

// RSS parser
var Feed = require('./lib/rss');

Feed.load('https://www.sfchronicle.com/default/feed/2018-california-wildfires-feed-2063.php', function(err, rss){

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
