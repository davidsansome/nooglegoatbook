var Dialog = Class.create({
  initialize: function(args) {
    this.buttons_ = [];
    this.form_elements_ = [];
    var buttons = new Element('div').addClassName('buttons');

    $H(args.buttons).each(function(pair) {
      var button = new Element('input')
        .writeAttribute('type', 'button')
        .writeAttribute('value', pair.key)
        .observe('click', pair.value);
      buttons.insert(button);
      this.buttons_.push(button);
    }, this);

    var contents = new Element('div').addClassName('contents')
      .insert(new Element('img')
        .addClassName('goat')
        .writeAttribute('src', args.image));
    args.contents.each(function(item) {
      contents.insert(item);

      // Save any form elements for later, and install event handlers on
      // each one
      if (item instanceof Element &&
          item.nodeName == "INPUT" &&
          item.type != "button") {
        this.form_elements_.push(item);
        item.observe('keyup', function(event) {
          if (event.keyCode == 13) {
            // Press the first button
            ($H(args.buttons).values()[0])();
          }
        });
      }
    }.bind(this));
    contents.insert(buttons);

    this.dialog_ = new Element('div').addClassName('dialog').hide()
      .insert(new Element('h4').appendText(args.title))
      .insert(contents);

    if (args['height']) {
      this.dialog_.setStyle({ height: args.height });
    }

    $('dialog_container').appendChild(this.dialog_);
  },
  show: function() {
    Effect.Appear('whitescreen', { to: 0.75 });
    this.set_enabled(true);
    this.dialog_.show();

    // Clear all form elements
    this.form_elements_.each(function(item) { item.clear(); });

    // Focus the first one
    if (this.form_elements_.length >= 1) {
      this.form_elements_[0].focus();
    }
  },
  hide: function() {
    Effect.Fade('whitescreen', { from: 0.75 });
    this.dialog_.hide();
  },
  set_enabled: function(value) {
    this.buttons_.each(function(item) { item.enabled = value; });
  }
});
