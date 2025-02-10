const express = require("express");
const router = express.Router();
const Book = require("../models/Book");

router.get("/", async (req, res) => {
  const { genre, year, keyword } = req.query;
  try {
    let query = {};

    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: "i" } },
        { "author.name": { $regex: keyword, $options: "i" } },
        { summary: { $regex: keyword, $options: "i" } },
      ];
    }

    if (genre) {
      const pattern = genre.replace(/%/g, ".*").replace(/_/g, ".");
      query["category.name"] = new RegExp(pattern, "i");
    }

    if (year) {
      query["details.published_date"] = {
        $regex: year,
        $options: "i",
      };
    }

    const book = await Book.aggregate([
      { $match: query },
      { $sample: { size: 1 } },
    ]);

    if (!book.length) {
      return res.status(404).json({
        message: `Tidak ada buku yang memenuhi kriteria ${
          genre ? ` genre: "${genre}"` : ""
        }${year ? ` year: ${year}` : ""}${
          keyword ? ` keyword: "${keyword}"` : ""
        }`,
      });
    }

    res.json(book[0]);
  } catch (err) {
    console.error("Error in random book route:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
