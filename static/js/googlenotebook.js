Event.observe(window, 'load', function() {
  add_element_extensions();
  new GoogleNotebookImporter();
});

var GoogleNotebookImporter = Class.create({
  initialize: function() {
    this.user_id_ = null;

    $('step1_form').onsubmit = this.get_notebooks.bind(this);
    $('step2_form').onsubmit = this.import_notebooks.bind(this);
  },

  get_notebooks: function() {
    this.start_loading('step1_form');

    new Ajax.Request('/import/googlenotebook/notebooks', {
      method: 'post',
      parameters: {
        url: $('step1_url').value
      },
      onSuccess: function(transport) {
        this.done_loading('step1', 'step2');
        var data = transport.responseJSON;
        this.user_id_ = data.user_id;

        var list = $('notebooks').update();
        data.notebooks.each(function(item) {
          list.insert(new Element('input')
            .writeAttribute('type', 'checkbox')
            .writeAttribute('name', 'notebooks')
            .writeAttribute('value', item.id)
            .writeAttribute('id', item.id)
            .writeAttribute('checked', 1));
          list.insert(new Element('label')
            .writeAttribute('for', item.id)
            .appendText(item.title));
          list.insert(new Element('br'));
        }.bind(this));
      }.bind(this),
      onFailure: function(transport) {
        this.error('step1_form', transport.responseText);
      }.bind(this)
    });

    return false;
  },

  import_notebooks: function() {
    var parameters = $('step2_form').serialize(true);
    parameters['user_id'] = this.user_id_;

    this.start_loading('step2_form');

    new Ajax.Request('/import/googlenotebook/import', {
      method: 'post',
      parameters: parameters,
      onSuccess: function(transport) {
        this.done_loading('step2', 'step3');
      }.bind(this),
      onFailure: function(transport) {
        this.error('step2_form', transport.responseText);
      }.bind(this)
    });

    return false;
  },

  start_loading: function(form) {
    $(form).disable();
    $('spinner').show();
    $('error').hide();
  },
  done_loading: function(last_step, current_step) {
    $(last_step).hide();
    $(current_step).show();
    $('spinner').hide();
    $('error').hide();
  },
  error: function(form, message) {
    $(form).enable();
    $('spinner').hide();
    $('error').setText('Error: ' + message).show();
  }
});

