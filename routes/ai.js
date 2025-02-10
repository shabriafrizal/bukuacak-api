const express = require("express");
const router = express.Router();
const { CohereClient } = require("cohere-ai");
require("dotenv").config();

// Initialize Cohere client
const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
});

// Topic classification and aggregation
router.post("/topics", async (req, res) => {
  try {
    const { texts } = req.body;

    // Ensure texts is an array
    if (!Array.isArray(texts)) {
      throw new Error("Input 'texts' must be an array of strings");
    }

    const response = await cohere.classify({
      inputs: texts,
      examples: [
        {
          text: "The new iPhone features are amazing",
          label: "technology",
        },
        {
          text: "The laptop performance is incredible",
          label: "technology",
        },
        {
          text: "This recipe is delicious",
          label: "food",
        },
        {
          text: "The best way to cook pasta",
          label: "food",
        },
        {
          text: "The movie was fantastic",
          label: "entertainment",
        },
        {
          text: "This TV show is great",
          label: "entertainment",
        },
        {
          text: "The stock market is down today",
          label: "finance",
        },
        {
          text: "Bitcoin price is rising",
          label: "finance",
        },
      ],
    });

    // Aggregate topics
    const topicStats = response.classifications.reduce((acc, curr) => {
      const topic = curr.prediction;
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {});

    const formattedStats = Object.entries(topicStats)
      .map(([topic, count]) => ({
        topic,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    res.json({
      topic_statistics: formattedStats,
      total_topics: Object.keys(topicStats).length,
      classification_details: response.classifications.map((c) => ({
        text: c.input.slice(0, 50) + "...",
        topic: c.prediction,
        confidence: c.confidence,
      })),
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error classifying topics", error: err.message });
  }
});

// Sentiment analysis route
router.post("/sentiment", async (req, res) => {
  try {
    const { texts } = req.body;

    // Ensure texts is an array
    if (!Array.isArray(texts)) {
      throw new Error("Input 'texts' must be an array of strings");
    }

    const response = await cohere.classify({
      inputs: texts,
      examples: [
        {
          text: "This is amazing!",
          label: "positive",
        },
        {
          text: "I love this product",
          label: "positive",
        },
        {
          text: "This is terrible",
          label: "negative",
        },
        {
          text: "I hate this",
          label: "negative",
        },
        {
          text: "It's okay",
          label: "neutral",
        },
        {
          text: "Not sure about this",
          label: "neutral",
        },
      ],
    });

    // Aggregate results
    const sentimentStats = response.classifications.reduce((acc, curr) => {
      const sentiment = curr.prediction;
      acc[sentiment] = (acc[sentiment] || 0) + 1;
      return acc;
    }, {});

    const formattedStats = Object.entries(sentimentStats)
      .map(([sentiment, count]) => ({
        sentiment,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    res.json({
      sentiment_statistics: formattedStats,
      total_analyzed: texts.length,
      confidence_scores: response.classifications.map((c) => ({
        text: c.input.slice(0, 50) + "...",
        sentiment: c.prediction,
        confidence: c.confidence,
      })),
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error analyzing sentiments", error: err.message });
  }
});

module.exports = router;
