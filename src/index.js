import { app } from "./app.js";
import { configDotenv } from "dotenv";
import { connectDb } from "./db/index.db.js";

configDotenv({
  path: "./.env",
});

//connect mongodb
connectDb()
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log("Server is listening at port ", process.env.PORT);
    });
  })
  .catch((error) => {
    console.log(error);
  });
