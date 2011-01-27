
var SIZE = {
  H: 36,
  W: 18,
};

var RES = {
  floor: loadImage('floor.png'),
  lift: loadImage('lift.png'),
  lobby: loadImage('lobby.png'),
  shaft: loadImage('shaft.png'),
  stairs: {
    l: loadImage('other/stairs-l.png'),
    r: loadImage('other/stairs-r.png'),
  },
  cafe: [
    loadImage('rooms/cafe1.png'),
    loadImage('rooms/cafe2.png'),
  ],
  office: [
    loadImage('rooms/office1.png'),
    loadImage('rooms/office2.png'),
    loadImage('rooms/office3.png'),
    loadImage('rooms/office4.png'),
  ],
};

var ROOM = {
  office: 1,
  cafe: 2,
};

var TowerBase = $.type({

  init: function(min, width) {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');

    this.floors = [];
    this.overlay = [];
    this.rooms = {};

    setInterval(function() {
      this.resetSize_();
      this.clearCanvas_();

      var context = this.canvas.getContext('2d');
      context.save();
      context.translate(this.midpoint, this.canvas.height);
      this.draw_(context);
      context.restore();
    }.bind(this), 50);
  },

  go: function() {
    var doSpawnFn = function() {
      this.spawn();
      doSpawnFn.callIn(750, 2000);
    }.bind(this);
    doSpawnFn();
  },

  addRoom: function(floor, at, room) {
    var width = room.width();

    // add floors that don't exist
    for (var i = this.floors.length; i <= floor; ++i) {
      this.floors.push({
        floor: i,
        at: at,
        width: 0,
        rooms: {},
      });
    }

    // grow to fit room
    for (var i = 0; i <= floor; ++i) {
      if (this.floors[i].at > at) {
        var mod = this.floors[i].at - at;
        this.floors[i].at -= mod;
        this.floors[i].width += mod;
      }
      if (this.floors[i].at + this.floors[i].width < at + width) {
        this.floors[i].width = (at+width)-this.floors[i].at;
      }
    }

    this.floors[floor].rooms[at] = room;
    if (!(room.type() in this.rooms)) {
      this.rooms[room.type()] = [];
    }
    this.rooms[room.type()].push({
      master: this,
      room: room,
      floor: floor,
    });
  },

  getRoomOfType: function(type) {
    if (type in this.rooms) {
      return randomPick(this.rooms[type]);
    }
    return null;
  },

  addLift: function(lift) {
    this.overlay.push(lift);
  },

  resetSize_: function() {
    if (this.canvas.width != this.canvas.scrollWidth) {
      this.canvas.width = this.canvas.scrollWidth;
    }
    if (this.canvas.height != this.canvas.scrollHeight) {
      this.canvas.height = this.canvas.scrollHeight;
    }
    this.midpoint = Math.floor(this.canvas.width / 2);
  },

  clearCanvas_: function() {
    var context = this.canvas.getContext('2d');
    context.save();
    context.globalCompositeOperation = "copy";
    context.fillStyle = 'rgba(0,0,0,0.0)';
    context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    context.restore();
  },

  draw_: function(context) {
    context.save();
    var lobby = true;

    this.floors.forEach(function(floor) {
      context.translate(0, -SIZE.H);
      context.drawImage(RES.stairs.l, floor.at*SIZE.W-RES.stairs.l.width, 0);
      context.drawImage(RES.stairs.r, (floor.at+floor.width)*SIZE.W, 0);

      context.save();
      if (lobby) {
        lobby = false;

        context.beginPath();
        context.rect(floor.at*SIZE.W, 0, floor.width*SIZE.W, SIZE.H);
        context.clip();

        var start = Math.ceil((floor.at*SIZE.W-RES.lobby.width)/RES.lobby.width)*RES.lobby.width;
        while (start < (floor.at+floor.width)*SIZE.H) {
          context.drawImage(RES.lobby, start, 0);
          start += RES.lobby.width;
        }
      } else {
        context.save();
        context.translate(floor.at*SIZE.W, 0);
        context.scale(floor.width, 1);
        context.drawImage(RES.floor, 0, 0);
        context.restore();

        for (var at in floor.rooms) {
          var room = floor.rooms[at];
          context.save();
          context.translate(at*SIZE.W, 0);
          room.draw(context);
          context.restore();
        }
      }
      context.restore();
    }.bind(this));
    context.restore();

    this.overlay.forEach(function(item) {
      context.save();
      context.translate(item.at*SIZE.W, -item.base*SIZE.H);
      item.draw(context);
      context.restore();
    }.bind(this));
  },

  /** Spawns a new person to live in TowerBase. */
  spawn: function() {
    // TODO: Change this, maybe the 'room' should spawn a person that wants to come here?
    var workplace = this.getRoomOfType(ROOM.office);
    var p = new TowerPerson(this, workplace);
    var hungry = true;
    var tower = this;

    var workFn = function() {
      (function() {
        if (hungry) {
          hungry = false;
          p.travelTo(tower.getRoomOfType(ROOM.cafe), function() {
            workFn.callIn(2500, 3500);
          });
        } else {
          p.travelTo(null, null);
        }
      }.callIn(9000, 15000));
    };

    p.travelTo(workplace, workFn);
  },

});

var TowerPerson = $.type({

  init: function(tower, workplace) {
    this.tower_ = tower;
    this.workplace_ = workplace;

    this.floor_ = 0;
    this.target_ = null;
    this.target_done_ = null;
    this.owner_ = null;
    this.think_ = null;
  },

  /**
   * Requests that this person travel to the given room.
   */
  travelTo: function(target, callback) {
    if (this.owner_) {
      var index = this.owner_.people.indexOf(this);
      this.owner_.people.splice(index, 1);
    }
    this.target_ = target;
    this.target_done_ = callback; // TODO: invoke if already set?
    this.go_();
  },

  go_: function() {
    if (this.floor_ == this.targetFloor()) {
      if (this.target_ == null) {
        // We've escaped the building! Don't do anything else.
      } else {
        // Push this person onto the stack of this room.
        // TODO: make a room method .welcome(person);
        this.owner_ = this.target_.room;
        this.target_.room.people.push(this);
        this.target_ = null;
      }
      if (this.target_done_) {
        this.target_done_(this);
        this.target_done_ = null;
      }
      return false; // success/done
    }

    // Otherwise, we're still trying to get to out floor.
    // TODO: look for a more correct lift
    this.tower_.overlay[0].wait(this, this.floor_, this.targetFloor());
  },

  targetFloor: function() {
    return this.target_ && this.target_.floor || 0;
  },

  dropAtFloor: function(floor) {
    this.floor_ = floor;
    this.go_();
  },

});

var RoomOffice = $.type({

  init: function() {
    this.people = [];
    this.img_ = randomPick(RES.office);
    this.width_ = Math.ceil(this.img_.width / SIZE.W);
  },
/*
  go: function(master, defn) {
    var staff = [];
    for (var i = 0; i < Math.randInt(4, 6); ++i) {
      staff.push(new TowerPerson(master, this));
    }
    for (var i = 0; i < staff.length; ++i) {
      staff[i].go();
    }
  },
*/
  width: function() { return this.width_; },
  type: function() { return ROOM.office; },

  draw: function(context) {
    context.drawImage(this.img_, 0, SIZE.H-this.img_.height);
    context.font = 'bold 22pt sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = 'white';
    context.fillText('' + this.people.length, (this.width_ * SIZE.W / 2), (SIZE.H/2));
  },

});

var RoomCafe = $.type({

  init: function() {
    this.people = [];
    this.img_ = randomPick(RES.cafe);
    this.width_ = Math.ceil(this.img_.width / SIZE.W);
  },

  width: function() { return this.width_; },
  type: function() { return ROOM.cafe; },

  draw: function(context) {
    context.drawImage(this.img_, 0, SIZE.H-this.img_.height);
    context.font = 'bold 22pt sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = 'white';
    context.fillText('' + this.people.length, (this.width_ * SIZE.W / 2), (SIZE.H/2));
  },

});

var TowerLift = $.type({

  init: function(at, height) {
    this.people = [];
    this.waiting_ = {};
    this.base = 0;
    this.height = height;
    this.at = at;
    this.floor = 0;
    this.mod = 0.0; // modifier, must be -1.0 < mod < 1.0

    this.direction_ = 0;
    this.doing_ = false;
    this.pending_do_ = [];
  },

  draw: function(context) {

    var height = this.height * SIZE.H;
    var x = -SIZE.W;
    var y = -(this.height * SIZE.H);
    var width = 2 * SIZE.W;

    context.save();
    context.globalAlpha = 0.5;
    for (var i = 0; i < this.height; ++i) {
      context.drawImage(RES.shaft, x, y + (SIZE.H*i));
    }
    context.restore();

    var car_y = y + (this.height - this.floor - 1) * SIZE.H;
    car_y -= this.mod*SIZE.H;

    context.save();
    context.drawImage(RES.lift, x, car_y);
    context.restore();

    var text = "";
    if (this.direction_ != 0) {
      if (this.direction_ > 0) {
        text += "↥";
      } else {
        text += "↧";
      }
    }
    if (this.people.length > 0) {
      text += this.people.length;
    }
    if (text != "") {
      context.fillStyle = 'black';
      context.font = 'bold 11pt sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, 0, car_y+(SIZE.H/2)-2);
    }

    context.fillStyle = 'red';
    context.font = 'bold 9pt sans-serif';
    context.textBaseline = 'bottom';
    context.textAlign = 'left';

    for (var floor in this.waiting_) {
      context.fillText(this.waiting_[floor].length, x, y+(this.height - floor)*SIZE.H);
    }
  },

  /** This person wants to wait at our lift. Crazy! */
  /** TODO: Change to callTo? */
  wait: function(person, floor, target) {
    floor = floor || 0;
    target = target || 0;

    if (floor == target) {
      throw new Exception("person can't wait for lift going to same floor")
    }

    var d = (target - floor) / Math.abs(target - floor);
    log('p waiting at floor: ' + floor + ', dir: ' + (d > 0 && 'up' || 'down'));

    // TODO: do something with the direction.
    if (!(floor in this.waiting_)) {
      this.waiting_[floor] = [];
    }
    this.waiting_[floor].push(person);

    this.think();
  },

  /* do_ calls the given function, allowing some processing to happen
   * before release.
   */
  do_: function(fn, delay) {
    if (fn == null || typeof(fn) != 'function') {
      throw Exception('oh no');
    }

    if (delay != undefined) {
      var real_fn = fn;
      fn = function(callback) {
        setTimeout(function() {
          real_fn(callback);
        }, delay);
      }
    }

    if (!this.doing_) {
      this.doing_ = true;
      var callback = function() {
        var todo = this.pending_do_.shift();
        if (todo != null) {
          todo(callback);
        } else {
          this.doing_ = false;
          this.think();
        }
      }.bind(this);
      fn(callback);
    } else {
      this.pending_do_.push(fn);
    }
  },

  think: function() {
    if (this.doing_) {
      return false; // we are guaranteed to get called back later
    }

    // we're at a floor ready to do something
    log('working at floor: ' + this.floor);

    // drop people off at this floor
    var target = 0;
    var findNext = function(i) {
      for ( ; i < this.people.length; ++i) {
        if (this.people[i].targetFloor() == this.floor) {
          return i;
        }
      }
      return -1;
    }.bind(this);

    target = findNext(target);
    if (target != -1) {
      var timeout = 500;
      var dropFn = function(done) {
        timeout /= 2;

        // remove person from lift, invoke dropAtFloor().
        var person = this.people[target];
        this.people.splice(target, 1);
        person.dropAtFloor(this.floor);

        target = findNext(target);
        if (target != -1) {
          this.do_(dropFn, timeout);
        }
        done();
      }.bind(this);
      this.do_(dropFn, timeout);
      return true;
    } else {
      // no more people to drop off
    }

    // pick people up from this floor
    // TODO: pick people up who want to go in our direction
    if (this.floor in this.waiting_) {
      var timeout = 500;
      var pick_fn = function(done) {
        timeout /= 2;
        if (this.waiting_[this.floor].length > 0) {
          this.people.push(this.waiting_[this.floor].shift());
          this.do_(pick_fn, timeout);
        } else {
          // done, clear this waiting state
          delete this.waiting_[this.floor];
        }
        done(); // always must get done
      }.bind(this);
      this.do_(pick_fn, timeout);
      return true;
    }
    
    // then search for a new floor (people waiting)
    // if *any* person wants to go in this.direction_, preference them.
    var end_target = -1;
    var candidates = false;
    for (var i in this.people) {
      candidates = true;
      var tgt = this.people[i].targetFloor();
      var direction = Math.norm(tgt - this.floor);

      if (end_target == -1 || Math.abs(tgt - this.floor) < Math.abs(end_target - this.floor)) {
        if (this.direction_ == 0 || direction == this.direction_) {
          end_target = tgt;
        }
      }
    }

    // we might find someone closer in this direction
    for (var i = 0; i < this.height; ++i) {
      if (i in this.waiting_) {
        candidates = true;
        var direction = Math.norm(i - this.floor);
        if (end_target == -1 || Math.abs(i - this.floor) < Math.abs(end_target - this.floor)) {
          if (this.direction_ == 0 || direction == this.direction_) {
            end_target = i;
          }
        }
      }
    }

    // if no-one is available in the right direction, then give up and try again
    if (candidates && end_target == -1 && this.direction_ != 0) {
      this.direction_ = 0;
      this.do_(function(done) {
        done();
      });
      return true;
    }

    if (end_target != -1) {
      var mod = end_target - this.floor;
      this.direction_ = Math.norm(mod);

      log('jumping to floor: ' + end_target);

      this.do_(function(callback) {
        var thinkTime = 25; // can probably be higher ;-)
        var change = end_target - this.floor;
        var duration = 250 + Math.abs(change)*250;
        var step = change/duration*thinkTime;
  
        var interval = setInterval(function() {
          this.mod += step;

          if (Math.abs(this.mod) >= Math.abs(change)) {
            clearInterval(interval);
  
            this.thinking = false;
            this.floor = end_target;
            this.mod = 0;
            callback();
          }
        }.bind(this), thinkTime);
      }.bind(this));
    } else {
      this.direction_ = 0;
    }
  },

});
