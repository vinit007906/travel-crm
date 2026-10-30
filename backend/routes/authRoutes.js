import express from "express";

const router = express.Router();

const demoUsers = [
  {
    name: "Admin",
    email: "admin@tripwise.demo",
    password: "demo123",
    role: "Admin"
  },
  {
    name: "Manager",
    email: "manager@tripwise.demo",
    password: "demo123",
    role: "Manager"
  },
  {
    name: "Agent",
    email: "agent@tripwise.demo",
    password: "demo123",
    role: "Agent"
  }
];

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  const foundUser = demoUsers.find(
    (user) =>
      user.email === String(email || "").trim().toLowerCase() &&
      user.password === password
  );

  if (!foundUser) {
    return res.status(401).json({
      message: "Invalid email or password."
    });
  }

  const user = {
    name: foundUser.name,
    email: foundUser.email,
    role: foundUser.role
  };

  return res.json({
    token: `demo-token-${foundUser.role.toLowerCase()}`,
    user
  });
});

export default router;
