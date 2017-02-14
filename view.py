import os

import jinja2
import webapp2
from google.appengine.api import users
from google.appengine.ext import db

from models import *

ENV = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)),
    extensions=['jinja2.ext.autoescape'],
    autoescape=True)

class MainPage(webapp2.RequestHandler):
  def get(self):
    self.response.out.write(ENV.get_template('view.html').render({
      'user': users.get_current_user(),
      'logout_url': users.create_logout_url('/'),
    }))

app = webapp2.WSGIApplication([
  ('/view', MainPage),
], debug=True)
