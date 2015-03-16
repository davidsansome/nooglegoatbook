import logging
import traceback

from gdata.service import RequestError
from google.appengine.ext import webapp

from django.utils import simplejson as json

class BaseHandler(webapp.RequestHandler):
  def handle_exception(self, exception, debug_mode):
    logging.error(traceback.format_exc())

    self.response.clear()
    self.response.set_status(500)

    if isinstance(exception, RequestError):
      self.response.out.write(exception.args[0]['body'])
      if exception.args[0]['reason']:
        self.response.out.write(' (' + exception.args[0]['reason'] + ')')
    else:
      self.response.out.write(exception)

def to_json(thing):
  return '/*-secure-' + json.dumps(thing) + '*/'
