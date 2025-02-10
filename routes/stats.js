const express = require("express");
const router = express.Router();
const Book = require("../models/Book");

router.get("/genre", async (req, res) => {
  try {
    const genreStats = await Book.aggregate([
      {
        $group: {
          _id: "$category.name",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          genre: "$_id",
          count: 1,
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json({
      genre_statistics: genreStats,
      total_genres: genreStats.length,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error getting stats", error: err.message });
  }
});

module.exports = router;
