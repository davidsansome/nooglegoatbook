#!/usr/bin/env python

import os
import wsgiref.handlers

from google.appengine.api import users
from google.appengine.ext import db
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template

from models import *

class MainPage(webapp.RequestHandler):
  def get(self):
    template_values = {
      'user': users.get_current_user(),
      'logout_url': users.create_logout_url('/'),
    }

    path = os.path.join(os.path.dirname(__file__), 'import.html')
    self.response.out.write(template.render(path, template_values))

application = webapp.WSGIApplication([
  ('/import', MainPage),
], debug=True)

def main():
  wsgiref.handlers.CGIHandler().run(application)

if __name__ == '__main__':
  main()
