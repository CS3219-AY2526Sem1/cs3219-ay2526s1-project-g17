import express from "express"

const app = express();

app.listen(5001, () => {
    console.log("server started on port: 5001");
});