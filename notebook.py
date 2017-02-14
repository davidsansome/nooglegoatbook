import os
import time

import webapp2
from google.appengine.api import users
from google.appengine.ext import db

from common import to_json
from models import *

class ListNotebooks(webapp2.RequestHandler):
  def get(self):
    # Get the user's last opened notebook
    last_opened_notebook = get_user_data().last_opened_notebook

    # Get the user's notebooks
    query = db.Query(Notebook)
    query.filter('owner =', users.get_current_user())
    query.order('title')

    result = []
    for notebook in query:
      result.append(self.serialize_notebook(notebook))

    if len(result) == 0:
      # The user doesn't have any notebooks, so make a new one
      notebook = Notebook(
        owner = users.get_current_user(),
        title = 'My notebook',
        encrypted = False,
      )
      notebook.put()
      result.append(self.serialize_notebook(notebook))
      last_opened_notebook = notebook.key().id()

    self.response.headers['Content-Type'] = 'application/json'
    self.response.out.write(to_json({
      'last_opened_notebook': last_opened_notebook,
      'notebooks': result,
    }))

  def serialize_notebook(self, notebook):
    return {
      'title':     notebook.title,
      'id':        notebook.key().id(),
      'encrypted': notebook.encrypted,
    }

class NewNotebook(webapp2.RequestHandler):
  def post(self):
    title = self.request.get('title')

    if len(title) <= 0:
      raise Exception('title not provided')

    # Check for duplicates
    query = db.Query(Notebook)
    query.filter('owner =', users.get_current_user())
    query.filter('title =', title)

    if query.count():
      raise Exception('A notebook with this title already exists')

    # Save
    notebook = Notebook(
      owner = users.get_current_user(),
      title = title,
      encrypted = bool(int(self.request.get('encrypted')))
    )
    notebook.put()

    # Make sure it opens next time
    user_data = get_user_data()
    user_data.last_opened_notebook = notebook.key().id()
    user_data.put()

class GetNotebook(webapp2.RequestHandler):
  def get(self):
    id = int(self.request.get('id'))
    notebook = get_notebook(id)

    user_data = get_user_data()
    user_data.last_opened_notebook = id
    user_data.put()

    self.response.headers['Content-Type'] = 'application/json'
    self.response.out.write(to_json({
      'encrypted': notebook.encrypted,
      'content':   notebook.content,
    }))

  def post(self):
    id = int(self.request.get('id'))
    notebook = get_notebook(id)

    notebook.content = self.request.get('content')
    notebook.encrypted = bool(int(self.request.get('encrypted')))
    notebook.put()

class RenameNotebook(webapp2.RequestHandler):
  def post(self):
    id = int(self.request.get('id'))
    notebook = get_notebook(id)

    notebook.title = self.request.get('title')
    notebook.put()

class DeleteNotebook(webapp2.RequestHandler):
  def post(self):
    id = int(self.request.get('id'))
    get_notebook(id).delete()

def get_notebook(id):
  notebook = Notebook.get_by_id(id)
  if notebook == None:
    raise Exception('Invalid Notebook ID')

  if notebook.owner != users.get_current_user():
    raise Exception('Not yours')

  return notebook;

def get_user_data():
  query = db.Query(UserData)
  query.filter('owner =', users.get_current_user())
  user_data = query.get()

  if user_data == None:
    user_data = UserData(owner=users.get_current_user())

  return user_data

app = webapp2.WSGIApplication([
  ('/api/notebook', ListNotebooks),
  ('/api/notebook/new', NewNotebook),
  ('/api/notebook/delete', DeleteNotebook),
  ('/api/notebook/title', RenameNotebook),
  ('/api/notebook/content', GetNotebook),
], debug=True)
