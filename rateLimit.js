const express = require("express");
const cors = require("cors");
const { rateLimit } = require("express-rate-limit");

const app = express();

app.use(cors());
app.use(express.json());

// In-memory store for blocked IPs
const blockUsers = new Map();

const getUniqueKey = (req) => {
  return req?.headers?.["email"];
};

// Middleware to block requests from blocked IPs
const blockMiddleware = (req, res, next) => {
  const uniqueKey = getUniqueKey(req);

  console.log("blockUsers", blockUsers);

  if (blockUsers.has(uniqueKey)) {
    const blockExpiration = blockUsers.get(uniqueKey);
    const currentTime = Date.now();

    if (currentTime < blockExpiration) {
      return res.status(429).json({
        message: "Too many requests, please try again after 2 minutes",
        retryAfter: Math.ceil((blockExpiration - currentTime) / 1000),
      });
    } else {
      blockUsers.delete(uniqueKey);
    }
  }
  //Add extra value for next middleware
  req.uniqueKey = uniqueKey;
  next();
};

const otpStore = {};

//Otp rate limiter middleware
const otpRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 3 req / 1 minute
  max: 3, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  keyGenerator: (req) => {
    return req?.uniqueKey;
  },
  handler: (req, res, next, options) => {
    //Only call when user reach the limit of the rate limiter
    const key = req?.uniqueKey;
    const blockDuration = 2 * 60 * 1000; // 2 minutes in milliseconds
    const blockExpiration = Date.now() + blockDuration;

    blockUsers.set(key, blockExpiration);

    res.status(options.statusCode).json({
      message: "Too many requests, please try again after 2 minutes",
      retryAfter: Math.ceil(blockDuration / 1000),
    });
  },
  message: "Try again after some time.",
  standardHeaders: true, // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
  // store: ... , // Redis, Memcached, etc. See below.
});

//password reset rate limiter middleware
const passwordResetLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minutes
  max: 3, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  message: "Try again after some time.",
  standardHeaders: true, // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
  // store: ... , // Redis, Memcached, etc. See below.
});

//Generate otp for reset the password
app.post("/generate-otp", blockMiddleware, otpRateLimiter, (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is requried!" });
  }
  const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString(); //Generate otp

  otpStore[email] = generatedOtp;

  console.log(`OTP for ${email}: ${generatedOtp}`); // Log the OTP to the console

  res.status(200).json({ message: "Otp generated!", otp: generatedOtp, email });
});

//Reset password endpoint
app.post("/reset-password", passwordResetLimiter, (req, res, next) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res
      .status(400)
      .json({ message: "Email, Otp and Password is required!" });
  }

  if (otpStore[email] === otp) {
    console.log(`Password for ${email} has been reset to: ${newPassword}`);
    delete otpStore[email];
    res.status(200).json({ message: "Password reset successfully!" });
  } else {
    res.status(400).json({ message: "OTP is incorrect!" });
  }
});

app.listen(3000, () => {
  console.log("Port is on 3000");
});
