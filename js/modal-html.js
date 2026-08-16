// console.log("modal-html.js says hi");

function caughtError(errorNote) {
    let dialogTitle = "Error";
    dialogMessage = `An error has occured. Please try again<br>Error message:<br>
        <span class="error-message">${errorNote}</span><br>004`
    console.log(`${errorNote}: 004`);
    openHTMLModal();
}

function openHTMLModal() {
    $("htmlDialogLabel").textContent = dialogTitle;
    $("htmlDialogBody").innerHTML = dialogMessage;

    $('htmlModal').showModal();
}

$('closeHTMLModalBtn').addEventListener('click', () => {
    $('htmlModal').close();
    resetInterface();
});
