$(function() {
  var map = new google.maps.Map(document.getElementById('map-canvas'), {
    center: new google.maps.LatLng(-33.9, 151.2),
    zoom: 13,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  });
  
  var marker = new google.maps.Marker({
    position: map.getCenter(),
    map: map,
    draggable: true,
    icon: new google.maps.MarkerImage(
      'http://oa-samples.googlecode.com/svn-history/r73/trunk/presentations/gdd-2010/saopaulo/talks/maps/my-location.png',
      null, null, new google.maps.Point(6, 7)),
    flat: true,
    raiseOnDrag: false
  });
  
  new google.maps.Circle({
    map: map,
    radius: 300,
    strokeColor: '#44c4ff',
    fillColor: '#44c4ff'
  }).bindTo('center', marker, 'position');
  
  navigator.geolocation.getCurrentPosition(function(p) {
    var ll = new google.maps.LatLng(p.coords.latitude, p.coords.longitude);
    map.setCenter(ll);
    marker.setPosition(ll);
    /*new google.maps.Circle({
      center: ll,
      radius: p.coords.accuracy,
      strokeWeight: 1,
      strokeColor: '#ffff00',
      map: map
    });*/
    map.setZoom(14);
  });
  
  new google.maps.FusionTablesLayer(478005, {
    map: map
  });
  
  google.maps.event.addListener(marker, 'dragend', function() {
    var q = 'https://www.google.com/fusiontables/api/query?sql=' +
        escape('SELECT * from 478005 WHERE ST_INTERSECTS(lat, CIRCLE(LATLNG' +
        marker.getPosition() + ', 300))') + '&jsonCallback=?';
    $.getJSON(q, function(data) {
      var stops = data.table.rows;
      var out = [];
      for (var i = 0; i < stops.length; i++) {
        var stop = stops[i];
        out.push(new Stop(stop[0], stop[1], stop[2], stop[3]));
      }
      setStops(out);
    });
  });

  setInterval(updateTimes, 1000);
  stopHoverMarker.setMap(map);
});

function updateTimes() {
  var d = new Date() / 1000;
  $('#buses li').each(function() {
    var arr = Number($(this).attr('data-datetime'));
    var diff = arr - d;
    if (diff < 0) {
      $(this).remove();
    }
    $('.arrival', this).text(parseInt(diff / 60));
  });
}

var currentStops = [];

function setStops(stops) {
  currentStops = stops;
  var ids = $.map(stops, function(stop) {return stop.getId()}).join(',');
  $('#stops').text(ids);
  query(ids);
}

var stopHoverMarker = new google.maps.Marker();

function setBuses(stops) {
  var b = [];
  for (var i = 0; i < stops.length; i++) {
    b = b.concat(stops[i].buses);
  }
  var d = new Date()
  b.sort(function(a,b) {
    return a.time - b.time;
  });
  $('#buses').empty();
  for (var i = 0; i < b.length; i++) {
    var bus = b[i];
    var html = ['<li data-stop="',bus.stopid,'" data-datetime="',bus.time,'">','<span class="arrival"></span><span class="route">',bus.route,'</span><span class="dest">',bus.dest,'</span>',bus.vid,'</li>'].join('');
    var li = $(html);
    $('#buses').append(li);
    (function(li) {
      li.hover(function() {
        var stop = $.grep(currentStops, function(a) { 
          return a.getId() == li.attr('data-stop');
        })[0];

        stopHoverMarker.setOptions({
          visible: true,
          position: stop.getLocation()
        });
        stop.getLocation()
      }, function() {
        stopHoverMarker.setVisible(false);
      });
    })(li);
  }
}

function query(ids) {
  $.getJSON('/query?' + ids, function(stops) {
    setBuses(stops);
    updateTimes();
  });
}

function Stop(id, lat, lng, desc) {
  this.id_ = id;
  this.ll_ = new google.maps.LatLng(lat, lng);
  this.desc_ = desc;
} 
Stop.prototype.getLocation = function() {
  return this.ll_;
}
Stop.prototype.getId = function() {
  return this.id_;
}
Stop.prototype.toString = function() {
  return [this.id_, this.ll_, this.desc_].join(' | ');
}
