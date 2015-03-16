function add_element_extensions() {
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
}
