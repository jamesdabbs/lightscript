// This is a random grab-bag of snippets for interacting with
// the LaunchPad board, but some in case some of them might be
// interesting ...


//-------------------
// KeyPress listeners
//-------------------

// The following code aims to light up buttons whenever they are pressed on

let key

function basicHandler(output, data) {
    // The pad emits events that contain an array of either two or three numbers
    // [144, 22, 56] => you pressed (144) pad #22 with velocity (force) 56
    // [144, 22, 0]  => you released pad #22
    // [208, x]      => you held and wiggled the last pad
    console.log(data)

    const type = data[0]

    if (type === 144) {
        const vel = data[2]
        key = data[1] // Store a reference to key for later use

        // Note: to interact with the pad, we send it a sequence of bytes
        // The prefix and trailing 247 are always the same
        // ... 10, key, 5 ... => light up (10) pad #key as red (color 5)
        // ... 10, key, 0 ... => turn off pad #key
        // ... 40, key, 5 ... => start pulsing color 5
        if (vel > 0) {
            output.send([240, 0, 32, 41, 2, 16, 10, key, 5, 247])
        } else {
            output.send([240, 0, 32, 41, 2, 16, 10, key, 0, 247])
        }

    } else if (type === 208) {
        if (data[1] === 0) {
            output.send([240, 0, 32, 41, 2, 16, 10, key, 5, 247])
        } else {
            output.send([240, 0, 32, 41, 2, 16, 40, key, 5, 247])
        }
    }
}


//-----------------
// Simon-style pads
//-----------------

// The list of small pads in each big square, along with their base and highlighted color numbers
// This is our data model
const squares = [
    { pads: [11,12,13,14,21,22,23,24,31,32,33,34,41,42,43,44], base: 4,  active: 5 },
    { pads: [51,52,53,54,61,62,63,64,71,72,73,74,81,82,83,84], base: 44, active: 45 },
    { pads: [15,16,17,18,25,26,27,28,35,36,37,38,45,46,47,48], base: 12, active: 13 },
    { pads: [55,56,57,58,65,66,67,68,75,76,77,78,85,86,87,88], base: 30, active: 29 }
]

function simonHandler(output, data) {
    const type = data[0]
    if (type === 144) {
        const vel = data[2]
        key = data[1]

        let square = findSquare(key);
        if (vel > 0) { // we pressed the button down
            lightSquare(output, square, square.active); // use the `active` color
        } else { // we released the key
            lightSquare(output, square, square.base); // revert to the `base` color
        }
    }
}

// Given a pad number, finds the square object (from the list above) that contains that pad
function findSquare(pad) {
    let found;
    squares.forEach(function(s) {
        s.pads.forEach(function(p) {
            if (p === pad) {
                found = s;
            }
        })
    })
    return found;
}

// This is a helper for sending a command out to the midi board
// since we always use the same start and end bits
function sysex(output, bits) {
    let allBits = [240, 0, 32, 41, 2, 16].concat(bits, 247)
    output.send(allBits)
}

function lightSquare(output, square, color) {
    square.pads.forEach(function(n) {
        sysex(output, [10, n, color])
    })
}

// To begin with, light up each pad based on its square
function simonStart(output) {
    squares.forEach(function(square) {
        lightSquare(output, square, square.base);
    })
}


//-----------------
// Midi keyboard
//-----------------

// MIDI background: each note is assigned a number (60 for middle C, 61 for C#, 62 for D, and so on)

// This is a function for producing "key" objects, similar to the squares above
function makeKey(n) {
    // We want to color squares
    // - green: for a C in any octave
    // - white: for anything in the key of C (A,B,C,D,E,F,G)
    let rem = n % 12;
    if (rem === 0) {
        color = 29;
    } else if ([2,4,5,7,9,11].includes(rem)) {
        color = 1;
    } else {
        color = 0;
    }

    // This is the formula for converting from midi notes to frequencies (in Hertz, as the browser requires)
    let freq = 440 * Math.pow(2, (n-69)/12);

    return {
        pad:   padNumberForKey(n),
        color: color,
        midi:  n,
        freq:  freq
    }
}

// Make a list of keys, for each key on the board
let keys = []
for (let i=20; i<120; i++) {
    let k = makeKey(i)
    keys[k.pad] = k
}

function keyboardStart(output) {
    keys.forEach(function(key) {
        sysex(output, [10, key.pad, key.color])
    })
}

let playing = []

function keyboardHandler(output, data) {
  console.log("midi event", data)
    if (data[0] === 144) {
        let key = keys[data[1]]
        let vel = data[2]

        if (vel > 0) { // pressed a pad key down
            playFreq(key.freq) // start playing the note
            sysex(output, [10, key.pad, 40]) // and light up the keyboard
        } else { // released the key
            // don't stop the note
            sysex(output, [10, key.pad, key.color]) // but reset the keyboard key color
        }
    } else { // e.g. pressed outside
        playing.forEach(function(o) { o.stop(0) }) // stop all the oscillators in the playing list
    }
}


// Boot loader

function start(midiAccess) {
    const outputs = Array.from(midiAccess.outputs.values())
    const output  = outputs.find(o => o.name === 'Launchpad Pro Standalone Port')

    // Whenever we get a midi event from any input, run the desired handler
    midiAccess.inputs.forEach(function(input) {
        // change `keyboardHandler` to one of the others to try out a different mode
        input.onmidimessage = function(msg) { keyboardHandler(output, msg.data) }
    })

    keyboardStart(output);

    console.log('Ready to rock')
}

function fail(error) {
    alert('Failed to get access to midi:' + error)
}

// Ask chrome for access to the attached midi devices
// If the user approves, this will call `start` (and pass in the midi data)
// If not, it will call `fail`
navigator.requestMIDIAccess({
    sysex: true
}).then(start, fail)


// This is the same logic we used in keyboard.js to make sounds

var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

var gainNode = audioCtx.createGain();
gainNode.connect(audioCtx.destination);
gainNode.gain.value = 0.1;

function playFreq(freq) {
    var oscillator = audioCtx.createOscillator();
    oscillator.connect(gainNode);

    oscillator.type = 'square';
    oscillator.frequency.value = freq;
    oscillator.detune.value = 100;
    oscillator.start(audioCtx.currentTime);
    // oscillator.stop(audioCtx.currentTime + 1);
    playing.push(oscillator)
    //setTimeout(function() { oscillator.stop() }, 1000)

    // oscillator.onended = function() {
    //     console.log('Done playing', freq)
    // }
}
