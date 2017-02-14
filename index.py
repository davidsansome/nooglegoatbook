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
    self.response.out.write(ENV.get_template('index.html').render({
      'user': users.get_current_user(),
    }))

app = webapp2.WSGIApplication([
    ('/', MainPage),
], debug=True)

