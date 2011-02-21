#!/usr/bin/env python

import logging as log
import StringIO
import zipfile
import pprint
import os
from django.utils import simplejson as json
from xml.dom import minidom
from google.appengine.ext import webapp
from google.appengine.ext.webapp import util
from google.appengine.api import urlfetch
from google.appengine.api import memcache
from google.appengine.ext.webapp import template

DATA_URL = 'http://nswbusdata.info/ptipslivedata/getptipslivedata?filename=ptipslivedata.zip'
CACHE_TIME = 900 # 15 minutes

class StopGetter:
  def get(self):

    result = urlfetch.fetch(DATA_URL)
    log.info("Fetch done")
    if result.status_code == 200:
      return self.parse(result)

  def parse(self, result):
    f = StringIO.StringIO(result.content)
    log.debug("Opening zip")
    z = zipfile.ZipFile(f, 'r')
    log.debug(z)
    log.debug("Parsing XML")
    stopsxml = StringIO.StringIO(z.read('stops.xml'))
    stops = minidom.parse(stopsxml).getElementsByTagName('Stop')
    log.debug("Parsed XML")

    res = []

    for stop in stops:
      res.append(self.stoptodict(stop))

    log.debug(len(stops))

    return res

  def stoptodict(self, stop):
    return {
      'id': stop.attributes["TSN"].value,
      'buses': self.arrivalstolist(stop, stop.getElementsByTagName('Arrival'))
    }

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


class FetchHandler(webapp.RequestHandler):
  def get(self):
    log.debug("From cron: " +
        str('X-AppEngine-Cron' in self.request.headers))

    stops = StopGetter().get()

    if not memcache.add("stops", stops, CACHE_TIME):
      log.error("Memcache failed")
    else:
      log.debug("set memcache from fetch")


class QueryHandler(webapp.RequestHandler):
  def get(self):
    q = self.request.query.rsplit(',')
    stops = memcache.get("stops")
    if stops is not None:
      log.debug("Already in cache")
      self.response.out.write(json.dumps(self.query(stops, q)))
    else:
      log.debug("Not in cache")
      stops = StopGetter().get()
      if memcache.add("stops", stops, CACHE_TIME):
        self.response.out.write(json.dumps(self.query(stops, q)))

  def query(self, stops, q):
    if len(q) == 0 or len(q) == 1 and q[0] == '':
      log.debug('no query')
      return stops

    tojson = []

    for stop in stops:
      if stop['id'] in q:
        tojson.append(stop)

    return tojson

class MainHandler(webapp.RequestHandler):
  def get(self):
    path = os.path.join(os.path.dirname(__file__), 'index.html')
    self.response.out.write(template.render(path, {}))

def main():
  log.getLogger().setLevel(log.DEBUG)
  application = webapp.WSGIApplication([
    ('/', MainHandler),
    ('/fetch', FetchHandler),
    ('/query', QueryHandler)
  ], debug=True)

  util.run_wsgi_app(application)


if __name__ == '__main__':
    main()
