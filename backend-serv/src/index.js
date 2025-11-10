/* 
Il file index.js configura e avvia un server Express per gestire le richieste API.
- Utilizza il middleware express.json() per il parsing del corpo delle richieste in formato JSON.
- Configura il middleware CORS per consentire richieste provenienti dall'origine "http://localhost:5173".
zza il database utilizzando Sequelize e avvia il server sulla porta 8080.
*/


const express = require ("express");
const app= express();

app.use(express.json());


const path = require("path");
require("dotenv").config(); 

const cors = require("cors");
const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:5174"]
};

app.use(cors(corsOptions));

const AiChat_router=require("../routes/AiChat_route");
app.use("/Home",AiChat_router);

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log("Server started on port: " + port);
}).on("error", (err) => {
  console.error("Failed to start server:", err);
});