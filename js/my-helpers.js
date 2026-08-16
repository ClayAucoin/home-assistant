console.log("my-helpers.js says hi");


/* myHelpers.js
 * Include AFTER your HTML elements.
 * 
 * Example:
 *   <script src="my-helpers.js"></script>
 *
 * Notes:
 * - Use IDs on all interactive elements. These helpers target by id.
 *
 * ---------------------------------------------------------------------------
 * consoleDisplay(fname, result)
 * disableButton(id, status)
 * playMySound(src, loop = false, volume = 1.0)
 * visibleElement(id, status)
 * ---------------------------------------------------------------------------
 */



/**
 * Display results in the console in two formats:
 *   1. Raw object (expandable in DevTools)
 *   2. Pretty-printed JSON (stringified, if valid JSON)
 *   3. Plain string (logged directly if not JSON)
 *
 * @param {string} fname - Label (usually the function name).
 * @param {object|string} result - The fetch result. Can be a parsed object
 *                                 or a raw JSON string.
 * @param {boolean} [status=false] - Whether to display pretty-printed JSON
 *
 * @example
 * With an object:
 * consoleDisplay("fetchByZip", { city: "New York", state: "NY" });
 *
 * @example
 * With a JSON string:
 * consoleDisplay("fetchByZip", '{"city":"New York","state":"NY"}', true);
 *
 * @example
 * With a plain string:
 * consoleDisplay("fetchByZip", "Service unavailable");
 */
function consoleDisplay(fname, result, prettyprint = false) {

	// const displayPretty = false;	// display pretty-printed JSON

	const resultDisplay = true;
	const stringifyDisplay = true;

	if (resultDisplay) {
		console.log("01: result from %s: %o", fname, result);
	}

	if (!stringifyDisplay) return;

	try {
		let parsed = result;

		if (typeof result === "string") {
			try {
				parsed = JSON.parse(result); // try parsing JSON string
			} catch {
				// not JSON, just log raw string
				console.log(`02: result from ${fname} (plain string): "${result}"`);
				return;
			}
		}

		if (typeof parsed === "object" && parsed !== null) {
			if (prettyprint) {
				console.log(`02: result from ${fname} (pretty JSON):\n${JSON.stringify(parsed, null, 2)}`);
			}
		} else {
			console.log(`02: result from ${fname} (value):`, parsed);
		}
	} catch (e) {
		console.log(`02: not valid JSON/object:`, e.message);
	}
}


/**
 * Enable or disable a DOM element by toggling its `disabled` state.
 *
 * Works with either:
 * - an element ID string (e.g. `"myButton"`), or
 * - a direct DOM element reference (e.g. `document.getElementById("myButton")`).
 *
 * By default, it uses the **Bootstrap `disabled` class**, but you can also
 * extend it to set the native `disabled` attribute if desired.
 *
 * @param {string|HTMLElement} target - The element ID or DOM element.
 * @param {boolean} [status=false] - Whether to disable (`true`) or enable (`false`).
 *                                   Defaults to `false` (enable).
 *
 * @example
 * Disable a button by ID
 * disableButton("myButton", true);
 *
 * @example
 * Enable a button by ID
 * disableButton("myButton", false);
 *
 * @example
 * Disable a button by passing an element reference
 * const btn = document.getElementById("myButton");
 * disableButton(btn, true);
 */
function disableButton(target, status = false) {
    let el = target;

    // Resolve string IDs to an element
    if (typeof target === "string") {
        el = document.getElementById(target);
    }

    if (!el) {
        console.warn(`disableButton: Element '${target}' not found.`);
        return;
    }

    if (status) {
        el.classList.add("disabled");
        // Optional: also set the native attribute
        if ("disabled" in el) el.disabled = true;
        console.info(`disableButton: Element '${el.id || "[no id]"}' has been disabled.`);
    } else {
        el.classList.remove("disabled");
        if ("disabled" in el) el.disabled = false;
        console.info(`disableButton: Element '${el.id || "[no id]"}' has been enabled.`);
    }
}


/**
 * Play a sound from a given URL.
 *
 * Creates and returns an `HTMLAudioElement` so you can pause, stop,
 * or adjust it later if needed.
 *
 * @param {string} src - The sound file URL.
 * @param {boolean} [loop=false] - Whether to loop the sound continuously.
 * @param {number} [volume=1.0] - Volume level, between 0.0 (silent) and 1.0 (full).
 * @returns {HTMLAudioElement|null} The audio element instance, or `null` if no src was provided.
 *
 * @example
 * Play once at full volume
 * playMySound("beep.mp3");
 *
 * @example
 * Loop with half volume
 * playMySound("beep.mp3", true, 0.5);
 *
 * @example
 * Pause the sound later
 * const sound = playMySound("beep.mp3");
 * sound.pause();
 */
function playMySound(src, loop = false, volume = 1.0) {
    if (!src) {
        console.warn("playMySound: No src provided.");
        return null;
    }

    const audio = new Audio(src);
    audio.loop = loop;
    audio.volume = Math.min(Math.max(volume, 0), 1); // clamp between 0–1
    audio.currentTime = 0;

    audio.play()
        .then(() => {
            console.info(
                `playMySound: Playing "${src}"${loop ? " (looping)" : ""} (volume=${audio.volume})`
            );
        })
        .catch(err => {
            console.error(`playMySound: Failed to play "${src}"`, err);
        });

    return audio;
}


/**
 * Toggle visibility of a DOM element by adding/removing the Bootstrap `d-none` class.
 *
 * Accepts either:
 * - an element ID string (e.g. `"myDiv"`), or
 * - a direct DOM element reference (e.g. `document.getElementById("myDiv")`).
 *
 * @param {string|HTMLElement} target - The element ID or DOM element to show/hide.
 * @param {boolean} [status=false] - Whether to show (`true`) or hide (`false`).
 *                                   Defaults to `false` (hide).
 *
 * @example
 * Show element by ID
 * visibleElement("myDiv", true);
 *
 * @example
 * Hide element by ID
 * visibleElement("myDiv", false);
 *
 * @example
 * Show element using a direct DOM reference
 * const el = document.getElementById("myDiv");
 * visibleElement(el, true);
 */
function visibleElement(target, status = false) {
    let el = target;

    // Resolve string IDs to an element
    if (typeof target === "string") {
        el = document.getElementById(target);
    }

    if (!el) {
        console.warn(`visibleElement: Element '${target}' not found.`);
        return;
    }

    if (status) {
        el.classList.remove("d-none");
        console.info(`visibleElement: Element '${el.id || "[no id]"}' has been shown.`);
    } else {
        el.classList.add("d-none");
        console.info(`visibleElement: Element '${el.id || "[no id]"}' has been hidden.`);
    }
}
