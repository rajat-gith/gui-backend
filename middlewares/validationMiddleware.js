const { z } = require("zod");

const credentialsSchema = z.object({
  dbType: z.enum(["mysql", "postgresql"]),
  host: z.string().nonempty("Host is required"),
  user: z.string().nonempty("User is required"),
  password: z.string().nonempty("Password is required"),
});

const validateCredentials = (req, res, next) => {
  try {
    credentialsSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, error: error.errors });
  }
};

module.exports = { validateCredentials };
