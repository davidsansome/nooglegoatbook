import json
import logging
import traceback

import webapp2

class BaseHandler(webapp2.RequestHandler):
  def handle_exception(self, exception, debug_mode):
    logging.error(traceback.format_exc())

    self.response.clear()
    self.response.set_status(500)
    self.response.out.write(exception)

def to_json(thing):
  return '/*-secure-' + json.dumps(thing) + '*/'
