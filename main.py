#!/usr/bin/env python

import logging as log

import os
import datetime

from google.appengine.ext import webapp
from google.appengine.ext.webapp import util
#from google.appengine.api import memcache
from google.appengine.ext.webapp import template
from google.appengine.ext import db
from django.utils import simplejson as json

import stop
import meta
import stopgetter

CACHE_TIME = 900 # 15 minutes

class FetchHandler(webapp.RequestHandler):
  def get(self):
    log.debug("From cron: " +
        str('X-AppEngine-Cron' in self.request.headers))

    stops = stopgetter.StopGetter().get()

    db.put(stops)
    
    m = meta.Meta(key_name='meta')
    m.time = datetime.datetime.now()
    m.put()

class MetaHandler(webapp.RequestHandler):
  def get(self):
    m = meta.Meta.get_by_key_name('meta')

    self.response.headers['Content-Type'] = 'text'
    self.response.out.write("Meta: \n")
    self.response.out.write("\tDate: %s\n" % m.time)

class QueryHandler(webapp.RequestHandler):
  def get(self):
    self.response.out.write('[\n')

    q = self.request.query.rsplit(',')
    if len(q) == 1 and q[0] == '':
      self.response.out.write(']')
      return

    result = stop.Stop.get_by_key_name(q)

    first = True
    for s in result:
      if first:
        first = False
      else:
        self.response.out.write(',')

      self.response.out.write('{"stop":"%s","buses":' % s.key().name())
      self.response.out.write(s.buses)
      self.response.out.write('}\n')

    self.response.out.write(']')

class MainHandler(webapp.RequestHandler):
  def get(self):
    path = os.path.join(os.path.dirname(__file__), 'index.html')
    self.response.out.write(template.render(path, {}))

def main():
  log.getLogger().setLevel(log.DEBUG)
  application = webapp.WSGIApplication([
    ('/', MainHandler),
    ('/fetch', FetchHandler),
    ('/query', QueryHandler),
    ('/meta', MetaHandler)
  ], debug=True)

  util.run_wsgi_app(application)


if __name__ == '__main__':
    main()
