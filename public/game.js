const intro = document.getElementById("intro");
const game = document.getElementById("game");

document.getElementById("stop-btn").addEventListener("click", () => {
    window.location.reload();
})

document.getElementById("start-btn").addEventListener("click", () => {
    game.style.display = "block";
    // A-Frame sized its canvas to 0 while #game was hidden; make it re-measure
    window.dispatchEvent(new Event("resize"));
})

document.getElementById("open-exit").addEventListener("click", () =>{
    const exitB = document.getElementById("exit-b")
    exitB.setAttribute("color", "#2ecc71");
    document.getElementById("status").textContent = "You have opened Exit B!";
})