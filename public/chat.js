
const prodMode = false;
const url = prodMode ? "https://hacky-chatty.herokuapp.com" : "http://localhost:9001";
//var port = (process && process.env && process.env.PORT) ? Number(process.env.PORT) : 9001;
//"http://localhost:" + port
var socket = io.connect(url);
var formEl = document.getElementById("chatForm");
var textInputEl = document.getElementById("txt");
var messagesEl = document.getElementById("messages");

formEl.addEventListener("submit", e => {
    e.preventDefault();
    socket.emit("chat_message", textInputEl.value);
    textInputEl.value = "";
    return false;
});

// append the chat text message
socket.on("chat_message", function(msg) {
    addMessage(msg);

});

// append text if someone is online
socket.on("is_online", function(username) {
    addMessage(username);
});

function addMessage(text) {
    let child = document.createElement("li");
    child.innerHTML = text;
    messagesEl.prepend(child);
}

function askUserName() {
    
    var userNameModal = document.createElement("div");
    userNameModal.id = "username-modal";
    userNameModal.innerHTML = `
        <h2>Enter your name</h2>
        <form id="username-form">
            <input type="text" minlength="1" maxlength="6">
            <button type="submit">Submit</button>
        </form>
        <p class="hidden">* 1 to 6 chars</p>
    `;
    
    document.body.append(userNameModal);
    
    var userNameForm = document.querySelector("#username-form");
    userNameForm.addEventListener('submit', (e) => {
        // var username = prompt("Please tell me your name");
        // while (username.length < 1 && username.length > 20) {
            //     alert("Please enter a name between 1 and 20 characters");
        //     username = prompt("What's your name?");
        // }
        console.log(e);
        e.preventDefault();
        var username = userNameForm.querySelector("input").value;
        if (username && username.length > 0 && username.length < 7) {
            socket.emit("username", username);
            userNameModal.classList.add("hidden");
        } else {
            userNameModal.querySelector("p").classList.remove("hidden");
        }
    });    
}

askUserName();