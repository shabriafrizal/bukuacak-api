const express = require("express");
const router = express.Router();
const Book = require("../models/Book");

// Helper function to convert date string to ISO format for proper sorting
const convertPublishedDate = (dateStr) => {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const [day, month, year] = dateStr.split(" ");
  const monthIndex = monthNames.indexOf(month);

  if (monthIndex === -1) return null;

  // Pad day with leading zero if needed
  const paddedDay = day.padStart(2, "0");
  // Pad month with leading zero if needed
  const paddedMonth = (monthIndex + 1).toString().padStart(2, "0");

  return `${year}-${paddedMonth}-${paddedDay}`;
};

// Add this pipeline stage to standardize date format for sorting
const dateStandardizationStage = {
  $addFields: {
    standardizedDate: {
      $let: {
        vars: {
          dateParts: { $split: ["$details.published_date", " "] },
        },
        in: {
          $dateFromString: {
            dateString: {
              $concat: [
                { $arrayElemAt: ["$$dateParts", 2] },
                "-", // year
                {
                  $switch: {
                    branches: [
                      {
                        case: {
                          $eq: [
                            { $arrayElemAt: ["$$dateParts", 1] },
                            "January",
                          ],
                        },
                        then: "01",
                      },
                      {
                        case: {
                          $eq: [
                            { $arrayElemAt: ["$$dateParts", 1] },
                            "February",
                          ],
                        },
                        then: "02",
                      },
                      {
                        case: {
                          $eq: [{ $arrayElemAt: ["$$dateParts", 1] }, "March"],
                        },
                        then: "03",
                      },
                      {
                        case: {
                          $eq: [{ $arrayElemAt: ["$$dateParts", 1] }, "April"],
                        },
                        then: "04",
                      },
                      {
                        case: {
                          $eq: [{ $arrayElemAt: ["$$dateParts", 1] }, "May"],
                        },
                        then: "05",
                      },
                      {
                        case: {
                          $eq: [{ $arrayElemAt: ["$$dateParts", 1] }, "June"],
                        },
                        then: "06",
                      },
                      {
                        case: {
                          $eq: [{ $arrayElemAt: ["$$dateParts", 1] }, "July"],
                        },
                        then: "07",
                      },
                      {
                        case: {
                          $eq: [{ $arrayElemAt: ["$$dateParts", 1] }, "August"],
                        },
                        then: "08",
                      },
                      {
                        case: {
                          $eq: [
                            { $arrayElemAt: ["$$dateParts", 1] },
                            "September",
                          ],
                        },
                        then: "09",
                      },
                      {
                        case: {
                          $eq: [
                            { $arrayElemAt: ["$$dateParts", 1] },
                            "October",
                          ],
                        },
                        then: "10",
                      },
                      {
                        case: {
                          $eq: [
                            { $arrayElemAt: ["$$dateParts", 1] },
                            "November",
                          ],
                        },
                        then: "11",
                      },
                      {
                        case: {
                          $eq: [
                            { $arrayElemAt: ["$$dateParts", 1] },
                            "December",
                          ],
                        },
                        then: "12",
                      },
                    ],
                    default: "01",
                  },
                },
                "-",
                { $arrayElemAt: ["$$dateParts", 0] }, // day
              ],
            },
          },
        },
      },
    },
  },
};

router.get("/", async (req, res) => {
  try {
    const {
      _id,
      keyword,
      genre,
      year,
      page = 1,
      limit = 20,
      sort = "newest",
    } = req.query;

    if (_id) {
      const book = await Book.findById(_id)
        .select("-scrape_date -source_url")
        .lean();
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
      return res.json(book);
    }

    const query = {};

    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: "i" } },
        { "author.name": { $regex: keyword, $options: "i" } },
        { summary: { $regex: keyword, $options: "i" } },
      ];
    }

    if (genre) {
      query["category.name"] = { $regex: genre, $options: "i" };
    }

    if (year) {
      query["details.published_date"] = {
        $regex: year,
        $options: "i",
      };
    }

    // Create aggregation pipeline
    const pipeline = [{ $match: query }, dateStandardizationStage];

    // Add sorting stage based on the standardized date
    const sortStage = {
      $sort: {
        standardizedDate: sort === "newest" ? -1 : 1,
      },
    };

    if (["newest", "oldest"].includes(sort)) {
      pipeline.push(sortStage);
    } else if (sort === "titleAZ") {
      pipeline.push({ $sort: { title: 1 } });
    } else if (sort === "titleZA") {
      pipeline.push({ $sort: { title: -1 } });
    } else if (sort === "priceLowHigh" || sort === "priceHighLow") {
      pipeline.push({
        $sort: {
          "details.price": sort === "priceLowHigh" ? 1 : -1,
        },
      });
    }

    // Add pagination stages
    const totalBooks = await Book.aggregate([
      { $match: query },
      { $count: "total" },
    ]);

    const total = totalBooks[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    pipeline.push(
      { $skip: (page - 1) * limit },
      { $limit: Number(limit) },
      {
        $project: {
          standardizedDate: 0,
          scrape_date: 0,
          source_url: 0,
        },
      }
    );

    const books = await Book.aggregate(pipeline);

    return res.json({
      books,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalItems: total,
        itemsPerPage: Number(limit),
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    console.error("Error fetching books:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/:_id", async (req, res) => {
  try {
    const book = await Book.findById(req.params._id)
      .select("-scrape_date -source_url")
      .lean();

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    return res.json(book);
  } catch (err) {
    console.error("Error fetching book by ID:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
