#!/usr/bin/env python

import gdata.service
import logging
import os
import re
import wsgiref.handlers

from google.appengine.api import users
from google.appengine.ext import db
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template

from common import to_json, BaseHandler
from models import *

class MainPage(BaseHandler):
  def get(self):
    template_values = {
      'user': users.get_current_user(),
      'logout_url': users.create_logout_url('/'),
    }

    path = os.path.join(os.path.dirname(__file__), 'googlenotebook.html')
    self.response.out.write(template.render(path, template_values))

class GetNotebooks(BaseHandler):
  def post(self):
    # Parse URL
    url = self.request.get('url')
    match = re.match('^http://www.google.com/notebook/\w+/(\d+)', url)
    if match == None:
      raise Exception('Invalid URL')
    user_id = match.group(1)

    # Get list of feeds
    gservice = gdata.service.GDataService()
    gservice.server = "www.google.com"
    feed = gservice.GetFeed("/notebook/feeds/" + user_id + '?orderby=position')

    notebooks = []
    for notebook_entry in feed.entry:
      id = notebook_entry.id.text
      match = re.match('^http://www.google.com/notebook/feeds/\d+/([^/]+)$', id)
      if match == None:
        raise Exception('Invalid id: ' + id)
      id = match.group(1)

      notebooks.append({
        'title': notebook_entry.title.text,
        'id': id,
      })

    if len(notebooks) == 0:
      raise Exception('You have no public notebooks')

    self.response.headers['Content-Type'] = 'application/json'
    self.response.out.write(to_json({
      'user_id': user_id,
      'notebooks': notebooks,
    }))

class ImportNotebooks(BaseHandler):
  def post(self):
    user_id = self.request.get('user_id')
    notebooks = self.request.get_all('notebooks')

    if re.match('\d+', user_id) == None:
      raise Exception('Invalid user_id')

    for notebook_id in notebooks:
      if re.match('[^/]+', notebook_id) == None:
        raise Exception('Invalid notebook_id')

      gservice = gdata.service.GDataService()
      gservice.server = 'www.google.com'
      feed = gservice.GetFeed('/notebook/feeds/' + user_id +
                              '/notebooks/' + notebook_id + '?orderby=position')

      notebook = Notebook(
        owner = users.get_current_user(),
        title = feed.title.text,
        content = '',
      )
      for note in feed.entry:
        notebook.content += '<p>' + unicode(note.content.text, 'utf-8') + '</p>'
      notebook.put()

application = webapp.WSGIApplication([
  ('/import/googlenotebook', MainPage),
  ('/import/googlenotebook/notebooks', GetNotebooks),
  ('/import/googlenotebook/import', ImportNotebooks),
], debug=True)

def main():
  wsgiref.handlers.CGIHandler().run(application)

if __name__ == '__main__':
  main()
