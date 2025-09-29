import express from "express";
import routes from "./routes/route.js"

const app = express();

app.use("/api/notes", routes)

app.listen(5001, () => {
    console.log("server started on port: 5001");
});