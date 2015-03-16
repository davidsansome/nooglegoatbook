from google.appengine.ext import db

class Notebook(db.Model):
  owner = db.UserProperty()
  title = db.StringProperty()
  content = db.TextProperty()
  encrypted = db.BooleanProperty(default=False)

class UserData(db.Model):
  owner = db.UserProperty()
  last_opened_notebook = db.IntegerProperty()
