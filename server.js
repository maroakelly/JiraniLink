
require("dotenv").config();

const express = require("express");
const http = require("http");
const path = require("path");
const mongoose = require("mongoose");
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

// Database models
const messageSchema = new mongoose.Schema({
    name: { type: String, required: true, maxlength: 30 },
    text: { type: String, required: true, maxlength: 500 },
    createdAt: { type: Date, default: Date.now }
});

const helpRequestSchema = new mongoose.Schema({
    name: { type: String, required: true, maxlength: 30 },
    text: { type: String, required: true, maxlength: 300 },
    category: {
        type: String,
        enum: allowedCategories,
        default: "Other"
    },
    createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model("Message", messageSchema);
const HelpRequest = mongoose.model("HelpRequest", helpRequestSchema);

app.use(express.static(path.join(__dirname, "public")));

function formatRecord(record) {
    return {
        ...record,
        time: new Date(record.createdAt).toLocaleTimeString()
    };
}

io.on("connection", async (socket) => {
    console.log("A community member connected.");

    // Load the latest 30 chat messages and help requests.
    try {
        const messages = await Message.find()
            .sort({ createdAt: -1 })
            .limit(30)
            .lean();

        const requests = await HelpRequest.find()
            .sort({ createdAt: -1 })
            .limit(30)
            .lean();

        socket.emit(
            "chat history",
            messages.reverse().map(formatRecord)
        );

        socket.emit(
            "help history",
            requests.reverse().map(formatRecord)
        );
    } catch (error) {
        console.error("Could not load history:", error.message);
    }

    socket.on("chat message", async (data) => {
        if (
            !data ||
            typeof data.name !== "string" ||
            typeof data.text !== "string"
        ) {
            return;
        }

        const name = data.name.trim().slice(0, 30);
        const text = data.text.trim().slice(0, 500);

        if (!name || !text) {
            return;
        }

        try {
            const savedMessage = await Message.create({ name, text });
            io.emit("chat message", formatRecord(savedMessage.toObject()));
        } catch (error) {
            console.error("Could not save chat message:", error.message);
            socket.emit("database error", {
                message: "Your message could not be saved. Please try again."
            });
        }
    });

    socket.on("help request", async (data) => {
        if (
            !data ||
            typeof data.name !== "string" ||
            typeof data.text !== "string"
        ) {
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

        try {
            const savedRequest = await HelpRequest.create({
                name,
                text,
                category
            });

            io.emit(
                "help request",
                formatRecord(savedRequest.toObject())
            );
        } catch (error) {
            console.error("Could not save help request:", error.message);
            socket.emit("database error", {
                message: "Your help request could not be saved. Please try again."
            });
        }
    });

    socket.on("disconnect", () => {
        console.log("A community member disconnected.");
    });
});

async function startServer() {
    if (!process.env.MONGODB_URI) {
        console.error("MONGODB_URI is missing. Check your .env file.");
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);

        console.log("Connected to the JiraniLink database.");

        server.listen(PORT, "0.0.0.0", () => {
            console.log("================================");
            console.log("       JIRANILINK SERVER");
            console.log("================================");
            console.log("Port: " + PORT);
            console.log("Open http://localhost:" + PORT);
            console.log("Waiting for community members...");
        });
    } catch (error) {
        console.error(
            "Database connection failed:",
            error.message
        );
        process.exit(1);
    }
}

startServer();
