$(function() {
  var map = new google.maps.Map(document.getElementById('map-canvas'), {
    center: new google.maps.LatLng(-33.9, 151.2),
    zoom: Modernizr.touch ? 15 : 13,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  });
  new google.maps.FusionTablesLayer(478005, {
    map: map
  });
  
  addTabs(map);

  if (Modernizr.touch) {
    google.maps.event.addListener(map, 'idle', function() {
      onQueryChange(map);
    });
  } else {
    var marker = new google.maps.Marker({
      position: map.getCenter(),
      map: map,
      draggable: true,
      icon: new google.maps.MarkerImage(
        'http://oa-samples.googlecode.com/svn-history/r73/trunk/' +
        'presentations/gdd-2010/saopaulo/talks/maps/my-location.png',
        null, null, new google.maps.Point(6, 7)),
      flat: true,
      raiseOnDrag: false
    });
    
    getCurrentPosition(map, marker);
    
    new google.maps.Circle({
      map: map,
      radius: 300,
      strokeColor: '#44c4ff',
      fillColor: '#44c4ff'
    }).bindTo('center', marker, 'position');
  
    google.maps.event.addListener(marker, 'dragend', function() {
      onQueryChange(map, marker);
    });
  }

   $('#my-location').click(function() {
     getCurrentPosition(map, marker);
   });

  setInterval(function() {
    updateTimes(true);
  }, 1000);
  stopHoverMarker.setMap(map);
});

function getCurrentPosition(map, marker) {
  $('#loc').hide();
  $('#load').show();
  navigator.geolocation.getCurrentPosition(function(p) {
    var ll = new google.maps.LatLng(p.coords.latitude, p.coords.longitude);
    map.setCenter(ll);
    if (!Modernizr.touch) {
      marker.setPosition(ll);
      map.setZoom(14);
    } else {
      map.setZoom(18);
    }
    $('#loc').show();
    $('#load').hide();
  });
};

function addTabs(map) {
  $('#btn-map').click(function() {
    $('#map-canvas').show();
    $('#buses').hide();
    $('.button-active').removeClass('button-active');
    $(this).addClass('button-active');
    google.maps.event.trigger(map, 'resize');
    return false;
  });
  
  $('#btn-buses').click(function() {
    $('#map-canvas').hide();
    $('#buses').show();
    $('.button-active').removeClass('button-active');
    $(this).addClass('button-active');
    return false;
  });  
};

function onQueryChange(map, marker) {
	
  $('#btn-buses').html('<img src="/static/ajax-loader.gif">');
  
  var q = ['https://www.google.com/fusiontables/api/query?sql='];

  if (Modernizr.touch) {
    var b = map.getBounds();
    q.push(escape('SELECT * from 478005 WHERE ST_INTERSECTS(lat, RECTANGLE(' +
            'LATLNG' + b.getSouthWest() + ',LATLNG' + b.getNorthEast() + '))'));
  } else {
    q.push(escape('SELECT * from 478005 WHERE ST_INTERSECTS(lat, CIRCLE(LATLNG' +
      marker.getPosition() + ', 300))'));
  }
  q.push('&jsonCallback=?');

  $.getJSON(q.join(''), function(data) {
    var stops = data.table.rows;
    var out = [];
    for (var i = 0; i < stops.length; i++) {
      var stop = stops[i];
      out.push(new Stop(stop[0], stop[1], stop[2], stop[3]));
    }
    if (stops.length) {
      setStops(out);
    }
    // TODO: do something if no stops are selected
    $('#btn-buses').html('Next Buses');
  });
};

function updateTimes(slide) {
  var d = new Date() / 1000;
  $('#buses li').each(function() {
    var arr = Number($(this).attr('data-datetime'));
    var diff = arr - d;
    if (diff < 0) {
      if (slide) {
        $(this).slideUp();
      } else {
        $(this).remove();
      }
    }
    if (diff > 60) {
      var text = parseInt(diff/60) + '<span>m</span>';
    } else {
      var text = parseInt(diff) + '<span>s</span>';
    }
    $('.arrival', this).html(text);
  });
}

var currentStops = {};

function setStops(stops) {
  for (var i = 0; i < stops.length; i++) {
    currentStops[stops[i].getId()] = stops[i];
  }
  var ids = $.map(stops, function(stop) {return stop.getId()}).join(',');
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
  var ul = $('<ul></ul>');
  for (var i = 0; i < b.length; i++) {
    var bus = b[i];
    var stop = currentStops[bus.stopid];
    var html = ['<li data-stop="',bus.stopid,'" data-datetime="',bus.time,'">',
        '<div class="arrival"></div><div class="route-info">',
        '<span class="route">',bus.route,
        '</span><span class="dest">',bus.dest,'</span></div>',
        '<div class="stopdesc">',stop.getDesc(),'</div></li>'].join('');

    var li = $(html);
    ul.append(li);
  }
  $('#buses').append(ul);
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
};
Stop.prototype.getDesc = function() {
  return this.desc_;
};
Stop.prototype.getId = function() {
  return this.id_;
};
Stop.prototype.toString = function() {
  return [this.id_, this.ll_, this.desc_].join(' | ');
};