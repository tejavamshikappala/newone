const express = require("express");
const app = express();
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const path = require("path");
const filePath = path.join(__dirname, "twitterClone.db");
let db = null;
const jwt = require("jsonwebtoken");
app.use(express.json());
const Initializer = async () => {
  try {
    db = await open({
      filename: filePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Started!");
    });
  } catch (e) {
    console.log("Error");
    process.exit(1);
  }
};
Initializer();

///API1
app.post("/register/", async (request, response) => {
  //console.log(request.body);
  const { username, password, name, gender } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  //console.log(password);
  const forQuery = `SELECT * FROM user WHERE username="${username}";`;
  const dbUser = await db.get(forQuery);
  if (dbUser === undefined) {
    if (password.length >= 6) {
      const InsertingQuery = `INSERT INTO user (username,password,name,gender)
        VALUES("${username}",
        "${hashedPassword}",
        "${name}",
        "${gender}");`;
      await db.run(InsertingQuery);
      response.status(200);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

///API2 login
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const ForQuery = `SELECT * FROM user WHERE username="${username}";`;
  const dbUser = await db.get(ForQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const passwordValid = await bcrypt.compare(password, dbUser.password);
    if (passwordValid) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "SECRETE_KEY");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

///Authenticating with jwt token
const Authenticating = (request, response, next) => {
  const AuthHeader = request.headers["authorization"];
  if (AuthHeader !== undefined) {
    JwtToken = AuthHeader.split(" ")[1];
  }
  if (JwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(JwtToken, "SECRETE_KEY", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

///API3

const converting = (every) => {
  return {
    username: every.username,
    tweet: every.tweet,
    dateTime: every.date_time,
  };
};
/// username,tweet,date_time
app.get("/user/tweets/feed/", Authenticating, async (request, response) => {
  const queryIng = `SELECT 
  username,
   tweet,
    date_time 
   FROM 
   user JOIN follower on user.user_id=follower.following_user_id
  JOIN tweet on tweet.user_id=follower.following_user_id  GROUP BY follower.following_user_id ORDER BY date_time DESC LIMIT 4;`;
  const feed = await db.all(queryIng);
  response.send(feed.map((every) => converting(every))); //
  // console.log(dbUser);
});

///API4
app.get("/user/following/", Authenticating, async (request, response) => {
  const queryIng1 = `
  SELECT name FROM user JOIN follower on user.user_id=follower.following_user_id `;
  //  GROUP BY user.user_id  WHERE user.user_id=follower.follower_user_id
  const dbUser = await db.all(queryIng1);
  response.send(dbUser);
});

///API 5
app.get("/user/followers/", Authenticating, async (request, response) => {
  const forQuery = `SELECT name FROM user JOIN follower on user.user_id=follower.follower_user_id`;
  const dbUser = await db.all(forQuery);
  response.send(dbUser);
});
module.exports = app;
