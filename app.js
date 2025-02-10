require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bookRouter = require("./routes/book");
const randomRouter = require("./routes/random_book");
const statsRouter = require("./routes/stats");
const aiRouter = require("./routes/ai");

const app = express();
app.use(cors());
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use("/api/v1/book", bookRouter);
app.use("/api/v1/random_book", randomRouter);
app.use("/api/v1/stats", statsRouter);
app.use("/api/v1/ai", aiRouter);

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

// Routes
app.get("/", (req, res) => {
  res.send("Hello from the API!");
});

// Start Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
