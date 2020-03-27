const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const connection = require("../db/db");
const noError = { isError: false, msgTitle: "", msgBody: "" };

router.get("/admin", (req, res) => {
  if (req.session.userId) {
    if (req.session.userType == 2) res.redirect("/dashboard");
    else res.status(403).send("Not allowed");
  } else res.render("login", noError);
});

router.get("/login", (req, res) => {
  if (req.session.userId)
    req.session.userType == 2
      ? res.redirect("/dashboard")
      : res.redirect("/stories");
  else
    res.render("login", {
      email: req.query.mail,
      isError: false,
      msgTitle: "",
      msgBody: ""
    });
});

router.get("/register", (req, res) => {
  if (req.session.userId)
    req.session.userType == 2
      ? res.redirect("/dashboard")
      : res.redirect("/stories");
  else res.render("register", noError);
});

router.get("/dashboard", (req, res) => {
  if (req.session.userId) {
    if (req.session.userType == 2) {
      res.status(200).render("dashboard", {
        uid: req.session.userId,
        name: req.session.userName
      });
    }
  } else res.status(401).redirect("/login");
});

router.get("/logout", (req, res) => {
  if (req.session.userId) {
    req.session.destroy(() => {
      res.status(200).redirect("/");
    });
  } else res.status(400).redirect("/login");
});

router.get("*", (req, res) => {
  res
    .status(404)
    .render("errorPage", { error: "Page Not Found", errorCode: 404 });
});

router.post("/register", (req, res) => {
  const { name, mail, pass, pass2 } = req.body;
  var e = [];

  if (!name || !mail || !pass || !pass2)
    res.render("register", {
      isError: true,
      msgTitle: "Invalid Input",
      msgBody: "Please fill-in all the details."
    });

  if (pass != pass2) e.push("Passwords do not match");
  if (pass.length < 6) e.push("Weak Password");

  connection.query("select * from users where email=?", [mail], (er, row) => {
    if (er)
      res
        .status(500)
        .render("errorPage", { error: "Server Error\n" + er, errorCode: 500 });
    if (row.length) res.redirect(`/login?mail=${mail}`);
    if (e.length) {
      var eList = "";
      e.forEach(error => {
        eList = eList + "\n" + error;
      });
      res.render("register", {
        isError: true,
        msgTitle: "error",
        msgBody: eList
      });
    } else {
      const passwordHash = bcrypt.hashSync(pass, 10);
      var query = "insert into users (name, email, password_hash) values ?";
      const val = [[name, mail, passwordHash]];
      connection.query(query, [val], err => {
        if (err)
          res.status(500).render("errorPage", { error: err, errorCode: 500 });
        else res.redirect(`/login?mail=${mail}`);
      });
    }
  });
});

router.post("/login", (req, res) => {
  const { mail, pass } = req.body;

  if (!mail || !pass)
    res.render("login", {
      isError: true,
      email: mail,
      msgTitle: "Invalid Input",
      msgBody: "Please fill-in all the details."
    });
  else {
    connection.query("select * from users where email=?", [mail], (e, row) => {
      if (e) throw e;
      if (row.length) {
        const user = row[0];
        if (bcrypt.compareSync(pass, user.password_hash)) {
          req.session.userId = user.id;
          req.session.userName = user.name;
          req.session.userType = user.user_type;
          req.session.userType == 2 ? res.redirect("/dashboard") : res.redirect("/stories");
        }
      } else
        res.render("login", {
          email: mail,
          isError: true,
          msgTitle: "Invalid Credentials",
          msgBody: "Incorrect E-Mail ID or Password"
        });
    });
  }
});

module.exports = router;
