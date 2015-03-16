Event.observe(window, 'load', function() {
  // Set up Element extensions
  Element.addMethods({
    appendText: function(element, text) {
      element.appendChild(document.createTextNode(text));
      return element;
    },
    setText: function(element, text) {
      element.update().appendText(text);
    },
    setVisible: function(element, value) {
      if (value) { element.show(); }
      else       { element.hide(); }
    }
  });

  new Goatbook();
});

var Goatbook = Class.create({
  initialize: function() {
    this.selected_notebook_ = null;
    this.autosave_timer_ = null;
    this.last_saved_content_ = null;
    this.cached_passwords_ = {};

    // Setup editor
    tinyMCE.init({ mode: 'none' });

    this.editor_ = new tinymce.Editor('notebook_editor', {
      theme : 'advanced',
      theme_advanced_toolbar_location: 'top',
      theme_advanced_toolbar_align: 'left',
      theme_advanced_buttons1: 'bold,italic,underline,strikethrough,|,' +
          'justifyleft,justifycenter,justifyright,justifyfull,|,' +
          'bullist,numlist,|,' +
          'fontselect,fontsizeselect,|,' +
          'outdent,indent,blockquote,|,link,unlink,image,|,forecolor,backcolor',
      theme_advanced_buttons2: '',
      theme_advanced_buttons3: '',
      cleanup: true
    });
    this.editor_.render();

    // Create dialogs
    this.create_new_dialog();
    this.create_delete_dialog();
    this.create_rename_dialog();
    this.create_password_dialog();
    this.create_encrypt_dialog();

    // Set up event handlers
    Event.observe(window, 'resize', this.resize_editor.bind(this));
    this.editor_.onChange.add(this.document_edited.bind(this));
    this.editor_.onKeyPress.add(this.document_edited.bind(this));
    this.editor_.onEvent.add(this.document_edited.bind(this));
    $('notebook_save_now').observe('click', this.save.bind(this));

    // Get list of notebooks when the editor is ready
    this.editor_.onInit.add(function() {
      $('notebook_editor_container').show();
      this.resize_editor();
      this.update_notebooks();
    }.bind(this));
  },
  update_notebooks: function() {
    new Ajax.Request('/api/notebook', {
      method: 'get',
      onSuccess: function(transport) {
        // Clear existing notebooks
        $('notebooks').update()
          .insert(new Element('div')
            .addClassName('row')
            .update('Create a new notebook...')
            .observe('click', this.new_dialog_.show.bind(this.new_dialog_)))
          .insert(new Element('div').addClassName('seperator'));

        // Deselect any selected notebooks
        var old_selected = this.selected_notebook_;
        var found_selected_notebook = false;
        this.selected_notebook_ = null;

        var data = transport.responseJSON;
        data.notebooks.each(function(item) {
          var row = new Element('div')
            .addClassName('row')
            .insert(new Element('img')
              .writeAttribute({ src: item.encrypted ?
                  '/images/encrypted.png' :
                  '/images/trans.gif' })
              .addClassName('lock'))
            .appendText(item.title)
            .observe('click', Goatbook.prototype.select_notebook
                .bind(this, item));
          $('notebooks').insert(row);

          item.row = row;

          if (old_selected != null && old_selected.id == item.id) {
            row.addClassName('selected');
            this.selected_notebook_ = item;
            $('notebook_name').setText(item.title);
            found_selected_notebook = true;
          } else if (old_selected == null && data.last_opened_notebook == item.id) {
            this.select_notebook(item);
            found_selected_notebook = true;
          }
        }.bind(this));

        if (found_selected_notebook) {
          $('notebook').show();
        } else {
          $('notebook').hide();
        }
      }.bind(this)
    });
  },

  resize_editor: function() {
    var container = this.editor_.contentAreaContainer;

    var width = $('notebook').getWidth() - 2;
    var height = $('notebook').getHeight() - 
        $('notebook_header').getHeight() -
        container.offsetTop - 2;

    container.firstChild.style.width = width + 'px';
    container.firstChild.style.height = height + 'px';
  },

  select_notebook: function(notebook) {
    // Save
    if (this.selected_notebook_) {
      this.save();
    }

    // Make sure we have a password
    if (notebook.encrypted && !this.cached_passwords_[notebook.id]) {
      this.password_dialog_.on_password_entered = function(password) {
        this.cached_passwords_[notebook.id] = password;
        this.select_notebook(notebook);
      }.bind(this);
      this.password_dialog_.show();
      return;
    }

    // Show the editor
    $('notebook').show();
    this.resize_editor();
    this.editor_.setProgressState(true);

    // Fetch content
    new Ajax.Request('/api/notebook/content', {
      method: 'get',
      parameters: {
        id: notebook.id
      },
      onSuccess: function(transport) {
        var data = transport.responseJSON;

        // Decrypt content
        content = data.content;
        if (notebook.encrypted && content != null) {
          var plaintext = AESDecryptCtr(content,
              this.cached_passwords_[notebook.id], 256);

          // Verify the password was correct by checking the hash
          var password_hash = plaintext.substr(0, 128);
          if (password_hash != hex_sha512(this.cached_passwords_[notebook.id])) {
            // Invalid password
            this.cached_passwords_[notebook.id] = null;
            this.editor_.setProgressState(false);
            this.select_notebook(notebook);
            return;
          }

          content = plaintext.substr(128);
        }

        if (content == null) content = '';

        // Update state
        var old_selected_notebook = this.selected_notebook_;
        this.selected_notebook_ = notebook;

        // Set the title
        $('notebook_name').setText(notebook.title);
        this.editor_.setContent('');

        // Update the lock icon
        $('notebook_unencrypted').setVisible(!notebook.encrypted);
        $('notebook_encrypted').setVisible(notebook.encrypted);

        // Set contents
        this.last_saved_content_ = content;
        this.editor_.setContent(content);
        this.editor_.setProgressState(false);

        // Update sidebar
        notebook.row.addClassName('selected');
        if (old_selected_notebook) {
          old_selected_notebook.row.removeClassName('selected');
        }
      }.bind(this)
    });
  },

  document_edited: function() {
    setTimeout(function() {
      if (this.autosave_timer_) {
        clearTimeout(this.autosave_timer_);
      }

      if (this.last_saved_content_ == this.editor_.getContent()) {
        this.set_save_state('saved');
      } else {
        this.set_save_state('unsaved');
        this.autosave_timer_ = setTimeout(this.save.bind(this), 5000);
      }
    }.bind(this), 100);
  },

  save: function() {
    if (this.autosave_timer_) {
      clearTimeout(this.autosave_timer_);
      this.autosave_timer_ = null;
    }

    if (this.selected_notebook_ == null) return;

    var content = this.editor_.getContent();
    if (this.last_saved_content_ == content) return;
    this.last_saved_content_ = content;

    if (this.selected_notebook_.encrypted) {
      var password = this.cached_passwords_[this.selected_notebook_.id];

      content = AESEncryptCtr(hex_sha512(password) + content, password, 256);
    }

    this.set_save_state('inprogress');

    new Ajax.Request('/api/notebook/content', {
      method: 'post',
      parameters: {
        id: this.selected_notebook_.id,
        content: content,
        encrypted: this.selected_notebook_.encrypted ? 1 : 0
      },
      onSuccess: function() {
        if (this.autosave_timer_) {
          return;
        }
        this.set_save_state('saved');
      }.bind(this)
    });
  },

  set_save_state: function(state) {
    $('notebook_save_done').setVisible(state == 'saved');
    $('notebook_save_inprogress').setVisible(state == 'inprogress');
    $('notebook_save_now').setVisible(state == 'unsaved');
  },

  create_new_dialog: function() {
    var input_field = new Element('input');

    var password_label = new Element('div').hide()
      .appendText('Enter a password:');
    var password_field = new Element('input').hide()
      .writeAttribute('type', 'password');

    var encrypted_field = new Element('input')
      .writeAttribute('type', 'checkbox')
      .writeAttribute('id', 'encrypted_field')
      .observe('click', function() {
        password_label.setVisible(this.checked);
        password_field.setVisible(this.checked);
      });
    var encrypted = new Element('div')
      .insert(encrypted_field)
      .insert(new Element('label')
        .appendText('Use encryption (AES 256)')
        .writeAttribute('for', encrypted_field.id));

    var dialog = new Dialog({
      title: 'Create a new notebook',
      image: '/images/goat1.jpg',
      height: '15em',
      contents: [
        new Element('div').appendText('Enter a title:'),
        input_field,
        encrypted,
        password_label,
        password_field
      ],
      buttons: {
        'OK': function() {
          if (input_field.value.length == 0) {
            alert('You must enter a name for the notebook');
            return;
          }
          if (encrypted_field.checked && password_field.value.length == 0) {
            alert('You must enter a password');
            return;
          }

          dialog.set_enabled(false);

          new Ajax.Request('/api/notebook/new', {
            method: 'post',
            parameters: {
              title:     input_field.value,
              encrypted: encrypted_field.checked ? 1 : 0
            },
            onSuccess: function(transport) {
              dialog.hide();
              this.update_notebooks();
            }.bind(this)
          });
        }.bind(this),
        'Cancel': function() { dialog.hide(); }
      }
    });
    this.new_dialog_ = dialog;
  },

  create_delete_dialog: function() {
    var dialog = new Dialog({
      title: 'Delete notebook',
      image: '/images/goat2.jpg',
      contents: [
        new Element('div').update('This will delete the notebook and ' +
            '<b>all</b> the notes inside it.'),
        new Element('div').appendText('Are you sure?')
      ],
      buttons: {
        "Yes I'm sure": function() {
          new Ajax.Request('/api/notebook/delete', {
            method: 'post',
            parameters: {
              id: this.selected_notebook_.id
            },
            onSuccess: function(transport) {
              dialog.hide();
              this.update_notebooks();
            }.bind(this)
          });
        }.bind(this),
        'Cancel': function() { dialog.hide(); }
      }
    });

    $('notebook_delete').observe('click', dialog.show.bind(dialog));
  },

  create_rename_dialog: function() {
    var input_field = new Element('input');

    var dialog = new Dialog({
      title: 'Rename notebook',
      image: '/images/goat3.jpg',
      contents: [
        new Element('div').appendText('Really?  I liked the old name.'),
        input_field
      ],
      buttons: {
        'Rename': function() {
          new Ajax.Request('/api/notebook/title', {
            method: 'post',
            parameters: {
              id: this.selected_notebook_.id,
              title: input_field.value
            },
            onSuccess: function(transport) {
              dialog.hide();
              this.update_notebooks();
            }.bind(this)
          });
        }.bind(this),
        'Cancel': function() { dialog.hide(); }
      }
    });

    $('notebook_rename').observe('click', function() {
      input_field.value = this.selected_notebook_.title;
      dialog.show();
    }.bind(this));
  },

  create_password_dialog: function() {
    var input_field = new Element('input')
      .writeAttribute('type', 'password');

    var dialog = new Dialog({
      title: 'Decrypt notebook',
      image: '/images/goat4.jpg',
      contents: [
        new Element('div').appendText('Enter the password for this notebook:'),
        input_field
      ],
      buttons: {
        'OK': function() {
          dialog.hide();
          dialog.on_password_entered(input_field.value);
        },
        'Cancel': function() {
          dialog.hide();
          if (this.selected_notebook_ == null) {
            $('notebook').hide();
          }
        }.bind(this)
      }
    });
    dialog.on_password_entered = function() {};

    this.password_dialog_ = dialog;
  },

  create_encrypt_dialog: function() {
    var input_field = new Element('input')
      .writeAttribute('type', 'password');

    var dialog = new Dialog({
      title: 'Encrypt notebook',
      image: '/images/goat5.jpg',
      contents: [
        new Element('div').appendText('Choose a password for this notebook:'),
        input_field
      ],
      buttons: {
        'OK': function() {
          this.cached_passwords_[this.selected_notebook_.id] =
              input_field.value;
          this.selected_notebook_.encrypted = true;
          this.last_saved_content_ = null; // To force a save
          this.save();
          this.update_notebooks();
          $('notebook_unencrypted').hide();
          $('notebook_encrypted').show();
          dialog.hide();
        }.bind(this),
        'Cancel': function() {
          dialog.hide();
        }
      }
    });
    dialog.on_password_entered = function() {};

    $('notebook_unencrypted').observe('click', dialog.show.bind(dialog));
  }
});

