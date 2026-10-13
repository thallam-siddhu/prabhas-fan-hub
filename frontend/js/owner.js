const loginForm = document.getElementById("ownerLoginForm");
const loginMessage = document.getElementById("loginMessage");


loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();


    const username =
        document.getElementById("ownerUsername").value.trim();

    const password =
        document.getElementById("ownerPassword").value;


    loginMessage.textContent = "Checking login...";


    try {

        const response = await fetch(
            "http://127.0.0.1:3000/api/owner/login",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                credentials: "include",

                body: JSON.stringify({
                    username: username,
                    password: password
                })
            }
        );


        const data = await response.json();


        if (data.success) {

            loginMessage.textContent =
                "Login successful. Opening owner panel...";


            setTimeout(function () {

                window.location.href = "owner-panel.html";

            }, 700);

        } else {

            loginMessage.textContent =
                data.message || "Login failed.";

        }


    } catch (error) {

        console.error(error);

        loginMessage.textContent =
            "Cannot connect to the server.";

    }

});