
var tower = tower || {};

/**
 * Constructs a custom HTML Element. If there is a template matching 'tower-<name>', uses this
 * to create a Shadow DOM.
 * @param {string} name of element, used in 'tower-<name>'
 * @param {Function=} opt_callback to invoke on creation
 */
tower.registerPart = function(name, opt_callback) {
  var tag = 'tower-' + name;
  var me = document.currentScript.ownerDocument;
  var proto = Object.create(HTMLElement.prototype);

  var observeMap = {};
  var attrQueue = [];

  proto.createdCallback = function() {
    var template = me.getElementById(tag);
    if (template) {
      var shadow = this.createShadowRoot();
      var clone = document.importNode(me.getElementById(tag).content, true);
      shadow.appendChild(clone);
    }

    this.observeMap_ = {};
    var observer = new MutationObserver(this.didObserveChildren_.bind(this));
    observer.observe(this, { childList: true });
    window.setTimeout(this.didObserveChildren_.bind(this), 0);

    attrQueue.forEach(function(v) {
      var callback = function() {
        var data = {};
        v.attrs.forEach(function(attr) {
          var o = this.attributes[attr];
          if (!o) {
            data[attr] = null;
            return;
          }
          data[attr] = o.value;
        }, this);
        v.fn.call(this, data);
      }.bind(this);

      var o = new MutationObserver(callback);
      o.observe(this, { attributes: true, attributeFilter: v.attrs });
      window.setTimeout(callback);
    }, this);

    opt_callback && opt_callback.call(this);
  };

  proto.didObserveChildren_ = function() {
    // TODO(thorogood): O(n^2)...
    for (var childTag in observeMap) {
      var elements = [];

      for (var i = 0; i < this.children.length; ++i) {
        var child = this.children[i];
        if (child.tagName == childTag) {
          elements.push(child);
        }
      }

      var fn = observeMap[childTag];
      fn.call(this, elements);
    }
  };

  proto.didObserveAttrs_ = function() {
    observeAttrs.call(this);
  };

  var element = document.registerElement(tag, {prototype: proto});

  element.observeChildren = function(tag, fn) {
    if (tag instanceof Function) {
      tag = tag.name;
    } else {
      tag = 'tower-' + tag;
    }

    tag = tag.toUpperCase();
    // TODO: element id?
    observeMap[tag] = fn;
  };

  element.observeAttrs = function(attrs, fn) {
    if (attrs instanceof String) {
      attrs = [attrs];
    }
    attrQueue.push({attrs: attrs, fn: fn});
  };

  return element;
};

tower.childrenOfType = function(element, type) {
  var out = [];
  for (var i = 0; i < element.children.length; ++i) {
    var child = element.children[i];
    if (child instanceof type) {
      out.push(child);
    }
  }
  return out;
};

tower.randomChoice = function(array) {
  if (!array.length) {
    return null;
  }
  var i = Math.floor(Math.random() * array.length);
  return array[i];
};

tower.baseOf = function(element) {
  while (element && !(element instanceof TowerBase)) {
    element = element.parentElement;
  }
  return element;
};

tower.splitIntAttr = function(element, name) {
  var raw = element.getAttribute(name);
  if (raw) {
    return raw.split(',').map(function(v) {
      return parseInt(v);
    }).filter(function(v) {
      return !isNaN(v);
    });
  }
  return [];
};

/**
 * Polyfill for Math.sign.
 */
Math.sign = function(x) {
  if(isNaN(x)) {
    return NaN;
  } else if(x === 0) {
    return x;
  } else {
    return (x > 0 ? 1 : -1);
  }
};
