import logging as log

import StringIO
import zipfile

from xml.dom import minidom
from google.appengine.ext import db
from google.appengine.api import urlfetch
from django.utils import simplejson as json

from stop import Stop

DATA_URL = 'http://nswbusdata.info/ptipslivedata/getptipslivedata?filename=ptipslivedata.zip'

class StopGetter:
  def get(self):

    result = urlfetch.fetch(DATA_URL)
    log.info("Fetch done")
    if result.status_code == 200:
      return self.parse(result)
    else:
      return []

  def parse(self, result):
    f = StringIO.StringIO(result.content)
    log.debug("Opening zip")
    z = zipfile.ZipFile(f, 'r')
    log.debug(z)
    log.debug("Parsing XML")
    stopsxml = StringIO.StringIO(z.read('stops.xml'))
    f.close()
    stops = minidom.parse(stopsxml).getElementsByTagName('Stop')
    log.debug("Parsed XML")
    stopsxml.close()

    log.debug(len(stops))

    out = []
    for stop in stops:
      e = self.stopentity(stop)
      out.append(e)

    return out

  def stopentity(self, stopxml):
    stop = Stop(key_name=stopxml.attributes["TSN"].value)

    buses = self.arrivalstolist(stopxml, stopxml.getElementsByTagName('Arrival'))
    stop.buses = json.dumps(buses)
    return stop

  def arrivalstolist(self, stop, arrivals):
    res = []
    for arrival in arrivals:
      res.append({
        'stopid': stop.attributes["TSN"].value,
        'time': int(arrival.attributes["arrivalTime"].value),
        'dest': arrival.attributes["destination"].value,
        'realtime': arrival.attributes["realTime"].value == 'true',
        'route': arrival.attributes["routeName"].value,
        'vid': arrival.attributes["vehicleID"].value
      })

    return res
