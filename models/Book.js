const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({
  id: Number,
  title: String,
  description: String,
  cover: String,
  publish_date: Date,
  size: String,
  total_pages: Number,
  format_book: String,
  author: String,
  genre: String,
  tags: String,
  price: Number,
  store: String,
});

const Book = mongoose.model("Book", bookSchema, "booksv2");
module.exports = Book;
