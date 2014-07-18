var field   // Global variable to use field eeverywhere
  , scale = 25   // Size of a chunk in pixels
  , keySpeed = 0.6   // Time in seconds to move from one position to the next
  , EMPTY_CASE = 0
  , DASHBOARD = 1
  , $ghostDashboard = $('<div class="ghost dashboard"></div>')
  , inDashboardPlacementMode = false
  , dashboardsLeft = 10
  , keysToKill = 8
  ;

// Pubsub, only one message allowed but it can be an object
// This makes all objects from given constructor event emitters
function makeEventEmitter (Constructor) {
  Constructor.prototype.on = function (evt, action) {
    if (!this.events[evt]) { this.events[evt] = []; }
    this.events[evt].push(action);
  };

  Constructor.prototype.trigger = function (evt, msg) {
    if (!this.events[evt]) { return; }

    for (var i = 0; i < this.events[evt].length; i += 1) {
      this.events[evt][i](msg);
    }
  };
}



// Playing field
// Coordinates vary from 0 to width - 1 and 0 to height - 1
function Field(width, height) {
  var i, j;

  this.width = width;
  this.height = height;
  this.$container = $('<div class="container"></div>');
  this.$container.css("width", (scale * this.width) + 'px');
  this.$container.css("height", (scale * this.height) + 'px');
  $('body').append(this.$container);

  // Initializing matrix
  this.matrix = [];
  for (i = 0; i < this.width; i += 1) {
    this.matrix[i] = [];
    for (j = 0; j < this.height; j += 1) {
      this.matrix[i][j] = EMPTY_CASE;
    }
  }

  // Initialize pubsub
  this.events = {};
}
makeEventEmitter(Field);



// A key (bad guy!) allocated on a Field
// If no starting coordinates are given, use randomly scattered at the top of the screen
function Key(field, x, y) {
  this.x = x || Math.floor(field.width * Math.random());
  this.y = y || Math.floor(4 * Math.random());
  this.controlPoints = [];
}
makeEventEmitter(Key);

// Draw the Key at the current coordinate. Create the element if it doesn't exist
Key.prototype.draw = function () {
  if (!this.$element) {
    this.$element = $('<div class="key"></div>');
    this.$element.css("width", scale + 'px');
    this.$element.css("height", scale + 'px');
    $('body').append(this.$element);
  }

  this.$element.css("left", this.x * scale + 'px');
  this.$element.css("top", this.y * scale + 'px');
};

// Set destination
Key.prototype.setDestination = function (x, y) {
  this.controlPoints = [{x: x, y: y}];
};

// Move one step
Key.prototype.move = function () {
  if (this.controlPoints.length === 0) { return; }

  var target = this.controlPoints[0];

  // Arrived at the control point, try to move to the next immediately
  if (target.x === this.x && target.y === this.y) {
    this.controlPoints = this.controlPoints.slice(1);
    return this.move();
  }

  // If already on the right place in one dimension, move on the other
  if (target.x === this.x) {
    this.y += this.y > target.y ? -1 : 1;
    return;
  }
  if (target.y === this.y) {
    this.x += this.x > target.x ? -1 : 1;
    return;
  }

  // Choose at random one direction to move to
  if (Math.random() >= 0.5) {
    this.x += this.x > target.x ? -1 : 1;
  } else {
    this.y += this.y > target.y ? -1 : 1;
  }
};



// A dashboard (good guy!)
function Dashboard(field, x, y) {
  this.x = x;
  this.y = y;
  field.matrix[x][y] = DASHBOARD;
}

// Draw the dashboard. Could factor with the Key drawing function ...
Dashboard.prototype.draw = function () {
  if (!this.$element) {
    this.$element = $('<div class="dashboard"></div>');
    this.$element.css("width", scale + 'px');
    this.$element.css("height", scale + 'px');
    $('body').append(this.$element);
  }

  this.$element.css("left", this.x * scale + 'px');
  this.$element.css("top", this.y * scale + 'px');
};



// Tower placement mode
function initTowerPlacementMode(field) {
  field.$container.on('mousemove', function (evt) {
    if (!inDashboardPlacementMode) { return; }

    var mx = evt.pageX, my = evt.pageY
      , x = Math.floor(mx / scale)
      , y = Math.floor(my / scale) 
      ;

    $ghostDashboard.css("display", "block");
    $ghostDashboard.css("left", x * scale + 'px');
    $ghostDashboard.css("top", y * scale + 'px');

    // Don't display it out of bounds
    if (x >= field.width || y >= field.height) {
      $ghostDashboard.css("display", "none");
    }
  });

  field.$container.on('click', function (evt) {
    if (!inDashboardPlacementMode) { return; }

    var mx = evt.pageX, my = evt.pageY
      , x = Math.floor(mx / scale)
      , y = Math.floor(my / scale) 
      ;

    // Create and draw dashboard
    var d = new Dashboard(field, x, y);
    d.draw();

    updateDashboardCount(-1);
  });
}



// Initialize
function init() {
  field = new Field(12, 28);

  // Create ghost piece
  $ghostDashboard.css("width", scale + 'px');
  $ghostDashboard.css("height", scale + 'px');
  $ghostDashboard.css("display", "none");
  field.$container.append($ghostDashboard);
}



// Manage dashboard placement mode
function updateDashboardCount (delta) {
  dashboardsLeft += delta || 0;

  $("#dashboard-count").html(dashboardsLeft + ' dashboards left to place');

  if (dashboardsLeft === 0) { 
    leaveDashboardPlacement();
  }
}

function switchToDashboardPlacement () {
  inDashboardPlacementMode = true;
  $('#place-dashboards').removeAttr("disabled");
  $('#place-dashboards').attr("value", "Stop placing dashboards");
}

function leaveDashboardPlacement () {
  inDashboardPlacementMode = false;
  if (dashboardsLeft > 0) {
    $('#place-dashboards').attr("value", "Start placing dashboards");
  } else {
    $('#place-dashboards').attr("disabled", "true");
    $('#place-dashboards').attr("value", "No dashboard left");
  }
}

$('#place-dashboards').on('click', function () {
  if (inDashboardPlacementMode) {
    leaveDashboardPlacement();
  } else {
    switchToDashboardPlacement();
  }
});



// Manage fight start
function startFight (field) {
  var key;

  while (keysToKill > 0) {
    key = new Key(field);
    key.draw();
    key.setDestination(6, 27);
    // Use a closure to not share the same variable
    field.on('tick', (function (key) { return function () {
      key.move();
      key.draw();
    }})(key));

    keysToKill -= 1;
  }
}

$('#start-fight').on('click', function () {
  startFight(field);
});


// Play
init();
updateDashboardCount();
initTowerPlacementMode(field);







