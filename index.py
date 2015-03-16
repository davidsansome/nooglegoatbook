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
        }

        path = os.path.join(os.path.dirname(__file__), 'index.html')
        self.response.out.write(template.render(path, template_values))

application = webapp.WSGIApplication([
    ('/', MainPage),
], debug=True)

def main():
    wsgiref.handlers.CGIHandler().run(application)

if __name__ == '__main__':
    main()
