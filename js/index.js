var field   // Global variable to use field eeverywhere
  , scale = 25   // Size of a chunk in pixels
  , badgeScale = 25   // Size of a badge in pixels
  , keySpeed = 10   // Number of ticks between two key movements
  , badgeSpeed = 2   // Number of ticks between two badge movements
  , dashboardAttackRate = 5   // Number of ticks between two dashboard attacks
  , tickDuration = 100   // Duration of tick in ms
  , keyBaseHP = 8
  , EMPTY_CASE = 0
  , DASHBOARD = 1
  , $ghostDashboard = $('<div class="ghost dashboard"></div>')
  , inDashboardPlacementMode = false
  , dashboardsLeft = 10
  , keysToKill = 8
  , lost = false
  ;



// Playing field
// Coordinates vary from 0 to width - 1 and 0 to height - 1
function Field(width, height) {
  var i, j;

  this.width = width;
  this.height = height;
  this.keys = [];
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

// Pubsub
Field.prototype.on = function (evt, action) {
  if (!this.events[evt]) { this.events[evt] = []; }
  this.events[evt].push(action);
};

Field.prototype.trigger = function (evt, msg) {
  if (!this.events[evt]) { return; }

  for (var i = 0; i < this.events[evt].length; i += 1) {
    this.events[evt][i](msg);
  }
};



// A key (bad guy!) allocated on a Field
// If no starting coordinates are given, use randomly scattered at the top of the screen
function Key(field, x, y) {
  this.x = x || Math.floor(field.width * Math.random());
  this.y = y || Math.floor(4 * Math.random());
  this.controlPoints = [];
  field.keys.push(this);
  this.field = field;
  this.hp = keyBaseHP;
  this.targettedBy = [];
}

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

// Move one step towards destination
Key.prototype.move = function () {
  if (this.controlPoints.length === 0) { return this.checkEndReached(); }

  var target = this.controlPoints[0];

  // Arrived at the control point, try to move to the next immediately
  if (target.x === this.x && target.y === this.y) {
    this.controlPoints = this.controlPoints.slice(1);
    return this.move();
  }

  // If already on the right place in one dimension, move on the other
  if (target.x === this.x) {
    this.y += this.y > target.y ? -1 : 1;
    return this.checkEndReached();
  }
  if (target.y === this.y) {
    this.x += this.x > target.x ? -1 : 1;
    return this.checkEndReached();
  }

  // Choose at random one direction to move to
  if (Math.random() >= 0.5) {
    this.x += this.x > target.x ? -1 : 1;
  } else {
    this.y += this.y > target.y ? -1 : 1;
  }
  return this.checkEndReached();
};

Key.prototype.checkEndReached = function () {
  if (this.y >= field.height - 1) {
    field.trigger('game lost');
  }
};

// TODO: better way to remove a key from the field, this is ugly
Key.prototype.hit = function () {
  this.hp -= 1;
  if (this.hp === 0) {
    this.setDestination(this.x, this.y);   // Stop moving
    this.$element.css('display', 'none');
    this.field.keys = _.without(this.field.keys, this);
    this.targettedBy.forEach(function(badge) {
      badge.$element.css('display', 'none');
    });
  }
}



// A dashboard (good guy!)
function Dashboard(field, x, y) {
  this.x = x;
  this.y = y;
  field.matrix[x][y] = DASHBOARD;
  this.field = field;
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

// Try to find a key to attack
Dashboard.prototype.tryToAttack = function () {
  console.log("Try to attack");
  
  if (this.field.keys.length > 0) {
    new Badge(this, this.field.keys[0]);
  }
};



// A badge (an attack!)
function Badge(dashboard, key) {
  this.x = dashboard.x;
  this.y = dashboard.y;
  this.target = key;
  this.hitTarget = false;
  key.targettedBy.push(this);

  dashboard.field.on('tick', (function(badge) { var count = 0; return function () {
    if (count % badgeSpeed === 0) {
      console.log("BADGE Is TRYING TO MOVE");
      badge.draw();
      badge.move();
    }

    count += 1;
  }})(this));
}

// Draw the badge. Could factor with the Key drawing function ...
Badge.prototype.draw = function () {
  if (!this.$element) {
    this.$element = $('<div class="badge"></div>');
    this.$element.css("width", badgeScale + 'px');
    this.$element.css("height", badgeScale + 'px');
    $('body').append(this.$element);
  }

  this.$element.css("left", this.x * scale + 'px');
  this.$element.css("top", this.y * scale + 'px');
};

Badge.prototype.move = function () {
  if (this.x === this.target.x && this.y === this.target.y) {
    if (!this.hitTarget) {
      this.target.hit();
      this.hitTarget = true;
      this.$element.css('display', 'none');
    }
    return;
  }

  if (this.x === this.target.x) {
    this.y += this.y > this.target.y ? -1 : 1;
  } else {
    this.x += this.x > this.target.x ? -1 : 1;
  }
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
    // Use a closure to not share the same variable
    field.on('tick', (function (dashboard) { var count = 0; return function () {
      if (count % dashboardAttackRate === 0) {
        dashboard.tryToAttack();
      }
      count += 1;
    }})(d));

    updateDashboardCount(-1);
  });

  field.$container.on('mouseout', function () {
    $ghostDashboard.css("display", "none");
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

  field.on('game lost', function() {
    if (lost) { return; }
    lost = true;
    alert('One key made it through, you lose!');
  });
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

  // Create keys
  while (keysToKill > 0) {
    key = new Key(field);
    key.draw();
    key.setDestination(Math.floor(field.width * Math.random()), field.height - 1);
    // Use a closure to not share the same variable
    field.on('tick', (function (key) { var count = 0; return function () {
      if (count % keySpeed === 0) {
        key.move();
        key.draw();
      }
      count += 1;
    }})(key));

    keysToKill -= 1;
  }

  // Tick
  setInterval(function() {
    field.trigger('tick');
  }, tickDuration);
}

$('#start-fight').on('click', function () {
  startFight(field);
});


// Play
init();
updateDashboardCount();
initTowerPlacementMode(field);







