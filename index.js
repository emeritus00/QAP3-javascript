const express = require("express");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcrypt");

const app = express();
const PORT = 3000;
const SALT_ROUNDS = 10;

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "secretkey",
    resave: false,
    saveUninitialized: true,
  })
);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const USERS = [
  {
    id: 1,
    username: "AdminUser",
    email: "admin@example.com",
    password: bcrypt.hashSync("admin123", SALT_ROUNDS), //In a database, you'd just store the hashes, but for
    // our purposes we'll hash these existing users when the
    // app loads
    role: "admin",
  },
  {
    id: 2,
    username: "RegularUser",
    email: "user@example.com",
    password: bcrypt.hashSync("user123", SALT_ROUNDS),
    role: "user", // Regular user
  },
];

app.get("/", (request, response) => {
  const email = request.session.email;
  const errorMessage = request.query.errorMessage;
  response.render("index", { email, errorMessage });
});

// GET /login - Render login form
app.get("/login", (request, response) => {
  response.render("login");
});

// POST /login - Allows a user to login
app.post("/login", (request, response) => {
  const { email, password } = request.body;

  const user = USERS.find((user) => user.email === email);
  if (!user) {
    return response.render("login", { error: "Invalid email or password" });
  }

  bcrypt.compare(password, user.password, (err, result) => {
    if (result) {
      request.session.user = {
        id: user.id,
        username: user.username,
        role: user.role,
      };
      return response.redirect("/landing");
    }
    response.render("login", { error: "Invalid email or password" });
  });
});

// GET /signup - Render signup form
app.get("/signup", (request, response) => {
  response.render("signup");
});

// POST /signup - Allows a user to signup
app.post("/signup", async (request, response) => {
  const { email, username, password } = request.body;

  if (USERS.some((user) => user.email === email)) {
    return response.render("signup", { error: "Email already registered" });
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const newUser = {
    id: USERS.length + 1,
    username,
    email,
    password: hashedPassword,
    role: "user", // Default role
  };
  USERS.push(newUser);
  response.redirect("/login");
});

// GET / - Render index page or redirect to landing if logged in
app.get("/", (request, response) => {
  if (request.session.user) {
    return response.redirect("/landing");
  }
  response.render("index");
});

// GET /landing - Shows a welcome page for users, shows the names of all users if an admin
app.get("/landing", (request, response) => {
  if (!request.session.user) {
    return response.redirect("/login");
  }

  const { username, role } = request.session.user;

  if (role === "admin") {
    return response.render("landing", { username, role, users: USERS });
  }

  response.render("landing", { username, role });
});

// GET /logout - Logout the user and destroy the session
app.get("/logout", (request, response) => {
  request.session.destroy(() => {
    response.redirect("/");
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
