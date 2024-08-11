import rateLimit from "express-rate-limit";
import { ProfileModel } from "../../db-schema";

const Config = require("../../config");
const jwt = require("jsonwebtoken");

// In-memory store for blocked IPs
const blockUsers = new Map();

// Middleware to block requests from blocked IPs
const blockMiddleware = async (req, res, next) => {
  const key = await getUniqueKey(req);

  if (blockUsers.has(key)) {
    const blockExpiration = blockUsers.get(key);
    const currentTime = Date.now();

    if (currentTime < blockExpiration) {
      return res.status(429).json({
        message: "Too many requests, please try again after 2 minutes",
        retryAfter: Math.ceil((blockExpiration - currentTime) / 1000),
      });
    } else {
      blockUsers.delete(key);
    }
  }
  next();
};

const getUniqueKey = async (req) => {
  let uniqueKey;
  try {
    if (req.header("X-Paid-Authentication")) {
      const data = jwt.verify(
        req.header("X-Paid-Authentication"),
        Config.server[Config.env].jwtSecret
      );
      uniqueKey = data && data.username;
    }
    if (req.header("X-Paid-User-Username")) {
      uniqueKey = req.header("X-Paid-User-Username");
    }

    if (uniqueKey) {
      const profileData = await ProfileModel.getUserProfileByEmail(uniqueKey);
      if (profileData && profileData.companyId) {
        uniqueKey = profileData.companyId;
      }
    }
  } catch (error) {
    return error;
  }
  //If couldn't find then return undefined as uniqueKey
  return uniqueKey;
};

const unAuthAPILimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 second
  max: 3, // Limit each IP to 100 requests per `window`
  // This is used for custom identifiers for clients, such as their IP address, username, or API Key
  keyGenerator: async (req) => {
    return await getUniqueKey(req);
  },
  handler: async (req, res, next, options) => {
    // const key = await options.keyGenerator(req);//OR
    const key = await getUniqueKey(req);
    const blockDuration = 2 * 60 * 1000; // 2 minutes in milliseconds
    const blockExpiration = Date.now() + blockDuration;

    blockUsers.set(key, blockExpiration);
    const message = {
      status: false,
      message: "Too many requests, please try again later.",
    };
    res.status(options.statusCode).send(message);
  },
  skip: (req) => {
    return req.url.includes("getPrimaryServiceKey") || req.method === "OPTIONS";
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

export default unAuthAPILimiter;
