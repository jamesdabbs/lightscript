document.addEventListener("DOMContentLoaded", function() {
  console.log("Document is ready");

  document.getElementById("clickable-square").addEventListener("click", function() {
    alert("Clicked!")
  })
})

console.log("I'm here!")

document.addEventListener("keypress", function(event) {
  console.log("You pressed a key", event.which)
})
