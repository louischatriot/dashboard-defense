var field   // Global variable to use field eeverywhere
  , scale = 50   // Size of a chunk in pixels
  ;

// Playing field
// Coordinates vary from 0 to width - 1 and 0 to height - 1
function Field(width, height) {
  this.width = width;
  this.height = height;




}



// A key (bad guy!) allocated on a Field
// If no starting coordinates are given, use randomly scattered at the top of the screen
function Key(field, x, y) {
  this.x = x || Math.floor(field.width * Math.random());
  this.y = y || Math.floor(4 * Math.random());
}

// Draw the Key at the current coordinate. Create the element if it doesn't exist
Key.prototype.draw = function () {
  if (!this.$element) {
    this.$element = $('<div class="key"></div>');
    $('body').append(this.$element);
  }

  this.$element.css("left", this.x * scale + 'px');
  this.$element.css("top", this.y * scale + 'px');
}






// Initialize
function init() {
  field = new Field(12, 28);

  var key = new Key(field);

  key.draw();
}


init();

