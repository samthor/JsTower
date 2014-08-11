
window.$ = window.$ || function(id) {
  return document.getElementById(id);
};

window.log = window.log || function(message) {
  if (window.console && window.console.info) {
    window.console.info(message);
  } else {
    // this poor browser has no logging capability
  }
};

/**
 * onEachFrame defines a method that will request rendering at the refresh
 * rate of the machine; or failing that, at a rate of 60 FPS.
 */
(function() {
  var onEachFrame_;
  var active = true;

  if (window.webkitRequestAnimationFrame) {
    onEachFrame_ = function(cb) {
      var _cb = function() { cb(); if (active) { webkitRequestAnimationFrame(_cb); } }
      _cb();
    };
  } else if (window.mozRequestAnimationFrame) {
    onEachFrame_ = function(cb) {
      var _cb = function() { cb(); if (active) { mozRequestAnimationFrame(_cb); } }
      _cb();
    };
  } else {
    onEachFrame_ = function(cb, fps) {
      if (!fps) {
        fps = 60;
      }
      active = setInterval(cb, 1000 / fps);
    }
  }

  window.onEachFrame = function(cb, fps) {
    onEachFrame_(cb, fps);

    return function() {
      if (active == true) {
        active = false;
      } else {
        clearInterval(active);
      }
    };
  };
})();

/**
 * $.type returns a class generator method to generate classes with the given
 * definition. If the definition includes an 'init' method, then this is
 * automatically invoked on creation of the class.
 *
 * NOTE: $.type doesn't have a .prototype, if the 'type' object should be more
 * interesting then it might be appropriate to have it set.
 */
$.type = function(defn) {

  /** Obtain initFn from definition, remove it post-fun. */
  var initFn = defn.init;
  if (initFn == undefined) {
    initFn = function() {};
  }
  delete defn.init;

  /** Return a generator function for new instances of this class. */
  var fn = function() {
    initFn.apply(this, arguments);
    return this;
  };
  fn.prototype = defn;
  return fn;
};

function loadImage(src) {
  var img = new Image();
  img.src = src;
  return img;
}

function randomColor() {
  function r() {
    return 64 + Math.floor(Math.random()*128);
  }
  return 'rgb(' + r() + ', ' + r() + ', ' + r() + ')';
}

function randomPick(list) {
  var r = Math.floor(Math.random()*list.length);
  return list[r];
}

Math.randInt = Math.randInt || function(low, high) {
  return low + Math.floor(Math.random()*(high-low));
}

Math.norm = Math.norm || function(v) {
  return v / Math.abs(v);
}

Function.prototype.callIn = function(low, high) {
  var delay = low;
  if (high != undefined) {
    delay = Math.randInt(low, high);
  }
  return setTimeout(this, delay);
};

Function.prototype.bind = Function.prototype.bind || function(context) {
  var fn = this;
  return function() {
    return fn.apply(context, arguments);
  };
};
