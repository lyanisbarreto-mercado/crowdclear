const intro = document.getElementById("intro");
const game = document.getElementById("game");

document.getElementById("stop-btn").addEventListener("click", () => {
    window.location.reload();
})

document.getElementById("start-btn").addEventListener("click", () => 
    game.style.display = "block")

document.getElementById("open-exit").addEventListener("click", () =>{
    const exitB = document.getElementById("exit-b")
    exitB.setAttribute("color", "#2ecc71");
    alert("You have opened Exit B!")
})