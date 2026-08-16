console.log("helpers-full.js says hi");


/* helpers-full.js
 * Student-friendly helper functions for building interactive apps (App Lab–style).
 * Include AFTER your HTML elements.
 * 
 * Includes all helper functions in App Lab.
 *
 * Example:
 *   <script src="helpers-full.js"></script>
 *
 * Notes:
 * - Use IDs on all interactive elements. These helpers target by id.
 * - "Screens": use ids that start with "screen" (e.g., screenHome, screenGame).
 *
 * ---------------------------------------------------------------------------
 * onEvent(id, type, callback)
 * setProperty(id, property, value)
 * getProperty(id, property)
 * setText(id, text)
 * getText(id)
 * setValue(id, value)
 * getValue(id)
 * image(id, url)
 * setImageURL(id, url)
 * playSound(url, loop)
 * showElement(id)
 * hideElement(id)
 * toggleElement(id)
 * setScreen(screenId)          // switch screens using id^="screen"
 * setPosition(id, left, top, width, height)
 * setSize(id, width, height)
 * addClass(id, className)
 * removeClass(id, className)
 * hasClass(id, className)
 * setStyle(id, cssText)
 * setHTMLProperty(id, property, value)
 * ---------------------------------------------------------------------------
 */

/**
 * Run code when the user interacts with an element.
 * @example
 * function handleClick() { setText("status", "Clicked!"); }
 * onEvent("myButton", "click", handleClick);
 */
function onEvent(id, type, callback) {
  var node = document.getElementById(id);
  if (!node) {
    console.error("onEvent: No element with id='" + id + "'");
    return;
  }
  if (typeof callback !== "function") {
    console.error("onEvent: callback must be a function");
    return;
  }
  node.addEventListener(type, callback);
}

/**
 * Change how an element looks or behaves using CSS-style properties.
 * Accepts JS-style property names (e.g., backgroundColor, fontSize).
 * Numeric values auto-append 'px' for: width, height, left, top, right, bottom, fontSize, min/maxWidth, min/maxHeight.
 * @param {string} id
 * @param {CssProperty} property
 * @param {string|number} value
 * @example setProperty("title", "color", "blue");
 */
function setProperty(id, property, value) {
  var node = document.getElementById(id);
  if (!node) {
    console.error("setProperty: No element with id='" + id + "'");
    return;
  }

  if (property === "text") {
    console.warn("setProperty: Use setText() for labels or setValue() for inputs.");
    return;
  }

  var needsPx = [
    "width", "height", "left", "top", "right", "bottom", "fontSize",
    "minWidth", "maxWidth", "minHeight", "maxHeight"
  ];
  if (typeof value === "number" && needsPx.indexOf(property) !== -1) {
    value = value + "px";
  }

  if (property in node.style) {
    node.style[property] = value;
  } else {
    console.warn("setProperty: Property '" + property + "' not recognized on #" + id);
  }
}

/**
 * Read a CSS property from an element. Returns inline style if set; otherwise computed style.
 * @example var color = getProperty("title", "color");
 */
function getProperty(id, property) {
  var node = document.getElementById(id);
  if (!node) {
    console.error("getProperty: No element with id='" + id + "'");
    return "";
  }
  if (property in node.style && node.style[property]) {
    return node.style[property];
  }
  var cs = window.getComputedStyle ? window.getComputedStyle(node) : null;
  if (cs && property in cs) {
    return cs[property];
  }
  console.warn("getProperty: Property '" + property + "' not recognized on #" + id);
  return "";
}

/**
 * Change the words inside a label, div, span, or button.
 * @example setText("greeting", "Hello!");
 */
function setText(id, text) {
  var node = document.getElementById(id);
  if (!node) {
    console.error("setText: No element with id='" + id + "'");
    return;
  }

  var tag = node.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea") {
    console.error("setText: Use setValue() for inputs or textarea elements.");
    return;
  }

  node.textContent = text;
}

/**
 * Read the words inside a label, div, span, button,
 * OR the value of an input/textarea (student-friendly convenience).
 * @example var t = getText("greeting");
 */
function getText(id) {
  var node = document.getElementById(id);
  if (!node) {
    console.error("getText: No element with id='" + id + "'");
    return "";
  }

  var tag = node.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea") {
    return node.value;
  } else {
    return node.textContent;
  }
}

/**
 * Set the value of an input or textarea element.
 * @example setValue("nameInput", "Ada");
 */
function setValue(id, value) {
  var node = document.getElementById(id);
  if (!node) {
    console.error("setValue: No element with id='" + id + "'");
    return;
  }

  var tag = node.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") {
    node.value = value;
  } else {
    console.error("setValue: Element with id='" + id + "' is not an input, textarea, or select.");
  }
}

/**
 * Get the value of an input, textarea, or select element.
 * @example var name = getValue("nameInput");
 */
function getValue(id) {
  var node = document.getElementById(id);
  if (!node) {
    console.error("getValue: No element with id='" + id + "'");
    return "";
  }

  var tag = node.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") {
    return node.value;
  } else {
    console.error("getValue: Element with id='" + id + "' is not an input, textarea, or select.");
    return "";
  }
}

/**
 * Create or update an <img> element with the given id and url.
 * Appends to <body> if not present.
 * @example image("photo", "https://example.com/cat.png");
 */
function image(id, url) {
  var node = document.getElementById(id);

  if (node && node.tagName.toLowerCase() !== "img") {
    console.error("image: Element with id='" + id + "' exists but is not an <img>. Replacing it.");
    node.parentNode.removeChild(node);
    node = null;
  }

  if (!node) {
    node = document.createElement("img");
    node.id = id;
    node.alt = id;
    document.body.appendChild(node);
  }

  node.src = url;
}

/**
 * App Lab–style name for setting an image URL on an existing <img>.
 * If it doesn't exist, creates one (like image()).
 * @example setImageURL("photo", "https://example.com/cat.png");
 */
function setImageURL(id, url) {
  image(id, url);
}

/**
 * Play a sound file. Some browsers require user interaction first.
 * @example playSound("ding.mp3"); playSound("loop.mp3", true);
 */
function playSound(url, loop) {
  try {
    var audio = new Audio(url);
    if (loop) {
      audio.loop = true;
    }
    var playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(function () {
        console.warn("playSound: Could not play '" + url + "'. Some browsers require user interaction first.");
      });
    }
  } catch (e) {
    console.error("playSound: " + e);
  }
}

/**
 * Show an element (display: "").
 * @example showElement("menu");
 */
function showElement(id) {
  setProperty(id, "display", "");
}

/**
 * Hide an element (display: "none").
 * @example hideElement("menu");
 */
function hideElement(id) {
  setProperty(id, "display", "none");
}

/**
 * Toggle an element's visibility.
 * @example toggleElement("menu");
 */
function toggleElement(id) {
  var node = document.getElementById(id);
  if (!node) {
    console.error("toggleElement: No element with id='" + id + "'");
    return;
  }
  var isHidden = (node.style.display === "none");
  setProperty(id, "display", isHidden ? "" : "none");
}

/**
 * Switch to the given screen and hide all others.
 * "Screens" are elements whose id starts with "screen".
 * Uses setProperty to control display: active screen gets "", others get "none".
 * @example setScreen("screenGame");
 */
function setScreen(screenId) {
  var screens = document.querySelectorAll("[id^='screen']");
  if (screens.length === 0) {
    console.warn("setScreen: No elements found with id starting with 'screen'.");
  }

  var found = false;
  for (var i = 0; i < screens.length; i++) {
    var sec = screens[i];
    if (sec.id === screenId) {
      setProperty(sec.id, "display", "");    // remove inline display → back to default/stylesheet
      found = true;
    } else {
      setProperty(sec.id, "display", "none"); // hide others
    }
  }

  if (!found) {
    console.error("setScreen: No screen with id='" + screenId + "' found.");
  }
}

/**
 * Set absolute position and size (px). Useful for quick layout demos.
 * @example setPosition("box", 20, 40, 200, 100);
 */
function setPosition(id, left, top, width, height) {
  var node = document.getElementById(id);
  if (!node) {
    console.error("setPosition: No element with id='" + id + "'");
    return;
  }
  node.style.position = "absolute";
  node.style.left = typeof left === "number" ? left + "px" : left;
  node.style.top = typeof top === "number" ? top + "px" : top;
  if (typeof width !== "undefined") {
    node.style.width = typeof width === "number" ? width + "px" : width;
  }
  if (typeof height !== "undefined") {
    node.style.height = typeof height === "number" ? height + "px" : height;
  }
}

/**
 * Set size (px).
 * @example setSize("photo", 120, 120);
 */
function setSize(id, width, height) {
  var node = document.getElementById(id);
  if (!node) {
    console.error("setSize: No element with id='" + id + "'");
    return;
  }
  node.style.width = typeof width === "number" ? width + "px" : width;
  node.style.height = typeof height === "number" ? height + "px" : height;
}

/**
 * Add a CSS class to an element.
 * @example addClass("title", "highlight");
 */
function addClass(id, className) {
  var node = document.getElementById(id);
  if (!node) {
    console.error("addClass: No element with id='" + id + "'");
    return;
  }
  if (!className) {
    console.error("addClass: className is required");
    return;
  }
  if (node.classList) {
    node.classList.add(className);
  } else {
    var current = node.className || "";
    if (current.indexOf(className) === -1) {
      node.className = (current + " " + className).trim();
    }
  }
}

/**
 * Remove a CSS class from an element.
 * @example removeClass("title", "highlight");
 */
function removeClass(id, className) {
  var node = document.getElementById(id);
  if (!node) {
    console.error("removeClass: No element with id='" + id + "'");
    return;
  }
  if (!className) {
    console.error("removeClass: className is required");
    return;
  }
  if (node.classList) {
    node.classList.remove(className);
  } else {
    var parts = (node.className || "").split(/\s+/);
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      if (parts[i] !== className && parts[i] !== "") {
        out.push(parts[i]);
      }
    }
    node.className = out.join(" ");
  }
}

/**
 * Check if an element has a class.
 * @example if (hasClass("title", "highlight")) { ... }
 */
function hasClass(id, className) {
  var node = document.getElementById(id);
  if (!node) {
    console.error("hasClass: No element with id='" + id + "'");
    return false;
  }
  if (node.classList) {
    return node.classList.contains(className);
  }
  var classes = (node.className || "").split(/\s+/);
  for (var i = 0; i < classes.length; i++) {
    if (classes[i] === className) {
      return true;
    }
  }
  return false;
}



/**
 * Change a CSS property of an element.
 * @param {string} id - The id of the element.
 * @param {string} property - CSS property (e.g. "color", "backgroundColor").
 * @param {string|number} value - The new value.
 * 
 * @example
 * setHTMLProperty("myDiv", "color", "blue");
 */
function _setHTMLProperty(id, property, value) {
  var node = document.getElementById(id);
  if (!node) {
    console.warn("setHTMLProperty: Element with id '" + id + "' not found.");
    return;
  }
  node[property] = value;
  console.info("setHTMLProperty: #" + id + " → " + property + " = " + value);
}


/**
 * Change a CSS property of an element.
 * @param {string} id - The id of the element.
 * @param {string} property - CSS property (e.g. "color", "backgroundColor").
 * @param {string|number} value - The new value.
 * 
 * @example
 * setHTMLProperty("myDiv", "color", "blue");
 */
function setHTMLProperty(id, property, value) {
  const node = document.getElementById(id);
  if (!node) {
    console.error(`setHTMLProperty: Element with id '${id}' not found.`);
    return;
  }

  if (property in node) {
    // Safe to set directly (e.g. placeholder, value, innerHTML)
    node[property] = value;
    console.info(`setHTMLProperty: #${id} → property '${property}' set to '${value}'`);
  } else if (node.hasAttribute(property) || property.startsWith("data-")) {
    // If it's an attribute (e.g. data-*), set with setAttribute
    node.setAttribute(property, value);
    console.info(`setHTMLProperty: #${id} → attribute '${property}' set to '${value}'`);
  } else {
    // Warn (or throw) if it looks unsupported
    console.error(`setHTMLProperty: #${id} does not support property or attribute '${property}'`);
    throw new Error(`Cannot set '${property}' on #${id}`);
  }
}



/**
 * Set an element's style using a CSS text string.
 * @example setStyle("title", "color: red; font-weight: bold;");
 */
function setStyle(id, cssText) {
  var node = document.getElementById(id);
  if (!node) {
    console.error("setStyle: No element with id='" + id + "'");
    return;
  }
  if (typeof cssText !== "string") {
    console.error("setStyle: cssText must be a string like 'color: red; font-size: 20px;'");
    return;
  }
  node.style.cssText += ";" + cssText;
}

// ---------------------------------------------------
// JSDoc typedef for IntelliSense (safe at the bottom)
// ---------------------------------------------------

/**
 * @typedef {
 *  "display"|"color"|
 *  "background"|"backgroundColor"|"backgroundImage"|"backgroundSize"|"backgroundRepeat"|
 *  "backgroundPosition"|"backgroundPositionX"|"backgroundPositionY"|"backgroundClip"|
 *  "backgroundOrigin"|"backgroundAttachment"|
 *  "border"|"borderColor"|"borderStyle"|"borderWidth"|
 *  "borderTop"|"borderRight"|"borderBottom"|"borderLeft"|
 *  "borderRadius"|"borderTopLeftRadius"|"borderTopRightRadius"|
 *  "borderBottomLeftRadius"|"borderBottomRightRadius"|
 *  "boxShadow"|"boxSizing"|
 *  "opacity"|"visibility"|
 *  "overflow"|"overflowX"|"overflowY"|
 *  "outline"|"outlineColor"|"outlineStyle"|"outlineWidth"|
 *  "position"|"top"|"right"|"bottom"|"left"|"zIndex"|
 *  "width"|"minWidth"|"maxWidth"|"height"|"minHeight"|"maxHeight"|
 *  "margin"|"marginTop"|"marginRight"|"marginBottom"|"marginLeft"|
 *  "padding"|"paddingTop"|"paddingRight"|"paddingBottom"|"paddingLeft"|
 *  "font"|"fontFamily"|"fontSize"|"fontStyle"|"fontWeight"|"lineHeight"|"letterSpacing"|
 *  "textAlign"|"textDecoration"|"textDecorationColor"|"textDecorationLine"|"textDecorationStyle"|
 *  "textTransform"|"textOverflow"|"whiteSpace"|"wordBreak"|"wordWrap"|
 *  "verticalAlign"|"direction"|"unicodeBidi"|
 *  "cursor"|"pointerEvents"|"userSelect"|
 *  "filter"|"backdropFilter"|
 *  "transform"|"transformOrigin"|"transformStyle"|
 *  "perspective"|"perspectiveOrigin"|
 *  "transition"|"transitionProperty"|"transitionDuration"|"transitionTimingFunction"|"transitionDelay"|
 *  "animation"|"animationName"|"animationDuration"|"animationTimingFunction"|"animationDelay"|
 *  "animationIterationCount"
 * } CssProperty
 */

