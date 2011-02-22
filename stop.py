from google.appengine.ext import db

class Stop(db.Model):
  buses = db.TextProperty()

