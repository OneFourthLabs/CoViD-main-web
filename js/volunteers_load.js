var currentPage = 1;
var volunteers;
var map;
var user_location;
var max_distance = 10 * 1000;
var markerCluster;
var volunteer_markers;
var executed_init_map = false;
//Refer: https://coderwall.com/p/i817wa/one-line-function-to-detect-mobile-devices-with-javascript
function isMobileDevice() {
  return (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1);
};

var table = new Tabulator("#volunteers_table", {
  layout: (isMobileDevice() ? "fitDataFill" : "fitColumns"),
  //Callback on filter data
  dataFiltered: function (filters, rows) {
    var newData = []
    for (index = 0; index < rows.length; index++) {
      newData.push(rows[index].getData());
    }
    volunteers = newData;
    set_volunteer_markers(volunteers);
  },

  columns: [
    { title: "Datetime", field: "datetime", headerFilter: "number" },
    { title: "Help category", field: "help_category.main", formatter: "textarea", headerFilter: "input" },
    { title: "Help Item", field: "help_category.sub", formatter: "textarea", headerFilter: "input" },
    { title: "Phone", field: "phone", headerFilter: "number" },
    { title: "Help Message", field: "help_message", formatter: "textarea", headerFilter: "input" },
  ],
  pagination: "local",
  paginationSize: 5,
});

function get_data() {

  if(user_location==null){
    return;
  }
  var data = {};
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.open("POST", "https://db-server-dot-corona-bot-gbakse.appspot.com/get_nearby_volunteers", true);
  xmlhttp.setRequestHeader("Content-Type", "application/json");
  xmlhttp.onreadystatechange = function () {
    var currentPage = table.getPage()
    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
      data = JSON.parse(xmlhttp.responseText);
      table.setData(data);
      table.setPage(Math.min(currentPage, table.getPageMax()));
    }
  };
  var data = JSON.stringify({ "lat": user_location["lat"], "long": user_location["lng"] });
  // var data = JSON.stringify({ "lat": 13.086, "long": 80.2751 });
  xmlhttp.send(data);
}


function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 5,
    center: { lat: 23.2599, lng: 77.4126 }, // Bhopal
    //Dark theme
    styles: [
      { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
      {
        featureType: 'administrative.locality',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#d59563' }]
      },
      {
        featureType: 'poi',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#d59563' }]
      },
      {
        featureType: 'poi.park',
        elementType: 'geometry',
        stylers: [{ color: '#263c3f' }]
      },
      {
        featureType: 'poi.park',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#6b9a76' }]
      },
      {
        featureType: 'road',
        elementType: 'geometry',
        stylers: [{ color: '#38414e' }]
      },
      {
        featureType: 'road',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#212a37' }]
      },
      {
        featureType: 'road',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#9ca5b3' }]
      },
      {
        featureType: 'road.highway',
        elementType: 'geometry',
        stylers: [{ color: '#746855' }]
      },
      {
        featureType: 'road.highway',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#1f2835' }]
      },
      {
        featureType: 'road.highway',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#f3d19c' }]
      },
      {
        featureType: 'transit',
        elementType: 'geometry',
        stylers: [{ color: '#2f3948' }]
      },
      {
        featureType: 'transit.station',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#d59563' }]
      },
      {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: '#17263c' }]
      },
      {
        featureType: 'water',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#515c6d' }]
      },
      {
        featureType: 'water',
        elementType: 'labels.text.stroke',
        stylers: [{ color: '#17263c' }]
      }
    ],
  });
  get_user_location();
}
function get_user_location() {
  var display_info = 'false';

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function (position) {
      var current_pos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      map.setCenter(current_pos);
      map.setZoom(12)

      var access_area = new google.maps.Circle({
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#FF0000',
        fillOpacity: 0.35,
        map: map,
        center: current_pos,
        radius: max_distance // in M
      });
      user_location = current_pos;
      // Call API to get data
      get_data();
    }, function () {
      handleLocationError(true, map.getCenter());
    });
  } else {
    // Browser doesn't support Geolocation
    handleLocationError(false, map.getCenter());
  }
}

function handleLocationError(browserHasGeolocation, pos) {
  let error_message = browserHasGeolocation ?
    'Error: The Geolocation service failed.' :
    'Error: Your browser doesn\'t support geolocation.';
  window.alert(error_message);
}

function find_haversine_distance(lat1, lon1, lat2, lon2) {
  var R = 6371; // km (change this constant to get miles)
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c;
  return Math.round(d * 1000); //return distance in m
}


function set_volunteer_markers(display_info) {
  if (markerCluster) {
    markerCluster.removeMarkers(volunteer_markers);
  }
  volunteer_markers = volunteers.map(function (entry, i) {

    let loc = {
      lat: parseFloat(entry['lat']),
      lng: parseFloat(entry['long'])
    }

    var contentString = '' +
      '<p>' +
      '	<h3>' + entry['help_category']['main'] + '</h3>' +
      '	<h5>' + entry['help_category']['sub'] + '</h3>' +
      '	Datetime: ' + entry['datetime'] + '<br>' +
      '	Name: ' + entry['name'] + '<br>' +
      '	Phone: ' + entry['phone'] + '<br>' +
      '	Email: ' + entry['email'] + '<br>' +
      '	Help Message: ' + entry['help_message'] +
      '</p>';

    var infowindow = new google.maps.InfoWindow({
      content: contentString
    });

    icon_url = "https://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|0000ff"
    var marker = new google.maps.Marker({
      position: loc,
      label: entry['name'],
      icon: icon_url
    });

    if (display_info && user_location) {
      let haversine_distance = find_haversine_distance(user_location.lat, user_location.lng, loc.lat, loc.lng)
      if (haversine_distance <= max_distance) {
        marker.addListener('click', function () {
          infowindow.open(map, marker);
        });
      }
    }

    return marker
  });

  // Add a marker clusterer to manage the markers.
  markerCluster = new MarkerClusterer(map, volunteer_markers,
    { imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m', maxZoom: 18 });
}

initMap();

// Fetch data every 10 secs
setInterval(get_data, 10000);


