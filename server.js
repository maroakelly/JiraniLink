
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

const allowedCategories = [
    "Food",
    "Transport",
    "Healthcare",
    "Education",
    "Shelter",
    "Other"
];

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
    console.log("A community member connected.");

    socket.on("chat message", (data) => {
        if (!data ||
            typeof data.name !== "string" ||
            typeof data.text !== "string") {
            return;
        }

        const name = data.name.trim().slice(0, 30);
        const text = data.text.trim().slice(0, 500);

        if (!name || !text) {
            return;
        }

        io.emit("chat message", {
            name,
            text,
            time: new Date().toLocaleTimeString()
        });
    });

    socket.on("help request", (data) => {
        if (!data ||
            typeof data.name !== "string" ||
            typeof data.text !== "string") {
            return;
        }

        const name = data.name.trim().slice(0, 30);
        const text = data.text.trim().slice(0, 300);

        const category =
            typeof data.category === "string" &&
            allowedCategories.includes(data.category)
                ? data.category
                : "Other";

        if (!name || !text) {
            return;
        }

        io.emit("help request", {
            name,
            text,
            category,
            time: new Date().toLocaleTimeString()
        });
    });

    socket.on("disconnect", () => {
        console.log("A community member disconnected.");
    });
});

server.listen(PORT, "0.0.0.0", () => {
    console.log("================================");
    console.log("       JIRANILINK SERVER");
    console.log("================================");
    console.log("Port: " + PORT);
    console.log("Open http://localhost:" + PORT);
    console.log("Waiting for community members...");
});
