// This is the JS that we ended up writing during the course

// All audo happens within a given context. This initializes that context
var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// A gain node is just a volume knob. We connect its output to the
// AudioContext's destination (our speakers)
var gainNode = audioCtx.createGain();
gainNode.connect(audioCtx.destination);
gainNode.gain.value = 0.1;

// An oscillator makes a (mostly) pure sound that we'll use as
// our initial source
var oscillator = audioCtx.createOscillator();

// Send the oscillator through the volume knob and to the speakers
oscillator.connect(gainNode);

// These configure the sound wave to give it a slightly harder edge
oscillator.type = 'square';
oscillator.detune.value = 100;

// Our initial frequency - this is a middle-range A
var freq = 440;

// This function packages up what it means to change frequency for our app
function changeFrequency(amount) {
  // namely ...
  freq = freq + amount; // update the stored variable
  oscillator.frequency.value = freq; // update the pitch that the oscillator is producing
  document.getElementById("pitch").innerHTML = freq; // and write the current pitch out to the document
}

// Start "playing" as soon as the page is loaded, but set the volume to 0
gainNode.gain.value = 0;
oscillator.start();

// oscillator.stop() will break things because the WebAudio API doesn't allow you
// to re-start a stopped oscillator so we're doing this instead ...
var playing = false;
function togglePlayPause() {
  // We keep track of whether or not we're playing using a variable, and turn the volume
  // up or down based on that.
  if (playing) {
    playing = false;
    gainNode.gain.value = 0;
  } else {
    playing = true;
    gainNode.gain.value = 0.5;
  }
}

// Listen for events where the user presses a keyboard key
document.addEventListener("keypress", function(event) {
  // Note: we use the functions that we wrote above, and so this
  // bit of code ends up being pretty descriptive of its intent
  if (event.which === 100) { // The user pressed a `D`
    changeFrequency(10);
  } else if (event.which === 97) { // an `A`
    changeFrequency(-10);
  } else if (event.which === 32) { // a ` `
    togglePlayPause();
  }
})

// We need to wait for the document to load before trying to
// `getElementById`, as otherwise the element might not be there
// to find yet.
document.addEventListener("DOMContentLoaded", function() {
  // After the content has loaded, this should work:
  document.getElementById("pitch").innerHTML = freq;
})
